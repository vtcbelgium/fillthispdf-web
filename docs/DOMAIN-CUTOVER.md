# Permanent-domain cutover: gated and reversible

Target: `https://fillthispdf.othrys.be/` (free GitHub Pages hosting).
Current working URL: `https://vtcbelgium.github.io/fillthispdf-web/`.

**Never switch SEO metadata, DNS, GitHub Pages or public portfolio links until the entire domain is available and verified.**
No timed jobs, paid plans, analytics trackers, AI activation or new hosting are required.

## Today
Cloudflare zone credentials have not been authorized on Legion. The DNS record is absent. GitHub Pages reports `cname: null`. Keep the default build and current canonical unchanged.

## Operator activation steps
1. Authorize Cloudflare Wrangler with `npx wrangler login --device` and approve the displayed short code via the official Cloudflare OAuth page, or use your authorized Cloudflare dashboard. **Never publish OAuth codes, API tokens or login cookies in the repo.**
2. In the `othrys.be` DNS zone, set `CNAME fillthispdf -> vtcbelgium.github.io` (DNS-only for initial checks). Do not touch unrelated DNS.
3. In GitHub repository Settings → Pages, configure `fillthispdf.othrys.be` as the custom domain. Await valid HTTPS. GitHub's Pages settings must agree with the record. Domain takeover protections apply.
4. Only **after HTTPS is confirmed**, explicitly set the repo Pages build environment `FILLTHISPDF_SITE_URL=https://fillthispdf.othrys.be/` in the GitHub Pages build job (or change the default to the verified origin). The allowlist in `scripts/site-origin.mjs` rejects any other URL. This modifies generated canonical, alternate languages, sitemap, structured-data URL and links to the editor in a coordinated build.
5. Run `node scripts/check-domain-readiness.mjs` after the site redeploys. Every line must say PASS. This tool is **read-only** and never edits a DNS or GitHub setting.
6. Verify EN/NL/FR pages and real PDF upload/fill/Acrobat-compatible export on the custom domain. Check the GitHub Pages origin redirects as intended.
7. Submit `https://fillthispdf.othrys.be/sitemap.xml` in the existing verified Google Search Console domain property `sc-domain:othrys.be`. Update the live OTHRYS portfolio link only then.

## Rollback
If the domain is broken, keep GitHub Pages serving the working content, remove the custom-domain setting only after checking how this affects redirects, and restore `FILLTHISPDF_SITE_URL` to the GitHub Pages URL. Never point canonical to a non-resolving host. Rerun browser and PDF tests. The application does not depend on the hostname for its manual editing.

## Limits and SEO reality
Search Console submissions do not guarantee indexing, ranking or traffic. The checker requires a directly visible CNAME (DNS-only); if Cloudflare proxying hides it, return to DNS-only during validation. GitHub Pages itself handles the TLS certificate after ownership verification. The site remains free and accountless. Optional AI is independently disabled.
