# FillThisPDF — guarded custom-domain cutover

**Status:** HOLD until `fillthispdf.othrys.be` DNS and GitHub Pages domain configuration can be safely verified. This PR is deliberately a **draft** and must not be merged before the cutover. The working site is https://vtcbelgium.github.io/fillthispdf-web/.

## Intended change

- Domain: `https://fillthispdf.othrys.be/`
- Source/hosting repository: `vtcbelgium/fillthispdf-web`, GitHub Actions `pages.yml`, no new hosting fees.
- The `FILLTHISPDF_SITE_URL` build variable is constrained to the existing GitHub Pages URL or this exact OTHRYS URL; no arbitrary host.
- The published English editor, Dutch/French landing pages, canonical/OG/hreflang, WebApplication data, robots and the three-URL sitemap must use the **same** verified origin.
- Relative Vite assets should work both at the old project path and at the new domain root. The browser PDF engine remains entirely local, with no paywall or remote document upload.

## Release sequence — owner/maintainer gate

1. Verify ownership of the `othrys.be` domain in GitHub Pages settings if not already verified. Do not create wildcard DNS entries.
2. Arrange the exact Cloudflare DNS record in the existing `othrys.be` zone: **CNAME** `fillthispdf` to `vtcbelgium.github.io`, **DNS only**, TTL **Auto**. Do not change any existing records. Follow GitHub's recommendation to bind the subdomain to the intended Pages site as part of the same controlled operation to avoid dangling-CNAME takeover risk.
3. Bind the **existing** GitHub Pages repository's custom domain to `fillthispdf.othrys.be`, confirm public CNAME, GitHub Pages ownership checks and HTTPS certificate, and enable **Enforce HTTPS**. Verify `https://fillthispdf.othrys.be/` returns the existing editor before changing source metadata. Existing project URL may start redirecting to the custom domain; this is expected.
4. ONLY after DNS/HTTPS is verified, review and merge this draft PR. A Pages production build uses the pinned new origin, verifies `dist` metadata/sitemap/robots before upload, then publishes `dist`. Never merge simply because a draft PR's checks pass.
5. Verify production: EN `/`, NL `/nl/`, FR `/fr/` HTTPS 200, exact canonical/OG/hreflang, correct `robots.txt`, 3-URL sitemap, favicon, static JS/PDF fonts and worker assets. Run synthetic PDF upload, field edit, export and reopen on desktop and mobile. Do not upload private documents.
6. Verify the old GitHub Pages URL redirects or correctly resolves to the new domain, and no duplicate canonical URLs remain. Only then change the OTHRYS portfolio link to the branded URL.
7. Submit `https://fillthispdf.othrys.be/sitemap.xml` under `sc-domain:othrys.be` in Search Console and monitor Google-selected canonicals, impressions and clicks. Submission/discovery is not proof of indexing.

## Verification already performed before cutover

- Pinned custom origin builds the 3 localized SEO pages correctly; the new build gate validates the exact origin.
- Lint, TypeScript and 25 unit tests pass. Browser/PDF desktop/mobile suite must pass in this PR before merge.
- This worktree has NOT modified Cloudflare, GitHub Pages custom-domain settings or any deployed site.

## Rollback

Keep a copy of the previous verified GitHub Pages workflow commit. If the new build fails, revert the PR and redeploy the previous compiled app; if DNS/HTTPS routing is the problem, roll back the GitHub Pages custom-domain configuration and exact Cloudflare CNAME together. Recheck the original `https://vtcbelgium.github.io/fillthispdf-web/` route. Do not remove unrelated zone entries.
