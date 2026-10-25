// Browser entry point. Keep the heavy PDF engines out of the initial page bundle.
// PDF.js and pdf-lib are fetched only when the visitor opens or exports a PDF.
import type { Edit, LoadedPdf, PageInfo, Values } from "./pdf-heavy";
export type {
  Edit, LoadedPdf, PageInfo, Values, FormField, Widget,
} from "./pdf-heavy";

export const MAX_BYTES = 25 * 1024 * 1024;
export const MAX_PAGES = 50;

export class PdfError extends Error {
  constructor(
    public code:
      | "file" | "size" | "pages" | "password" | "invalid" | "font" | "xfa",
  ) {
    super(code);
  }
}

export function validateFile(file: Pick<File, "name" | "size" | "type">) {
  if (
    !/\.pdf$/i.test(file.name) ||
    (file.type &&
      ![
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream",
      ].includes(file.type))
  ) {
    throw new PdfError("file");
  }
  if (!file.size) throw new PdfError("invalid");
  if (file.size > MAX_BYTES) throw new PdfError("size");
}

export function pdfPoint(page: PageInfo, x: number, y: number) {
  return page.viewport.convertToPdfPoint(x, y);
}

// The import promise is cached by the JS module loader; repeated exports reuse it.
export async function loadPdf(bytes: Uint8Array, font: Uint8Array): Promise<LoadedPdf> {
  const engine = await import("./pdf-heavy");
  return engine.loadPdf(bytes, font);
}

export async function exportPdf(
  source: LoadedPdf,
  edits: Edit[],
  values: Values,
): Promise<Uint8Array> {
  const engine = await import("./pdf-heavy");
  return engine.exportPdf(source, edits, values);
}
