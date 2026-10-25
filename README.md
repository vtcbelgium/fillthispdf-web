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
- Serve `.mjs` as JavaScript, `.wasm` as `application/wasm`, and `.ttf` as a font. Use HTTPS. The default configuration expects hosting at the domain root.
- Cache hashed `/assets/` files immutably; revalidate `index.html` and unversioned font/decoder assets on releases. No API routes, secrets or external services are needed.
- Configure the domain, DNS, canonical URL and search indexing only after separate deployment review. This PR does not deploy, merge or modify DNS.

Noto Sans is redistributed under the [SIL Open Font License](public/fonts/LICENSE.txt). PDF.js and pdf-lib retain their respective dependency licenses.
