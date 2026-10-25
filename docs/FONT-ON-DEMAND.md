# UI font loading — measurable SEO/performance improvement

The public English PDF tool formerly loaded `NotoSans-Regular.ttf` as a
CSS webfont before anyone selected a PDF. A headless Chrome test against the
production URL measured **285,939 response-body bytes** for that font,
versus **373,045 bytes** total initial transferred response bodies.
This is an uncompressed/downloaded transfer sample, **not a Lighthouse score**.

The UI now uses the local system sans-serif stack, avoiding that initial font
request. The original Noto font is still bundled at
`fonts/NotoSans-Regular.ttf`; the existing editor fetches it when the
visitor selects a PDF and embeds it in the filled export where necessary.
Do not remove or replace the PDF embedding font.

The regression test `tests/e2e/font-loading.spec.ts` checks no Noto download
before upload, one download after upload, and that a Unicode value survives
the Acrobat-compatible PDF export. Existing editing, rotation, undo/redo,
multilingual, security and SEO tests remain mandatory.

No paywall, AI, tracking, remote PDF uploads, analytics or new dependencies.
