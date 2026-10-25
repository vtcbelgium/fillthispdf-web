# First-load optimization

The free PDF editor still fills/downloads locally and has no payments or accounts.

At commit `af9d7ca` the initial application JS was one 1,901,521-byte file (742.13 KB gzip). The PDF libraries are now loaded via an explicit dynamic import only after the visitor chooses a PDF. Vite's first-load app JS shrank to 253,487 bytes (80.98 KB gzip); the deferred PDF engine is 1,646,093 bytes (660.77 KB gzip) and is reused on export.

Measured improvement: 89% reduction in compressed *initial JS*. This is not an assertion of an 89% Core Web Vitals improvement or faster PDF processing. The processing engine still loads for people actually filling documents.

Technical boundary: `src/pdf.ts` provides lightweight public types, validation and dispatch; `src/pdf-heavy.ts` contains PDF.js/pdf-lib/fontkit. `src/Page.tsx` no longer imports PDF.js solely for the numeric annotation mode constant (verified: `AnnotationMode.ENABLE === 1`). Node's test workerSrc is preserved; browser workerSrc is configured when the engine loads.

Regression coverage: `tests/e2e/lazy-pdf.spec.ts` confirms the heavy PDF module is absent before upload, present after selection and that the incremental-catalog Acrobat test PDF is filled and strict-structure-valid. Existing form, signature, zoom, rotated-page, undo/redo, mobile and multilingual flows must remain green.

No custom domain or Search Console settings are changed in this release. These remain separate from performance.
