import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { exportPdf, loadPdf } from "../src/pdf";
import { xrefErrors } from "./xref";

GlobalWorkerOptions.workerSrc = pathToFileURL(
  resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;

const font = new Uint8Array(await readFile("public/fonts/NotoSans-Regular.ttf"));

describe("Adobe Acrobat compatibility", () => {
  it("exports incrementally revised AcroForms without broken object references", async () => {
    const bytes = new Uint8Array(
      await readFile("tests/fixtures/reportlab-incremental-root.pdf"),
    );
    // Simulates a reportlab PDF updated by a PDF content-credentials tool,
    // producing a catalog with a nonzero object generation.
    expect(Buffer.from(bytes).toString("latin1")).toMatch(
      /\/Root\s+\d+\s+1\s+R/,
    );
    const source = await loadPdf(bytes, font);
    try {
      const filled = await exportPdf(source, [], {
        ...source.values,
        "Full name": "Acrobat Test",
        "I agree": true,
      });
      expect(xrefErrors(filled)).toEqual([]);
      const reopened = await PDFDocument.load(filled);
      expect(reopened.getPageCount()).toBe(1);
      expect(reopened.getForm().getTextField("Full name").getText()).toBe(
        "Acrobat Test",
      );
      expect(reopened.getForm().getCheckBox("I agree").isChecked()).toBe(true);
    } finally {
      await source.destroy();
    }
  });
});
