import {
  deadline,
  LIMITS,
  parseRequest,
  readBounded,
} from "../../../shared/ai";
import { createProvider, providerId, type ProviderEnv } from "./providers";
export { MODEL } from "./providers";

export interface Env extends ProviderEnv {
  RATE_LIMITER?: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
  DEV_ORIGINS?: string;
}
const origins = [
  "https://vtcbelgium.github.io",
  "https://fillthispdf.othrys.be",
];
function allowed(origin: string, env: Env) {
  if (origins.includes(origin)) return true;
  return (
    (env.DEV_ORIGINS || "").split(",").includes(origin) &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  );
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
    };
    const reply = (status: number, code: string) =>
      new Response(JSON.stringify({ error: code }), { status, headers });
    if (!allowed(origin, env)) return reply(403, "origin_denied");
    headers["Access-Control-Allow-Origin"] = origin;
    if (new URL(request.url).pathname !== "/match")
      return reply(404, "not_found");
    if (request.method === "OPTIONS") {
      if (
        request.headers.get("Access-Control-Request-Method") !== "POST" ||
        (request.headers.get("Access-Control-Request-Headers") || "")
          .split(",")
          .some((h) => h.trim() && !["content-type", "x-ai-provider"].includes(h.trim().toLowerCase()))
      )
        return reply(403, "preflight_denied");
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, X-AI-Provider",
        },
      });
    }
    if (request.method !== "POST") return reply(405, "method_denied");
    if (
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
        request.headers.get("Content-Type") || "",
      ) ||
      request.headers.has("Content-Encoding")
    )
      return reply(415, "json_required");
    if (Number(request.headers.get("Content-Length")) > LIMITS.bytes)
      return reply(413, "request_too_large");
    const ip = request.headers.get("CF-Connecting-IP");
    const provider = createProvider(env);
    if (!provider || !env.RATE_LIMITER || !ip) return reply(503, "unavailable");
    // Provider changes invalidate browser-side consent and cannot silently reroute data.
    if (request.headers.get("X-AI-Provider") !== providerId(env))
      return reply(409, "provider_mismatch");
    try {
      const limit = await deadline(env.RATE_LIMITER.limit({ key: ip }), 2000);
      if (limit.success !== true) {
        headers["Retry-After"] = "60";
        return reply(429, "rate_limited");
      }
    } catch {
      return reply(503, "protection_unavailable");
    }
    let input;
    try {
      input = parseRequest(
        JSON.parse(
          await deadline(readBounded(request.body, LIMITS.bytes), 3000),
        ),
      );
    } catch {
      return reply(400, "invalid_request");
    }
    try {
      const suggestions = await provider.suggest(input);
      return new Response(JSON.stringify({ suggestions }), { headers });
    } catch (error) {
      // Never return/log upstream messages, prompts, field names, IPs or output.
      const status =
        error && typeof error === "object" && "status" in error
          ? error.status
          : undefined;
      // Binding errors may expose the documented internal code only in message.
      const quota =
        error instanceof Error && /\b(3036|3040)\b/.test(error.message);
      if (status === 429 || quota) {
        headers["Retry-After"] = "60";
        return reply(429, "rate_limited");
      }
      return reply(503, "inference_unavailable");
    }
  },
};
