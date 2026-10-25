# FillThisPDF — Fill PDF Forms Online for Free

**Have a PDF to fill?** Upload it, fill fields or add text and checkmarks, then download your completed PDF. **No account, subscription, trial, watermark or paywall.** Manual PDF editing runs locally in your browser; your document is not uploaded.

**[Open the free PDF editor](https://vtcbelgium.github.io/fillthispdf-web/)** · **[Download a sample fillable PDF](https://vtcbelgium.github.io/fillthispdf-web/sample-form.pdf)**

**Other languages:** [PDF invullen online gratis (NL)](https://vtcbelgium.github.io/fillthispdf-web/nl/) · [Remplir un PDF gratuitement (FR)](https://vtcbelgium.github.io/fillthispdf-web/fr/)

This open-source app is built with React, TypeScript, Vite, PDF.js and pdf-lib. It supports interactive form fields and adding text to ordinary/scanned pages, but does not OCR existing text or provide certified digital signatures. See [issue #1](https://github.com/vtcbelgium/fillthispdf-web/issues/1) for the original scope.

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
- An explicit, disabled **AI not configured** state. There is no inference adapter, consent flow or remote request because no provider is connected. A future AI integration must implement server-side credentials, explicit consent, minimum data sharing and review before applying suggestions.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

`test:e2e` builds and tests the **production bundle** on port 4173. It starts and stops its own Vite preview server. Playwright uses Chromium desktop and an iPhone 13 viewport with touch emulation. It is not a physical-device or Safari certification.

The 11 PDF tests cover validation, malformed/password-protected/blank documents, page limits, form roundtrips, preservation of original text, all four page rotations, crop offsets, user units and unsupported characters. The 10 browser tests cover flat PDFs, two-page documents, fields, zoom, pointer/keyboard repositioning, touch placement, date editing, typed signatures, deletion, undo/redo, error recovery, translations and disabled AI. A download is produced with the network disabled and reopened; requests are checked for unexpected methods and external origins. Exported text coordinates are independently read back and compared with the displayed baseline after zoom/repositioning.

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

## Search-friendly release

The public editor is a genuinely free, local-first PDF filler with no account,
paywall or watermark. The static SEO build includes clear English documentation
under `/`, Dutch instructions under `/nl/`, French instructions under `/fr/`,
and `/sitemap.xml`. The language pages lead directly to the same working
browser editor. No duplicate PDF backend or payment services were introduced.

For release verification, Search Console, custom-domain migration and known
performance limitations, see [SEO release checklist](docs/SEO-RELEASE.md).
