import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const root = "https://vtcbelgium.github.io/fillthispdf-web/";
const pages = [
  { locale: "en", path: "index.html", url: root, phrase: "Fill PDF Online Free" },
  { locale: "nl", path: "nl/index.html", url: root+"nl/", phrase: "PDF invullen online gratis" },
  { locale: "fr", path: "fr/index.html", url: root+"fr/", phrase: "Remplir un PDF en ligne gratuitement" },
];
describe("crawlable free PDF site", () => {
  for (const { locale, path, url, phrase } of pages) {
    it(`${locale} has descriptive metadata, visible instructions and valid locale/canonical links`, () => {
      const html = readFileSync(path, "utf8");
      expect(html).toContain(`<html lang="${locale}">`);
      expect(html).toContain(phrase);
      expect(html).toContain(`<link rel="canonical" href="${url}"/>`);
      expect(html).toContain('<meta name="description" content="');
      expect(html).toContain('<meta name="robots" content="index,follow');
      expect(html).toContain("https://vtcbelgium.github.io/fillthispdf-web/nl/");
      expect(html).toContain("https://vtcbelgium.github.io/fillthispdf-web/fr/");
      expect(html).toContain(locale === "en" ? "No signup, trial, payment card" : locale === "nl" ? "Geen abonnement" : "Pas d'abonnement");
      expect(html).toContain('type="application/ld+json"');
      const json = JSON.parse(html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s)![1]);
      expect(json["@type"]).toBe("WebApplication");
      expect(json.offers.price).toBe("0");
      expect(json.url).toBe(url);
      expect(html).toContain('href="https://vtcbelgium.github.io/fillthispdf-web/"');
    });
  }
  it("provides one consistent localized sitemap", () => {
    const xml = readFileSync("public/sitemap.xml", "utf8");
    for (const {url} of pages) {
      expect(xml).toContain(`<loc>${url}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(3);
  });
  it("keeps the actual editor on the English root and directs localized readers to it", () => {
    const main = readFileSync("index.html", "utf8");
    expect(main).toContain('id="root"');
    expect(main).toContain('type="module"');
    for (const locale of ["nl", "fr"]) {
      const html = readFileSync(`${locale}/index.html`, "utf8");
      expect(html).not.toContain('type="module" src=');
      expect(html).toContain(`href="${root}"`);
      expect(html).toContain("start-button");
    }
  });
});
