# FillThisPDF — T3 Code instructions

You are the IMPLEMENTATION BUILDER for FillThisPDF, a standalone one-page PDF filling web app. Deliver working code, not another proposal. The architect has already decided the scope in docs/PRODUCT.md.

## Objective

Build a production-quality, attractive, mobile-first tool at fillthispdf.othrys.be, with the promise: "Got a PDF to fill? Drop it here."

## First milestone: genuinely usable core

1. Scaffold a small React + TypeScript + Vite frontend (use pdfjs-dist to display pages and pdf-lib to export edited pages). Choose a stable, boring setup.
2. Allow PDF file selection / drag-drop; enforce PDF MIME/extension and reasonable size/page limits with friendly errors.
3. Render all pages, navigate/zoom, and allow clicking or tapping to insert text, dates and checkmarks even on non-fillable PDFs; support existing AcroForm fields.
4. Make editing usable on mobile, with undo/redo and clear selection / delete controls.
5. Export a valid, readable PDF that retains the original pages and adds the edits at correct coordinates (including rotated pages). Never rasterize the whole original PDF just to export.
6. No account, watermark, payment flow or uploading files.
7. Make a pleasant accessible interface, polished empty/loading/error states, responsive controls and visible privacy disclosures.
8. English, Dutch and French UI (small, maintained translations); SEO metadata, visible explanations and descriptive title.

## AI milestone (real, not theatrical)

- Optional AI assistance maps user-provided instructions to identified form fields and suggests placements. User reviews and confirms every suggestion.
- If remote inference is required, implement a server-side API adapter and explicit consent before any data leaves the browser. Send minimum necessary data; never expose provider keys in client bundle, retain or log uploaded documents.
- If no provider is configured, AI must show an honest "AI not configured" disabled state. Manual functionality stays fully operational.
- NEVER call deterministic keyword matching "AI", fabricate AI output, or present an inactive AI button as functional.
- Do not use a paid AI provider or subscribe to external services without owner authorization. Prefer a free or locally hosted compatible endpoint when verified.

## Quality gate

- npm install / npm run build / lint / typecheck / tests all green.
- Tests: PDF with existing fields; flat PDF with text overlay; 2+ pages; one rotated page; blank and password-protected PDFs; export/reopen round trip; mobile viewport; no-network basic export; AI disabled/consent state.
- Test that output does not shift relative to original after zoom and page rotation.
- Do not push secrets or sample sensitive documents.
- Use a feature branch for implementation and explain status, test results and unresolved issues in a PR before merge.
- Commit in short, clear increments. Don't modify other OTHRYS repos.

## Constraints

No Supabase, sign-in, email verification, unrelated automation, complicated architecture, or page farm. There is no need to build the entire PDF editor category. Keep one-page UI and a useful working product.

Start with docs/T3-TASK.md. Implement the working core before cosmetic enhancements.
