import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import worker, { MODEL, type Env } from "../workers/fillthispdf-ai/src/index";
import {
  LIMITS,
  parseRequest,
  parseSuggestions,
  readBounded,
} from "../shared/ai";
import { aiEndpoint, matchFields, suggestedValue } from "../src/ai";
import { AiPanel, parsePolicyUrl } from "../src/AiPanel";
import type { FormField } from "../src/pdf";

const input = { fields: ["Name"], text: "My name is Jane" };
const result = { suggestions: [{ field: "Name", value: "Jane" }] };
function env(): Env {
  return {
    FREE_PLAN_CONFIRMED: "true",
    AI: { run: vi.fn().mockResolvedValue({ response: result }) },
    RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
  };
}
function request(body: unknown = input, headers: Record<string, string> = {}) {
  return new Request("https://worker.example/match", {
    method: "POST",
    headers: {
      Origin: "https://fillthispdf.othrys.be",
      "Content-Type": "application/json",
      "X-AI-Provider": "cloudflare",
      "CF-Connecting-IP": "192.0.2.1",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe("Worker boundary", () => {
  it("calls only the fixed real AI binding with bounded schema and minimal data", async () => {
    const bindings = env();
    const response = await worker.fetch(request(), bindings);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://fillthispdf.othrys.be",
    );
    expect(bindings.RATE_LIMITER!.limit).toHaveBeenCalledWith({
      key: "192.0.2.1",
    });
    expect(bindings.AI!.run).toHaveBeenCalledWith(
      MODEL,
      expect.objectContaining({
        max_tokens: 768,
        response_format: expect.objectContaining({ type: "json_schema" }),
        messages: [
          expect.objectContaining({ role: "system" }),
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    );
  });
  it.each([
    "https://evil.example",
    "null",
    "",
    "https://fillthispdf.othrys.be.evil.example",
  ])("denies origin %s", async (origin) => {
    const bindings = env();
    const response = await worker.fetch(
      request(input, { Origin: origin }),
      bindings,
    );
    expect(response.status).toBe(403);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(bindings.AI!.run).not.toHaveBeenCalled();
  });
  it("allows only configured loopback development origins and strict preflight", async () => {
    const bindings = {
      ...env(),
      DEV_ORIGINS: "http://localhost:5173,https://evil.example",
    };
    expect(
      (
        await worker.fetch(
          request(input, { Origin: "http://localhost:5173" }),
          bindings,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await worker.fetch(
          request(input, { Origin: "https://evil.example" }),
          bindings,
        )
      ).status,
    ).toBe(403);
    const preflight = (method: string) =>
      new Request("https://worker.example/match", {
        method: "OPTIONS",
        headers: {
          Origin: "https://vtcbelgium.github.io",
          "Access-Control-Request-Method": method,
          "Access-Control-Request-Headers": "content-type",
        },
      });
    expect((await worker.fetch(preflight("POST"), bindings)).status).toBe(204);
    expect((await worker.fetch(preflight("PUT"), bindings)).status).toBe(403);
  });
  it.each(["AI", "RATE_LIMITER", "FREE_PLAN_CONFIRMED"] as const)(
    "fails closed without %s",
    async (key) => {
      const bindings = env();
      delete bindings[key];
      expect((await worker.fetch(request(), bindings)).status).toBe(503);
    },
  );
  it("fails closed without a trusted visitor IP or when protection throws", async () => {
    const bindings = env();
    expect(
      (await worker.fetch(request(input, { "CF-Connecting-IP": "" }), bindings))
        .status,
    ).toBe(503);
    vi.mocked(bindings.RATE_LIMITER!.limit).mockRejectedValue(
      new Error("sensitive"),
    );
    expect((await worker.fetch(request(), bindings)).status).toBe(503);
    expect(bindings.AI!.run).not.toHaveBeenCalled();
  });
  it("limits abuse before inference", async () => {
    const bindings = env();
    vi.mocked(bindings.RATE_LIMITER!.limit).mockResolvedValue({
      success: false,
    });
    const response = await worker.fetch(request(), bindings);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(bindings.AI!.run).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { ...input, pdf: "bytes" },
    { ...input, values: { Name: "secret" } },
    { ...input, fields: [] },
    { ...input, fields: ["Name", "Name"] },
    { ...input, fields: Array(21).fill("x") },
    { ...input, fields: ["x".repeat(121)] },
    { ...input, text: "x".repeat(2001) },
    "not json",
    "%PDF-1.7",
    { ...input, text: "\u0000" },
  ])("rejects malformed or excessive input without inference", async (body) => {
    const bindings = env();
    expect((await worker.fetch(request(body), bindings)).status).toBe(400);
    expect(bindings.AI!.run).not.toHaveBeenCalled();
  });
  it("rejects raw uploads and excessive bytes, including chunked bodies", async () => {
    const bindings = env();
    expect(
      (
        await worker.fetch(
          request("%PDF", { "Content-Type": "application/pdf" }),
          bindings,
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await worker.fetch(
          request(input, { "Content-Length": "9000" }),
          bindings,
        )
      ).status,
    ).toBe(413);
    expect(
      (await worker.fetch(request(" ".repeat(9000)), bindings)).status,
    ).toBe(400);
    expect(bindings.AI!.run).not.toHaveBeenCalled();
  });
  it.each([
    { suggestions: [{ field: "Invented", value: "Jane" }] },
    { suggestions: [{ field: "Name", value: "x", extra: true }] },
    { suggestions: [{ field: "Name", value: "x".repeat(501) }] },
    { suggestions: [...result.suggestions, ...result.suggestions] },
    { suggestions: [], extra: true },
    "broken",
    "x".repeat(17000),
  ])("rejects the entire invalid model response", async (output) => {
    const bindings = env();
    vi.mocked(bindings.AI!.run).mockResolvedValue({ response: output });
    const response = await worker.fetch(request(), bindings);
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('{"error":"inference_unavailable"}');
  });
  it("accepts string JSON or empty suggestions without fabricating matches", async () => {
    const bindings = env();
    vi.mocked(bindings.AI!.run).mockResolvedValue({
      response: '{"suggestions":[]}',
    });
    expect(await (await worker.fetch(request(), bindings)).json()).toEqual({
      suggestions: [],
    });
  });
  it.each([
    Object.assign(new Error("private"), { status: 429 }),
    new Error("3036: private quota details"),
    new Error("3040: private"),
  ])(
    "maps budget and capacity errors to 429 without sensitive output/logs",
    async (error) => {
      const log = vi.spyOn(console, "log"),
        warn = vi.spyOn(console, "warn"),
        errorLog = vi.spyOn(console, "error");
      const bindings = env();
      vi.mocked(bindings.AI!.run).mockRejectedValue(error);
      const response = await worker.fetch(request(), bindings);
      expect(response.status).toBe(429);
      expect(await response.text()).not.toContain("private");
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(errorLog).not.toHaveBeenCalled();
    },
  );
  it("bounds inference time without retrying", async () => {
    vi.useFakeTimers();
    const bindings = env();
    vi.mocked(bindings.AI!.run).mockImplementation(() => new Promise(() => {}));
    const response = worker.fetch(request(), bindings);
    await vi.advanceTimersByTimeAsync(16000);
    expect((await response).status).toBe(503);
    expect(bindings.AI!.run).toHaveBeenCalledTimes(1);
  });
});
describe("browser boundary", () => {
  it.each([
    undefined,
    "",
    "javascript:alert(1)",
    "https://secret@worker.example/match",
    "https://worker.example/match?key=secret",
    "https://worker.example/match#secret",
    "http://worker.example/match",
  ])("disables unsafe endpoint %s", (raw) =>
    expect(aiEndpoint(raw)).toBe(null),
  );
  it("permits HTTPS and local mock endpoints", () => {
    expect(aiEndpoint("https://worker.example/match")).toBeTruthy();
    expect(aiEndpoint("http://127.0.0.1:8787/match")).toBeTruthy();
  });
  it("sends exactly selected labels and instructions, no cookies or referrer", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(result));
    vi.stubGlobal("fetch", fetch);
    expect(
      await matchFields(
        "https://worker.example/match",
        input,
        new AbortController().signal,
      ),
    ).toEqual(result.suggestions);
    expect(fetch).toHaveBeenCalledWith(
      "https://worker.example/match",
      expect.objectContaining({
        body: JSON.stringify(input),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
      }),
    );
  });
  it.each([400, 403, 429, 500])("fails safely on HTTP %s", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("private upstream error", { status })),
    );
    await expect(
      matchFields(
        "https://worker.example/match",
        input,
        new AbortController().signal,
      ),
    ).rejects.toThrow(status === 429 ? "limited" : "unavailable");
  });
  it("checks names and size again in browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ suggestions: [{ field: "Unknown", value: "x" }] }),
        ),
    );
    await expect(
      matchFields(
        "https://worker.example/match",
        input,
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    await expect(
      readBounded(
        new Response("x".repeat(LIMITS.response + 1)).body,
        LIMITS.response,
      ),
    ).rejects.toThrow();
    expect(() =>
      parseSuggestions({ suggestions: [{ field: "Name", value: false }] }, [
        "Name",
      ]),
    ).toThrow();
    expect(() =>
      parseRequest({
        ...input,
        fields: Array.from({ length: 20 }, (_, i) => "é".repeat(119) + i),
        text: "é".repeat(2000),
      }),
    ).toThrow();
  });
  it("checks local types, options, read-only status and text limits without guessing", () => {
    const field: FormField = {
      name: "Name",
      kind: "text",
      options: [],
      readOnly: false,
      multiline: false,
      maxLength: 4,
    };
    expect(suggestedValue(field, "Jane")).toBe("Jane");
    expect(suggestedValue(field, "longer")).toBeUndefined();
    expect(
      suggestedValue({ ...field, readOnly: true }, "Jane"),
    ).toBeUndefined();
    expect(suggestedValue({ ...field, kind: "check" }, "false")).toBe(false);
    expect(suggestedValue({ ...field, kind: "check" }, "yes")).toBeUndefined();
    expect(
      suggestedValue({ ...field, kind: "choice", options: ["BE"] }, "BE"),
    ).toEqual(["BE"]);
    expect(
      suggestedValue({ ...field, kind: "radio", options: ["BE"] }, "US"),
    ).toBeUndefined();
  });

  describe("parsePolicyUrl", () => {
    it.each([
      "https://developers.cloudflare.com/workers-ai/platform/data-usage/",
      "https://example.com/privacy",
      "https://openrouter.ai/privacy?lang=en#section",
      "http://localhost:5173/privacy",
      "http://127.0.0.1:8787/privacy",
    ])("accepts valid HTTPS and local dev policy URLs: %s", (url) => {
      expect(parsePolicyUrl(url)).toBe(url);
    });

    it.each([
      undefined,
      "",
      "not-a-url",
      "http://insecure.example.com/privacy",
      "https://user:pass@example.com/privacy",
      "javascript:alert(1)",
      "data:text/html,evil",
      "file:///etc/passwd",
    ])("rejects invalid or unsafe policy URL: %s", (url) => {
      expect(parsePolicyUrl(url)).toBe(null);
    });
  });

  describe("AiPanel provider policy URL enforcement", () => {
    const dummyFields: FormField[] = [
      {
        name: "Full name",
        kind: "text",
        options: [],
        readOnly: false,
        multiline: false,
      },
    ];

    it("requires valid provider policy URL before alternate provider consent can be given", () => {
      vi.stubEnv("VITE_AI_ENDPOINT", "https://worker.example/match");
      vi.stubEnv("VITE_AI_PROVIDER_ID", "openai-compatible");
      vi.stubEnv("VITE_AI_PROVIDER_NAME", "OpenRouter");
      vi.stubEnv("VITE_AI_PROVIDER_POLICY_URL", "");

      const html = renderToStaticMarkup(
        createElement(AiPanel, {
          fields: dummyFields,
          lang: "en",
          onApply: () => {},
        }),
      );

      // Warning alert must be rendered explaining that no valid policy URL is configured
      expect(html).toContain(
        "No valid provider privacy policy URL is configured for OpenRouter. Consent cannot be granted.",
      );
      // The consent checkbox must have disabled attribute
      expect(html).toMatch(
        /<input[^>]*type="checkbox"[^>]*disabled=""[^>]*\/>.*I consent/,
      );
    });

    it("enables consent and provides clickable policy link when alternate provider policy URL is valid", () => {
      vi.stubEnv("VITE_AI_ENDPOINT", "https://worker.example/match");
      vi.stubEnv("VITE_AI_PROVIDER_ID", "openai-compatible");
      vi.stubEnv("VITE_AI_PROVIDER_NAME", "OpenRouter");
      vi.stubEnv(
        "VITE_AI_PROVIDER_POLICY_URL",
        "https://openrouter.ai/privacy",
      );

      const html = renderToStaticMarkup(
        createElement(AiPanel, {
          fields: dummyFields,
          lang: "en",
          onApply: () => {},
        }),
      );

      // Policy link must be rendered with provider name and target="_blank"
      expect(html).toContain('href="https://openrouter.ai/privacy"');
      expect(html).toContain("OpenRouter privacy policy");
      expect(html).not.toContain(
        "No valid provider privacy policy URL is configured",
      );
    });

    it("provides official Cloudflare policy link by default without requiring VITE_AI_PROVIDER_POLICY_URL", () => {
      vi.stubEnv("VITE_AI_ENDPOINT", "https://worker.example/match");
      vi.stubEnv("VITE_AI_PROVIDER_ID", "cloudflare");

      const html = renderToStaticMarkup(
        createElement(AiPanel, {
          fields: dummyFields,
          lang: "en",
          onApply: () => {},
        }),
      );

      expect(html).toContain(
        'href="https://developers.cloudflare.com/workers-ai/platform/data-usage/"',
      );
      expect(html).toContain("Cloudflare data usage");
    });
  });
});
