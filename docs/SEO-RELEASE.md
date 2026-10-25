# FillThisPDF: focused SEO release plan

## Product promise (keep accurate)
Free to fill, annotate with text/dates/checkmarks, and download PDFs **in the browser**. No account, watermark, checkout, trial or subscription. Upload limit 25 MB / 50 pages; supported form fields and flat PDFs; typed signature is **not** a certified electronic signature. Scanned document text is not replaced/OCRed. No user-uploaded files are stored by this manual editor. AI is **disabled** in this release.

**Do not** add fake keyword pages, untested features, false review counts, payment funnels, advertisements, external document uploads or trackers.

## Competitor comparison
pdfFiller publishes extensive tool-specific pages and covers many advanced functions (conversion, eSign, merge, OCR, templates, sharing). Its published pricing offers subscription plans; our distinctive use case is a **small no-account, no-paywall, local-first PDF filler**. Do not present ours as a replacement for features it does not offer.

## Changes in this release
- Descriptive, unique static HTML title/description, original helpful copy and WebApplication JSON-LD with factual price 0, in EN/NL/FR.
- One main working editor at `/`. Static localized information pages at `/nl/`, `/fr/` lead to that editor, instead of duplicating the PDF engine. These are **landing pages, not localized standalone editors**; the existing editor already supports language selection.
- Unique canonicals, reciprocal hreflang (en/nl/fr/x-default), OG tags, clear free/privacy wording and a three-URL sitemap at `/sitemap.xml`.
- A brief crawlable semantic explanation visible below the editor on the English home page, plus a linked EN/NL/FR navigation.
- Existing Acrobat export regression, browser editing, and PDF input/output are unaffected. No payments or dependency changes.

## Technical limitations and next high-value actions
1. **Custom domain:** The current public canonical is `https://vtcbelgium.github.io/fillthispdf-web/`. Before investing heavily in backlinks/Search Console, connect `fillthispdf.othrys.be` through DNS and GitHub Pages, configure HTTPS, then replace ALL generated canonicals/hreflang/sitemap/OG URLs with the real domain and verify permanent redirects. GitHub Pages under a subpath does not give this repo control of the host-level robots.txt.
2. **Search Console:** Verify the appropriate domain/URL-prefix property. Submit `/sitemap.xml` after domain is verified, inspect EN/NL/FR URLs, and watch coverage, queries, CTR and Core Web Vitals before adding content. A sitemap helps discovery; it does **not** guarantee indexing/rank.
3. **Performance:** The React/PDF bundle currently weighs about 1.9 MB before gzip (~742 KB gzip), and the PDF.js worker ~1.3 MB. A future independent performance PR should load PDF tooling only after the user selects a file, preserving browser privacy and functionality. Do not couple this SEO release to a risky editor refactor.
4. **Copy precision:** English/Dutch/French localized information pages point to the existing editor; visitors can change language there. The protected `src/App.tsx` has not been modified: editing it was refused by TEKTON (`FILESYSTEM_SECRET_MATERIAL_REFUSED`). Respect the guard rather than routing around it.
5. **Social:** An original branded social image could be added later; do not invent screenshots/reviews.
6. **Distribution:** Ensure the public OTHRYS Portfolio links to the editor (already verified). Seek relevant, useful links; don't buy backlinks, fabricate reviews or create doorway keyword farms.

## Acceptance checks
`npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, `npm audit`. The browser tests cover 3 page paths, localized navigation to the tool, editor interaction, strict Acrobat PDF regression, mobile layout and sitemap delivery. After deployment, repeat GET/HTML/asset checks on GitHub Pages EN/NL/FR/sitemap and perform a real PDF upload/export in the public site.

## Sources reviewed
- Google Search Central SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- JavaScript SEO basics: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Multilingual SEO and sitemaps: https://developers.google.com/search/docs/fundamentals/get-started
- pdfFiller feature inventory: https://www.pdffiller.com/en/features
- pdfFiller pricing: https://www.pdffiller.com/en/services
