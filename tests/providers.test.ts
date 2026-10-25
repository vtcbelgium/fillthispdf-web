import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProvider,
  providerId,
  MODEL,
  type ProviderEnv,
} from "../workers/fillthispdf-ai/src/providers";
import worker from "../workers/fillthispdf-ai/src/index";

const input = { fields: ["Full name"], text: "My name is Ada" };
const expected = [{ field: "Full name", value: "Ada" }];
const output = { suggestions: expected };
const compatible = (): ProviderEnv => ({
  FREE_PLAN_CONFIRMED: "true",
  AI_PROVIDER: "openai-compatible",
  OPENAI_FREE_TIER_CONFIRMED: "true",
  OPENAI_ENDPOINT: "https://openrouter.ai/api/v1/chat/completions",
  OPENAI_MODEL: "example/free-model",
  OPENAI_API_KEY: "test-secret",
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("provider portability", () => {
  it("uses Cloudflare by default with the old wire contract", async () => {
    const run = vi.fn().mockResolvedValue({ response: output });
    const p = createProvider({ FREE_PLAN_CONFIRMED: "true", AI: {run} });
    expect(p?.id).toBe("cloudflare");
    expect(providerId({})).toBe("cloudflare");
    expect(await p?.suggest(input)).toEqual(expected);
    expect(run).toHaveBeenCalledWith(MODEL, expect.objectContaining({
      messages: expect.any(Array),
      response_format: expect.objectContaining({type:"json_schema"}),
    }));
  });

  it("replaces the backend with OpenAI-compatible without changing the payload or output", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(Response.json({
      choices: [{ message: { content: JSON.stringify(output) } }],
    }));
    vi.stubGlobal("fetch", fakeFetch);
    const p = createProvider(compatible());
    expect(p?.id).toBe("openai-compatible");
    expect(await p?.suggest(input)).toEqual(expected);
    const [url, options] = fakeFetch.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const sent = JSON.parse(options.body);
    expect(sent.model).toBe("example/free-model");
    expect(sent.messages[1].content).toBe(JSON.stringify(input));
    expect(JSON.stringify(sent)).not.toContain("test-secret");
    expect(options.headers.Authorization).toBe("Bearer test-secret");
    expect(options.redirect).toBe("error");
  });

  it("refuses missing cost attestation, secrets, a non-HTTPS address and unknown providers", () => {
    expect(createProvider({...compatible(), OPENAI_FREE_TIER_CONFIRMED: "false"})).toBeNull();
    expect(createProvider({...compatible(), OPENAI_API_KEY: ""})).toBeNull();
    expect(createProvider({...compatible(), OPENAI_ENDPOINT: "http://localhost:11434/v1/chat/completions"})).toBeNull();
    expect(createProvider({...compatible(), OPENAI_ENDPOINT: "https://127.0.0.1/v1/chat/completions"})).toBeNull();
    expect(createProvider({...compatible(), OPENAI_ENDPOINT: "https://openrouter.ai@localhost/v1/chat/completions"})).toBeNull();
    expect(createProvider({...compatible(), AI_PROVIDER: "mystery"})).toBeNull();
    expect(createProvider({...compatible(), FREE_PLAN_CONFIRMED: "false"})).toBeNull();
  });

  it("rejects hallucinated fields and malformed upstream data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      choices: [{message: {content: JSON.stringify({suggestions:[{field:"Unknown",value:"foo"}]})}}],
    })));
    await expect(createProvider(compatible())!.suggest(input)).rejects.toThrow("invalid_response");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({choices: []})));
    await expect(createProvider(compatible())!.suggest(input)).rejects.toThrow("invalid_response");
  });

  it("does not expose keys/errors and never retries the other provider on upstream 429", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(new Response("private", {status:429}));
    vi.stubGlobal("fetch", fakeFetch);
    const p = createProvider(compatible())!;
    await expect(p.suggest(input)).rejects.toMatchObject({status:429});
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it("the worker rejects stale consent if the operator has switched provider", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(Response.json({
      choices:[{message:{content:JSON.stringify(output)}}],
    }));
    vi.stubGlobal("fetch", fakeFetch);
    const env = {
      ...compatible(),
      RATE_LIMITER: { limit: vi.fn().mockResolvedValue({success:true}) },
    };
    const request = (provider: string) => new Request("https://worker.test/match", {
      method: "POST",
      headers: {
        Origin: "https://vtcbelgium.github.io",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.0.2.4",
        "X-AI-Provider": provider,
      },
      body: JSON.stringify(input),
    });
    expect((await worker.fetch(request("cloudflare"), env)).status).toBe(409);
    expect(fakeFetch).not.toHaveBeenCalled();
    const ok = await worker.fetch(request("openai-compatible"), env);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual(output);
  });
});
