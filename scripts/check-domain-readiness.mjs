#!/usr/bin/env node
/* global fetch, AbortSignal */
/**
 * Read-only custom-domain gate; deliberately never changes DNS, GitHub Pages or SEO.
 * Run: node scripts/check-domain-readiness.mjs
 * Exit: 0 = externally ready, 2 = HOLD, 1 = unexpected checker error.
 */
import { resolveCname, resolve4, resolve6 } from "node:dns/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { URL } from "node:url";
import process from "node:process";
const execFileAsync = promisify(execFile);
import { CUSTOM_DOMAIN_URL, GITHUB_PAGES_URL } from "./site-origin.mjs";

const host = new URL(CUSTOM_DOMAIN_URL).hostname;
const results = [];
async function check(name, action) {
  try {
    const { ok, detail } = await action();
    results.push({ name, status: ok ? "PASS" : "HOLD", detail });
  } catch (error) {
    results.push({ name, status: "HOLD", detail: String(error?.code || error?.message || "unavailable") });
  }
}
async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "FillThisPDF-domain-readiness/1.0", "Accept": "text/html,application/xml,application/json" },
    signal: AbortSignal.timeout(10000),
    redirect: "follow",
  });
  return { status: response.status, url: response.url, text: await response.text() };
}
await check("DNS points to GitHub Pages", async () => {
  let cname = [], ipv4 = [], ipv6 = [];
  try { cname = await resolveCname(host); } catch { /* may be unavailable under DNS proxy */ }
  try { ipv4 = await resolve4(host); } catch { /* no IPv4 */ }
  try { ipv6 = await resolve6(host); } catch { /* no IPv6 */ }
  const exact = cname.some((item) => item.replace(/\.$/, "").toLowerCase() === "vtcbelgium.github.io");
  return {
    ok: exact,
    detail: exact ? "CNAME -> vtcbelgium.github.io" :
      ipv4.length || ipv6.length ?
        "DNS resolves, but GitHub Pages CNAME could not be confirmed (check Cloudflare DNS-only setting)" :
        "No public CNAME/A/AAAA record for fillthispdf.othrys.be",
  };
});
await check("GitHub Pages recognizes the custom domain", async () => {
  // GitHub often hides Pages settings from anonymous API calls. Use authenticated gh read-only.
  const { stdout } = await execFileAsync("gh", [
    "api", "repos/vtcbelgium/fillthispdf-web/pages",
  ], { timeout: 10000, maxBuffer: 32768 });
  const pages = JSON.parse(stdout);
  return {
    ok: pages.cname?.toLowerCase() === host && pages.https_enforced === true,
    detail: `configured=${pages.cname || "none"}, HTTPS enforced=${pages.https_enforced === true}`,
  };
});
await check("HTTPS homepage and canonical URL", async () => {
  const response = await fetchText(CUSTOM_DOMAIN_URL);
  const canonical = response.text.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  return {
    ok: response.status === 200 && new URL(response.url).origin === new URL(CUSTOM_DOMAIN_URL).origin && canonical === CUSTOM_DOMAIN_URL,
    detail: `HTTP ${response.status}, final=${response.url}, canonical=${canonical || "not found"}`,
  };
});
await check("HTTPS sitemap points to the new domain", async () => {
  const response = await fetchText(new URL("sitemap.xml", CUSTOM_DOMAIN_URL));
  const expected = `<loc>${CUSTOM_DOMAIN_URL}</loc>`;
  return {
    ok: response.status === 200 && response.text.includes(expected) &&
      !response.text.includes(`<loc>${GITHUB_PAGES_URL}`),
    detail: `HTTP ${response.status}; new-domain canonical=${response.text.includes(expected)}`,
  };
});
for (const result of results) {
  process.stdout.write(`[${result.status}] ${result.name}: ${result.detail}\n`);
}
const ok = results.every((entry) => entry.status === "PASS");
process.stdout.write(ok
  ? "\nREADY — safe to submit https://fillthispdf.othrys.be/sitemap.xml to the existing othrys.be Search Console property.\n"
  : "\nHOLD — retain the existing GitHub Pages URL and its current SEO metadata. No configuration changes have been made.\n");
if (!ok) process.exitCode = 2;
