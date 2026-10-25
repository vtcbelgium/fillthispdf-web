# FillThisPDF — product brief v0.1

## The problem and the hook

Someone receives a PDF application, rental form, school form or small business document. They are on a phone and cannot type in it. They want to fill it and return it without installing software, printing, account creation or paywall.

**Product name:** FillThisPDF
**Domain target:** fillthispdf.othrys.be
**SEO headline:** Fill Out a PDF Online — Free PDF Form Filler
**Hero:** Got a PDF to fill? Drop it here.
**Supporting copy:** Add names, dates, checkmarks and signatures to PDFs. Review and download without an account.

## Audience and positioning

Individuals and freelancers, international but especially Dutch/French/English users in Belgium/Europe. Solve the single workflow better than broad document suites. Accessibility and privacy are part of the value proposition; do not imply legal certification.

## Core user flow

1. LAND: Visitor sees one obvious upload dropzone and short benefit claim.
2. UPLOAD: Browser reads PDF locally; clear file errors and protections against huge files.
3. REVIEW: Preview pages in a document workspace, with page navigation, zoom, fit-width.
4. FILL: Recognize existing standard AcroForm fields when present. For a flat PDF, let people place text and checkboxes on any page. Date inserts should be editable. Provide font size and drag/reposition/delete controls.
5. AI: Optional, opt-in assist. Visitor types e.g. "Put Sarah Peters as full name and 25/10/2026 as the date." AI suggests field mapping when a provider is connected; otherwise show clearly that AI is not enabled, without blocking manual completion.
6. EXPORT: Export completed PDF locally with no watermark, preserving untouched content, page sizes and page order.
7. DONE: Success state with another document option and clear statement that no uploaded documents are stored.

## Scope priority

P0: upload, render, flat text overlay, standard form field fill, navigation and PDF download; functioning responsive experience.
P1: checkmarks, typed/drawn signature overlay (describe as simple signature, not qualified digital signature), undo/redo, zoom correctness, extra PDF edge-case tests, i18n.
P2: actual AI field mapping via opt-in server proxy, explicit privacy explanation and no-cost-capable provider adapter. Do not fake or hide if unavailable.
P3: OCR of scans, arbitrary text rewriting, conversion, sharing and persistent accounts are OUT OF SCOPE for this rollout.

If P2 cannot be configured with a real provider without paid resources, finish and ship P0/P1 truthfully as a PDF form filler rather than blocking release or misrepresenting AI.

## Technical guidance

- Vite + React + TypeScript; pdfjs-dist viewer and pdf-lib for export.
- Coordinate mapping must account for DOM zoom, page scale, crop box and rotation; prevent double-scaling, test round trip.
- Display original PDF locally; preserve original PDF structure on export.
- Keep edits in memory, discard when document is closed/refreshed.
- Prevent risky HTML injection from filenames or user text; never execute embedded PDF JavaScript.
- Never store user files in analytics or backend logs.
- Serverless inference adapter only if AI is deployed; consent and minimization first.
- Static hosting is adequate for manual feature set; AI server route may require small backend.

## One-page information architecture

Header: wordmark / language selector / privacy statement
Hero: headline, one-line promise, upload
Workspace: document pages, page navigation and intuitive form tool strip
AI panel: collapsed by default, opt-in and clear state
Trust section: no account, no watermark, browser-local processing
FAQ: What can I fill? Are documents uploaded? Is it free? Can I sign? Does it work on phones?
Footer: privacy, terms, feedback contact only if actually configured

Visual direction: calm, editorial, professional. Off-white background, ink navy or charcoal text, warm teal accent, subtle borders, roomy mobile spacing. Not a cluttered admin dashboard. Prioritize legibility and clear actions.

## Launch criteria and metrics

- A first-time user can upload and return a 2-page non-fillable PDF from mobile in a few minutes.
- Basic PDF export works with the network disabled.
- Browser preview and downloaded file match visibly.
- AI, if offered, makes real suggestions and requires consent; no false promises.
- Analytics collect only privacy-safe page views and anonymous completed-task events if configured, never document text.
- Search Console configured after deployment; don't manufacture hundreds of SEO pages.

## Out of scope

No billing, user accounts, document library, collaboration, certified signatures, giant template catalogue, AI chat about arbitrary documents, OTHRYS platform coupling, or sophisticated agent orchestration.
