#!/usr/bin/env node
/**
 * Fail closed if a static GitHub Pages build has mixed-domain SEO metadata.
 * Intended to run immediately after npm run build, before Pages artifact upload.
 * No network, credentials, external services, or source edits.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { siteOrigin, GITHUB_PAGES_URL, CUSTOM_DOMAIN_URL } from "./site-origin.mjs";

const origin = siteOrigin();
const inactive = origin === CUSTOM_DOMAIN_URL ? GITHUB_PAGES_URL : CUSTOM_DOMAIN_URL;
function requireMatch(ok, message) {
  if (!ok) throw new Error("SEO origin release gate failed: " + message);
}
function read(relative) { return readFileSync(resolve("dist", relative), "utf8"); }

for (const locale of ["", "nl/", "fr/"]) {
  const page = read(locale + "index.html");
  const url = origin + locale;
  requireMatch(page.includes('<link rel="canonical" href="' + url + '"/>'), url + " canonical");
  requireMatch(page.includes('<meta name="robots" content="index,follow'), url + " indexable");
  requireMatch(page.includes('<meta property="og:url" content="' + url + '"/>'), url + " Open Graph");
  requireMatch(!page.includes(inactive), url + " leaked inactive domain");
}
const sitemap = read("sitemap.xml");
requireMatch((sitemap.match(/<url>/g) || []).length === 3, "expected 3 sitemap entries");
requireMatch(!sitemap.includes(inactive), "sitemap contains inactive origin");
for (const locale of ["", "nl/", "fr/"]) {
  requireMatch(sitemap.includes("<loc>" + origin + locale + "</loc>"), "missing sitemap URL for " + locale);
}
const robots = read("robots.txt");
requireMatch(robots.includes("Sitemap: " + origin + "sitemap.xml"), "wrong robots sitemap");
requireMatch(!robots.includes("Disallow: /"), "robots blocks crawling");
requireMatch(!robots.includes(inactive), "robots contains inactive origin");
process.stdout.write("PASS: 3 language canonicals, Open Graph, robots and sitemap use only " + origin + "\n");
