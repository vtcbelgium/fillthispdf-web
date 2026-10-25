# T3 Code — implementation task

Build FillThisPDF in THIS repository. Read AGENTS.md and docs/PRODUCT.md first.

You own the code. Implement rather than returning a plan.

Do these in order:

1. Scaffold Vite React TypeScript, add pdfjs-dist and pdf-lib, choose light minimal styling, set build/lint/typecheck/test scripts and ignore secrets/build artifacts.
2. Implement a genuine browser-local PDF workflow: upload -> preview pages -> manually place/edit text and checkmarks on any page -> fill standard AcroForms if present -> download an edited PDF with correct locations.
3. Make multi-page and rotated page export correct, and test with representative non-sensitive fixtures. No fake controls. Polished responsive mobile UX, visible privacy copy.
4. Add English, Dutch and French translations and straightforward on-page SEO. Provide a real FAQ, not keyword stuffing.
5. Add opt-in AI assistance only as a real connected feature, with approval before data transmission and user confirmation before changes. Use an optional provider configuration; if not available, honestly disable the feature. Never silently transmit PDF data, leak API keys or require a paid subscription.
6. Run all tests and check the built site. Provide a final concise implementation report: implemented, tested, limitations, required deploy settings.

Non-goals: login, Supabase, persistent documents, paywall, broad conversion suite, PDF page farms, dependencies on other OTHRYS repos.

Use a separate branch, commit useful milestones and open a PR for review. Do not deploy or update DNS without separately confirming the configuration.

Definition of done: REAL download of an edited PDF works on desktop and phone, including a non-fillable form. If anything is not working, report it directly.

**First action:** inspect files, scaffold the app, then implement upload/preview/export. Don't start with AI or branding experiments.
