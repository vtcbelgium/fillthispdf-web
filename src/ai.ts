import {
  LIMITS,
  parseRequest,
  parseSuggestions,
  readBounded,
  type MatchRequest,
} from "../shared/ai";
import type { FormField, Values } from "./pdf";

export function aiProviderId(raw: string | undefined): "cloudflare" | "openai-compatible" | null {
  if (!raw || raw === "cloudflare") return "cloudflare";
  if (raw === "openai-compatible") return raw;
  return null;
}
export function aiEndpoint(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/match"
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export async function matchFields(
  endpoint: string,
  input: MatchRequest,
  signal: AbortSignal,
  provider: "cloudflare" | "openai-compatible" = "cloudflare",
) {
  const payload = parseRequest(input);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AI-Provider": provider,
    },
    body: JSON.stringify(payload),
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(response.status === 429 ? "limited" : "unavailable");
  if (!response.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("unavailable");
  return parseSuggestions(
    JSON.parse(await readBounded(response.body, LIMITS.response)),
    payload.fields,
  );
}
// Field types/options/lengths are checked locally and never sent to the model.
export function suggestedValue(
  field: FormField,
  value: string,
): Values[string] | undefined {
  if (field.readOnly) return undefined;
  if (field.kind === "text")
    return value.length <= (field.maxLength ?? LIMITS.value)
      ? value
      : undefined;
  if (field.kind === "check")
    return value === "true" ? true : value === "false" ? false : undefined;
  if (field.kind === "radio")
    return field.options.includes(value) ? value : undefined;
  return field.editable || field.options.includes(value) ? [value] : undefined;
}
