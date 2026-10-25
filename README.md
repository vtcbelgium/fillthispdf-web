# FillThisPDF v0.1

**Got a PDF to fill? Drop it here.** A standalone React + TypeScript + Vite app that reads, previews, fills and exports PDFs entirely in the browser. Implements [issue #1](https://github.com/vtcbelgium/fillthispdf-web/issues/1).

## Run locally

Use Node.js 24 and npm. On Windows PowerShell with script execution disabled, use `npm.cmd` / `npx.cmd`.

```sh
npm ci
npm run dev
```

No environment variables, provider keys, account, database or backend are required. The app does not upload documents, store them persistently, or send analytics. All edits are held in tab memory. Closing or refreshing discards them; download first.

## Features

- Local PDF file picker and drag/drop, with MIME/extension checks and 25 MB / 50-page limits.
- All-page PDF.js preview, page navigation, zoom and fit width. Nearby pages render on demand; offscreen canvas buffers are released.
- Text, editable dates, vector checkmarks and simple **typed** signatures on flat PDFs and scans. Select, edit, drag, move with arrow keys, resize, delete, undo and redo (100 history states).
- Standard AcroForm text, multiline, checkbox, radio and choice fields, including read-only protection. Edit on the page or in the accessible form panel.
- PDF-lib export retains original pages and vector content. Additions use PDF.js inverse viewport coordinates, including crop offsets, 0/90/180/270-degree page rotations and non-default PDF user units. Fonts are embedded for portable output.
- English, Dutch and French UI, metadata, privacy disclosures and FAQ. Responsive mobile controls and touch placement.
- Optional genuine Cloudflare Workers AI matching for existing form fields, with exact payload preview, fresh consent per request and individual review before applying. Only selected labels and entered instructions leave the device; PDF files and current values do not. Disabled **AI not configured** state when `VITE_AI_ENDPOINT` is unset. See [Worker setup, privacy and current authentication blocker](workers/fillthispdf-ai/README.md). No live service is configured by this change.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run test:e2e:ai
npm run worker:check
npm run build
npm audit
```

`test:e2e` builds and tests the **production bundle** on port 4173. It starts and stops its own Vite preview server. Playwright uses Chromium desktop and an iPhone 13 viewport with touch emulation. It is not a physical-device or Safari certification.

PDF tests cover validation, malformed/password-protected/blank documents, page limits, form roundtrips, preservation of original text, all four page rotations, crop offsets, user units and unsupported characters. Browser tests cover flat PDFs, two-page documents, fields, zoom, pointer/keyboard repositioning, touch placement, date editing, typed signatures, deletion, undo/redo, error recovery, translations and disabled AI. A download is produced with the network disabled and reopened; requests are checked for unexpected methods and external origins. Exported text coordinates are independently read back and compared with the displayed baseline after zoom/repositioning. Added Worker/client tests cover bounds, CORS, rate-limit failure, timeout, quota errors, strict schemas and minimized requests. The separate AI browser suite exercises consent/review, removal and renaming of selected labels, error recovery, stale-response isolation, translations and offline export on desktop/mobile at the GitHub Pages base path. All AI tests use mocks; no live inference is claimed.

Synthetic fixtures only; see [tests/fixtures/README.md](tests/fixtures/README.md). Browser screenshots and failure traces are written to ignored `test-results/`. GitHub Actions runs the checks on PRs and uploads test artifacts.

## Scope and known limits

- Password-protected files must be unlocked elsewhere. XFA forms are rejected with an explanation. Special signature/button fields are preserved but are not editable.
- Typed signatures are visual additions, not certified or qualified digital signatures. Editing can invalidate existing digital signatures.
- This adds content; it does not erase/rewrite original text, OCR scans, draw handwritten signatures, rotate source pages or save work across sessions.
- The bundled Noto Sans supports Latin, Greek and Cyrillic. Unsupported new text (including emoji and CJK) produces a clear export error instead of silently dropping glyphs. Original content retains its fonts.
- Native form controls highlight editable areas; their preview styling can differ from a PDF viewer’s final field appearance. Review the downloaded PDF before sharing.
- Complex or malformed PDFs can still be unsupported. Very large page dimensions are rejected. Initial PDF libraries are substantial; Vite reports a large-bundle advisory. The compatibility build and all font/decoder assets are served locally.
- Offline **export after opening a document** is tested. Offline initial app loading or opening a new file without cached app assets is not promised; there is no service worker.

## Deployment settings — not deployed by this change

Static hosting is sufficient. Target domain: `fillthispdf.othrys.be`.

- Node.js 24; install with `npm ci`; build with `npm run build`; publish `dist/`.
- `prebuild` copies PDF.js character maps, fonts and decoder assets from the locked dependency into `public/pdfjs/`, then Vite includes them in `dist/`. Do not omit these directories, the PDF worker `.mjs`, or `fonts/NotoSans-Regular.ttf`.
- Serve `.mjs` as JavaScript, `.wasm` as `application/wasm`, and `.ttf` as a font. Use HTTPS. Vite's relative asset base (`./`) supports both `/fillthispdf-web/` and a domain root with the same build.
- Cache hashed `/assets/` files immutably; revalidate `index.html` and unversioned font/decoder assets on releases. No API routes, secrets or external services are needed.
- Configure the domain, DNS, canonical URL and search indexing only after separate deployment review. This PR does not deploy, merge or modify DNS.

Noto Sans is redistributed under the [SIL Open Font License](public/fonts/LICENSE.txt). PDF.js and pdf-lib retain their respective dependency licenses.

### GitHub Pages fallback

The public repository can use free GitHub Pages hosting while Vercel project creation is blocked (403). `.github/workflows/pages.yml` deploys only `main`, on push or manual dispatch. It installs locked dependencies, runs lint, typecheck, PDF and desktop/mobile browser tests, builds, uploads only `dist/`, and deploys after the build job succeeds. Actions are pinned to commit SHAs; the build has read-only repository access and only the separate deploy job has Pages/OIDC write permissions. No credentials or provider setup are needed.

After merging this PR:

1. Open repository **Settings → Pages → Build and deployment** and verify **GitHub Actions** is the source (already configured when this release was prepared; select it if needed). Leave **Custom domain** empty.
2. Under **Settings → Environments → github-pages**, restrict deployment branches/tags to the selected branch `main` (create the environment if it does not exist). Approve deployments if your environment requires reviewers.
3. Open **Actions → Deploy GitHub Pages → Run workflow**, select `main`, and run it. If the merge-triggered run already succeeded after Pages was enabled, no rerun is needed. If it ran before Pages was enabled and failed, rerun it now.
4. Wait for both `build` and `deploy` to succeed. Open the deployment URL: <https://vtcbelgium.github.io/fillthispdf-web/>. Confirm a synthetic PDF renders and exports on desktop and mobile; refresh the page to verify assets still load.

Future pushes to `main` publish automatically; PRs use the existing Verify workflow and cannot deploy. GitHub Pages controls response caching. This change does not enable Pages, deploy, configure a custom domain, change DNS or Vercel settings, or change app features. The future `fillthispdf.othrys.be` root uses the same relative build, but domain setup remains a separate task.

References: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite relative base](https://vite.dev/guide/build.html#relative-base).

## Replaceable AI implementation (v0.2 work in review)

The optional AI engine has a **backend-neutral** `/match` API, with
Cloudflare Workers AI as default and a separately configured
OpenAI-compatible provider adapter. The browser sends only user-approved
field labels and typed instructions, never the PDF or existing field values.
The chosen provider is disclosed before each fresh consent and the Worker
checks its identifier; it will reject changes not reflected in the website
configuration. No hidden provider switching, paid fallbacks, or retry loops.
See [provider deployment and privacy configuration](workers/fillthispdf-ai/README.md).

AI remains disabled on the live site unless an authenticated, review-tested
Worker URL is configured and a new website build is deliberately deployed.

### Provider Privacy Policy Requirements & Release Hold

For any alternate AI provider (such as an OpenAI-compatible endpoint), the build must configure a valid, public HTTPS privacy policy URL (`VITE_AI_PROVIDER_POLICY_URL` or `VITE_AI_POLICY_URL`). The frontend strictly validates this URL (requiring HTTPS and rejecting credentials) and displays a direct link to the provider's privacy policy. If a valid policy URL is missing or invalid, consent cannot be granted, and the request cannot be sent.

**Release HOLD blocker:** General privacy copy for alternate providers currently uses fallback inline strings in `src/AiPanel.tsx` because `src/i18n.ts` was protected by TEKTON (`FILESYSTEM_SECRET_MATERIAL_REFUSED`). Before any alternate provider release or deployment, full localized privacy terms must be reviewed and merged into translation catalogs once protection is lifted.
