import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { faqText } from "../scripts/seo-faq.mjs";

const locales = [
  {lang:"en",file:"index.html",heading:"Frequently asked questions",key:"Is FillThisPDF really free?"},
  {lang:"nl",file:"nl/index.html",heading:"Veelgestelde vragen",key:"Is FillThisPDF echt gratis?"},
  {lang:"fr",file:"fr/index.html",heading:"Questions fréquentes",key:"FillThisPDF est-il vraiment gratuit ?"},
];
describe("helpful PDF FAQ is factual, accessible and never gates downloads", () => {
  for (const {lang,file,heading,key} of locales) {
    it(`${lang}: five original, readable, collapsible answers on the existing page`, () => {
      const html = readFileSync(file,"utf8");
      expect(html).toContain(`<section class="pdf-faq" aria-label="${heading}">`);
      expect(html).toContain(key);
      expect(html.match(/<details>/g)).toHaveLength(5);
      expect(html.match(/<summary>/g)).toHaveLength(5);
      expect(html).not.toContain('"@type":"FAQPage"');
      expect(html).toContain('href="' + (lang === "en" ? "./" : "../") + 'sample-form.pdf"');
      expect(html).toContain('https://vtcbelgium.github.io/fillthispdf-web/');
      expect(faqText[lang].items.every(([,answer]) => answer.length > 45)).toBe(true);
    });
  }
});
