import { useEffect, useRef, useState } from "react";
import { LIMITS, parseRequest } from "../shared/ai";
import { aiEndpoint, aiProviderId, matchFields, suggestedValue } from "./ai";
import { aiMessages } from "./ai-i18n";
import type { Language } from "./i18n";
import type { FormField, Values } from "./pdf";

type Proposal = { name: string; value: Values[string]; approved: boolean };
export function AiPanel({
  fields,
  lang,
  onApply,
}: {
  fields: FormField[];
  lang: Language;
  onApply: (values: Values) => void;
}) {
  const t = aiMessages[lang];
  const providerId = aiProviderId(import.meta.env.VITE_AI_PROVIDER_ID);
  const declaredName = (import.meta.env.VITE_AI_PROVIDER_NAME as string | undefined)?.trim();
  const providerName = declaredName || (providerId === "cloudflare" ? "Cloudflare Workers AI" : "");
  // A changed provider cannot be offered without explicitly naming it to the visitor.
  const endpoint =
    providerId && providerName ? aiEndpoint(import.meta.env.VITE_AI_ENDPOINT) : null;
  const [entries, setEntries] = useState(() =>
    fields
      .filter((f) => !f.readOnly)
      .map((f) => ({
        name: f.name,
        label: f.name.slice(0, LIMITS.name),
        selected: false,
      })),
  );
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [status, setStatus] = useState<
    "failed" | "limited" | "empty" | "applied" | null
  >(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const payload = {
    fields: entries.filter((e) => e.selected).map((e) => e.label),
    text,
  };
  let valid = true;
  try {
    parseRequest(payload);
  } catch {
    valid = false;
  }
  function invalidate() {
    setConsent(false);
    setProposals([]);
    setStatus(null);
  }
  async function send() {
    if (!endpoint || !providerId || !valid || !consent || controller.current) return;
    const active = new AbortController();
    controller.current = active;
    setConsent(false);
    setPending(true);
    setStatus(null);
    setProposals([]);
    const timeout = setTimeout(() => active.abort(), 22000);
    try {
      const suggestions = await matchFields(endpoint, payload, active.signal, providerId);
      if (active.signal.aborted) return;
      const next = suggestions.map((s) => {
        const entry = entries.find((e) => e.selected && e.label === s.field);
        const field = fields.find((f) => f.name === entry?.name);
        const value = field && suggestedValue(field, s.value);
        if (!field || value === undefined) throw new Error("invalid_response");
        return { name: field.name, value, approved: false };
      });
      setProposals(next);
      if (!next.length) setStatus("empty");
    } catch (e) {
      setStatus(
        e instanceof Error && e.message === "limited" ? "limited" : "failed",
      );
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      setPending(false);
    }
  }
  return (
    <details className="ai-panel">
      <summary>
        {t.title}
        {!endpoint && <span>{t.disabled}</span>}
      </summary>
      {!endpoint ? (
        <>
          <p>{t.off}</p>
          <button disabled>{t.disabled}</button>
        </>
      ) : !entries.length ? (
        <p>{t.noFields}</p>
      ) : (
        <>
          <p>{t.privacy.replaceAll("Cloudflare Workers AI", providerName)}</p>
          {providerId === "cloudflare" ? (
            <p>
              {t.terms}{" "}
              <a
                href="https://developers.cloudflare.com/workers-ai/platform/data-usage/"
                target="_blank"
                rel="noreferrer"
              >
                {t.policy}
              </a>
            </p>
          ) : (
            <p>{
              lang === "nl"
                ? `${providerName} verwerkt deze geselecteerde gegevens op afstand. Controleer het privacybeleid van deze provider voordat je toestemming geeft.`
                : lang === "fr"
                  ? `${providerName} traite ces données sélectionnées à distance. Consultez la politique de confidentialité du fournisseur avant de consentir.`
                  : `${providerName} processes this selected data remotely. Review the provider privacy policy before consenting.`
            }</p>
          )}
          <fieldset disabled={pending}>
            <legend>{t.fields}</legend>
            <div className="ai-fields">
              {entries.map((entry, index) => (
                <div className="ai-field" key={entry.name}>
                  <label>
                    <input
                      type="checkbox"
                      checked={entry.selected}
                      onChange={(e) => {
                        invalidate();
                        setEntries((old) =>
                          old.map((v, i) =>
                            i === index
                              ? { ...v, selected: e.target.checked }
                              : v,
                          ),
                        );
                      }}
                    />
                    {entry.name}
                  </label>
                  <input
                    aria-label={`${t.label} ${entry.name}`}
                    value={entry.label}
                    maxLength={LIMITS.name}
                    onChange={(e) => {
                      invalidate();
                      setEntries((old) =>
                        old.map((v, i) =>
                          i === index ? { ...v, label: e.target.value } : v,
                        ),
                      );
                    }}
                  />
                </div>
              ))}
            </div>
            <label className="field-label">
              {t.text}
              <textarea
                value={text}
                maxLength={LIMITS.text}
                rows={4}
                onChange={(e) => {
                  invalidate();
                  setText(e.target.value);
                }}
              />
            </label>
            <p>{t.payload}</p>
            <pre className="ai-payload">{JSON.stringify(payload, null, 2)}</pre>
            {!valid && <p>{t.invalid}</p>}
            <label className="ai-consent">
              <input
                type="checkbox"
                checked={consent}
                disabled={!valid}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {t.consent.replaceAll("Cloudflare Workers AI", providerName)}
            </label>
            <button disabled={!consent || !valid} onClick={() => void send()}>
              {t.send}
            </button>
          </fieldset>
          {pending && <p role="status">{t.pending}</p>}
          {status && (
            <p
              role={
                status === "failed" || status === "limited" ? "alert" : "status"
              }
            >
              {t[status]}
            </p>
          )}
          {proposals.length > 0 && (
            <div className="ai-review">
              <p>{t.review}</p>
              {proposals.map((p, i) => (
                <label className="ai-consent" key={p.name}>
                  <input
                    type="checkbox"
                    checked={p.approved}
                    onChange={(e) =>
                      setProposals((old) =>
                        old.map((v, index) =>
                          i === index
                            ? { ...v, approved: e.target.checked }
                            : v,
                        ),
                      )
                    }
                  />
                  {t.approve}: <strong>{p.name}</strong>
                  <span>{String(p.value)}</span>
                </label>
              ))}
              <button
                disabled={!proposals.some((p) => p.approved)}
                onClick={() => {
                  onApply(
                    Object.fromEntries(
                      proposals
                        .filter((p) => p.approved)
                        .map((p) => [p.name, p.value]),
                    ),
                  );
                  setProposals([]);
                  setStatus("applied");
                  setConsent(false);
                }}
              >
                {t.apply}
              </button>
            </div>
          )}
        </>
      )}
    </details>
  );
}
