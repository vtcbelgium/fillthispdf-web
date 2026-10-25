// Wire contract intentionally has no document, current values, URLs or metadata.
export const LIMITS = {
  bytes: 8192,
  fields: 20,
  name: 120,
  text: 2000,
  value: 500,
  response: 16384,
};
export type MatchRequest = { fields: string[]; text: string };
export type Suggestion = { field: string; value: string };
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, expected: string[]) =>
  Object.keys(v).length === expected.length &&
  expected.every((k) => Object.hasOwn(v, k));
const safeText = (v: unknown, max: number): v is string =>
  typeof v === "string" &&
  v.length <= max &&
  !Array.from(v).some((c) => c.charCodeAt(0) < 32 && !"\t\n\r".includes(c));
export function parseRequest(v: unknown): MatchRequest {
  if (
    !object(v) ||
    !keys(v, ["fields", "text"]) ||
    !safeText(v.text, LIMITS.text) ||
    !v.text.trim() ||
    !Array.isArray(v.fields) ||
    !v.fields.length ||
    v.fields.length > LIMITS.fields ||
    v.fields.some((n) => !safeText(n, LIMITS.name) || !n.trim()) ||
    new Set(v.fields).size !== v.fields.length
  )
    throw new Error("invalid_request");
  if (new TextEncoder().encode(JSON.stringify(v)).length > LIMITS.bytes)
    throw new Error("invalid_request");
  return { fields: v.fields as string[], text: v.text };
}
export function parseSuggestions(v: unknown, fields: string[]): Suggestion[] {
  if (
    !object(v) ||
    !keys(v, ["suggestions"]) ||
    !Array.isArray(v.suggestions) ||
    v.suggestions.length > LIMITS.fields
  )
    throw new Error("invalid_response");
  const seen = new Set<string>();
  return v.suggestions.map((s) => {
    if (
      !object(s) ||
      !keys(s, ["field", "value"]) ||
      typeof s.field !== "string" ||
      !fields.includes(s.field) ||
      seen.has(s.field) ||
      !safeText(s.value, LIMITS.value)
    )
      throw new Error("invalid_response");
    seen.add(s.field);
    return { field: s.field, value: s.value };
  });
}
export async function readBounded(
  body: ReadableStream<Uint8Array> | null,
  max: number,
): Promise<string> {
  if (!body) throw new Error("missing_body");
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new Error("body_too_large");
      chunks.push(value);
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
export async function deadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}
