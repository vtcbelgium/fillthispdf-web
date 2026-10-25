# Optional field matching — not deployed

The frontend remains a local PDF editor without this Worker. Inference uses the actual Workers AI `AI.run` binding with the fixed model `@cf/meta/llama-3.1-8b-instruct`. There is no keyword matcher, fallback model, paid provider, storage or AI Gateway.

## Current blocker

On 2026-10-25, `npx wrangler whoami` returned **“You are not authenticated. Please run `wrangler login`.”** No authenticated account, Workers Free plan, model terms acceptance, rate-limiter availability or live inference could be verified. Unit tests use a mocked AI binding; browser tests intercept the endpoint. A successful dry-run proves packaging/configuration only. Nothing has been deployed, and no production endpoint is configured.

## Validate locally without inference

From the repository root (use `npm.cmd` / `npx.cmd` in restricted Windows PowerShell):

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run worker:check
npm run test:e2e
npm run test:e2e:ai
npm run build
npm audit
```

`worker:check` is `wrangler deploy --dry-run`, not a deployment. The AI browser suite builds with a mock public endpoint and serves the production bundle at `/fillthispdf-web/`; the ordinary suite tests the root with AI disabled. Neither makes real inference calls. Do not run both builds concurrently since they share `dist/`. The mock URL is test-only; never publish that build. A plain build with `VITE_AI_ENDPOINT` unset disables AI.

Wrangler is locked in the root dev dependencies. The `undici` override selects the patched 7.x line (>=7.30.1) for its development runtime; `npm audit` verifies the lockfile. No new frontend runtime dependencies.

## Future setup, only after owner review and authenticated access

These are instructions, not actions performed by this PR. Do not use Wrangler's temporary-account deployment fallback.

1. Run `npx wrangler login`, then `npx wrangler whoami` privately. Verify the target account is on **Workers Free**, with no paid upgrade or AI Gateway credits. Accept applicable Llama model terms if required. Verify the rate-limit binding is available without billing changes; if unavailable, keep AI disabled. Do not upgrade.
2. Review `wrangler.jsonc`: `workers_dev: true`, no routes/custom domains/storage. Rate-limit namespace `1004` must be unique within the account (change it if already used). The binding allows approximately **3 requests per visitor IP per 60 seconds per Cloudflare location**.
3. Only after confirming the Free plan, change `vars.FREE_PLAN_CONFIRMED` from `"false"` to `"true"` in the reviewed deployment configuration. This is an operator attestation/kill switch, **not automatic billing-plan detection**. It defaults off. Keep it off if the plan cannot be verified. Disable it before any future billing-plan change.
4. After separate deployment approval, deploy with `npx wrangler deploy --config workers/fillthispdf-ai/wrangler.jsonc`. No DNS changes are needed; use the assigned `workers.dev` hostname. Test using synthetic non-sensitive data and an allowed Origin. Do not use prompt/body logs or `wrangler tail` on real documents.
5. Only after a real endpoint has been verified, set public build variable `VITE_AI_ENDPOINT=https://<assigned-worker-host>.workers.dev/match` and rebuild the frontend. It must be an HTTPS URL with no credentials, query or fragment. It contains no keys. Leave it empty until then. Frontend hosting/workflows are not wired to any live endpoint by this PR.

The only optional Worker development variable is `DEV_ORIGINS`, a comma-separated exact list such as `http://localhost:5173,http://127.0.0.1:5173`. Only HTTP loopback origins with explicit ports can be added; it cannot expand the production allowlist to arbitrary sites. Put local variables in ignored `.dev.vars`, never credentials in `VITE_*`. Wrangler's AI binding may still call remote inference during local development: use these mocks for offline/free validation instead of `wrangler dev` with real content.

## Budget and failure protection

Cloudflare documents a **10,000-neuron daily allocation**, resetting at 00:00 UTC. Workers Free blocks additional inference at exhaustion; Workers Paid bills overage. **Free plan enforcement by Cloudflare is the hard cost ceiling.** The approximate, per-location rate-limit binding is abuse mitigation, not a global budget or authorization. CORS can be spoofed by non-browser clients and other pages on the allowed GitHub origin can call the Worker. An attacker may exhaust the free allocation; manual filling still works. No distributed counter/storage is introduced.

Missing AI/rate-limit bindings, missing trusted `CF-Connecting-IP`, missing/false plan attestation, or limiter errors/timeouts fail closed before inference. Limiter denial and provider quota/capacity errors (HTTP 429 / internal 3036, 3040) return generic 429 responses. Other provider errors, invalid results and inference timeout return generic 503. Platform-level request quota errors may be served by Cloudflare before this handler and cannot be normalized; the frontend treats them as unavailable. There are no retries or paid fallbacks. The 15-second inference deadline bounds the Worker response wait; it does not promise to cancel computation already accepted by the provider.

## Contract and privacy

`POST /match`, `Content-Type: application/json` (optional UTF-8 charset), with exactly:

```json
{ "fields": ["Full name"], "text": "My name is Jane" }
```

Only explicit selected, optionally edited labels and newly typed instructions are transmitted. Field names, values and document content are untrusted. All fields start unselected; consent starts unchecked, is consumed for each call and resets whenever the payload changes. A visible exact JSON preview precedes consent. No PDF bytes/images, file name, extracted text, current values, field options or document metadata are serialized. No cookies/referrer; redirects are rejected. Edited labels map back to original field identities locally.

Limits: 8,192 UTF-8 request bytes (stream checked regardless of Content-Length); 1–20 unique labels of 1–120 characters; nonblank instructions up to 2,000 characters; 768 output tokens; 16,384 response bytes; at most 20 suggestions with string values up to 500 characters. Deadlines: rate limiter 2 seconds, body 3 seconds, inference 15 seconds, browser request 22 seconds. Unknown properties, duplicate or unknown labels, invalid types and oversized data/results fail closed. JSON mode is requested but every result is independently validated on both sides. Local field constraints reject incompatible values without partial application. Choice/radio values must match an existing option (editable choices permit custom text); multi-select supports one proposed option per field. Checkbox proposals require literal `true`/`false`. Existing read-only and PDF signature fields cannot be suggested. Text styling/positions are never inferred.

Prompt text cannot grant tools, broaden the output schema or bypass review. Prompt-injection resistance is not a guarantee of factual accuracy: every individual suggestion requires unchecked-by-default approval and an explicit Apply action. Applying approved values creates one undo step; export remains browser-local. Closing the document aborts the browser request and discards AI state. Refreshing clears in-memory state. No persistent document storage, app logs, prompt/output telemetry or Workers observability are enabled. IPs are used only as limiter keys.

The user-facing EN/NL/FR disclosure says processing is remote. Cloudflare's current policy describes no training on customer content, retention limited to processing/delivery for standard inference, operational metadata, and safety/security/legal exceptions. This is **not** an absolute zero-retention or device-only claim for AI. Do not enable AI Gateway caching/logging or add document content to exception telemetry.

Reviewed official references (2026-10-25): [JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/), [pricing and Free ceiling](https://developers.cloudflare.com/workers-ai/platform/pricing/), [rate-limit binding and approximation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/), [quota/error codes](https://developers.cloudflare.com/workers-ai/platform/errors/).

## Swapping AI providers (v0.2, not yet deployed)

The browser and PDF engine speak one stable wire contract: `POST /match` receives
`{ fields: string[], text: string }`, and responds with
`{ suggestions: {field:string,value:string}[] }`. The Worker invokes a
`FieldProvider` from `src/providers.ts`. Every adapter shares the same
schema validation, request limits, rate limiting, origin controls, response
validation and generic errors. **There is no automatic fallback or retry.**

- **Cloudflare (default):** `AI_PROVIDER=cloudflare` with an `AI` binding to
  `@cf/meta/llama-3.1-8b-instruct`. `FREE_PLAN_CONFIRMED=true` is a manual
  operator statement only; actual financial limits depend on the Cloudflare
  account plan. It defaults to false.
- **OpenAI-compatible (optional, OFF by default):** `AI_PROVIDER=openai-compatible`,
  `OPENAI_ENDPOINT` an owner-pinned public HTTPS chat-completions URL (for
  example an approved free OpenRouter endpoint),
  `OPENAI_MODEL` an owner-approved exact model ID, and
  `OPENAI_API_KEY` **a Wrangler Worker secret** rather than a public variable.
  Also require both `FREE_PLAN_CONFIRMED=true` and
  `OPENAI_FREE_TIER_CONFIRMED=true`; never attest until cost and privacy
  terms are independently checked. These attestations are NOT hard billing
  limits at an upstream provider. Verify provider-side hard spending caps
  separately. No local Ollama listener is exposed publicly.

The site build must set `VITE_AI_ENDPOINT` to the deployed Worker `/match`
URL, `VITE_AI_PROVIDER_ID` to exactly `cloudflare` or
`openai-compatible`, and `VITE_AI_PROVIDER_NAME` to a truthful display
name (e.g. `Cloudflare Workers AI` or `OpenRouter — approved free model`).
These `VITE_` variables are public metadata: **never put an API key there**.
Rebuild and redeploy the site when changing providers. The backend rejects a
mismatched `X-AI-Provider` with HTTP 409, preventing a silent provider switch
under existing user consent. The UI shows the selected name before consent.

To add a third backend, implement `FieldProvider` in `src/providers.ts`
and add explicit provider selection, cost/privacy gating and tests; the
frontend payload and PDF export remain unchanged.

The current unconfigured live v0.1 stays manual-only. Worker tests use
in-memory bindings and mocks: they do not prove live Cloudflare inference.
