import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { xrefErrors } from "./xref";

const testPdf = "public/sample-form.pdf";

describe("genuine downloadable sample form", () => {
  it("contains seven standard AcroForm fields with a valid root/xref", async () => {
    const bytes = readFileSync(testPdf);
    expect(xrefErrors(bytes)).toEqual([]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getForm().getFields().map((field) => field.getName())).toEqual([
      "Full name",
      "Email address",
      "Date",
      "City",
      "Comments",
      "Contact preference",
      "I agree",
    ]);
    expect(doc.getForm().getTextField("Full name").getText() ?? "").toBe("");
    expect(doc.getForm().getCheckBox("I agree").isChecked()).toBe(false);
  });

  it("offers the same file in English, Dutch and French without introducing a paywall", () => {
    const pages = [
      {file:"index.html", label:"Download a free sample PDF to try", href:"./sample-form.pdf"},
      {file:"nl/index.html", label:"Download een voorbeeld-PDF", href:"../sample-form.pdf"},
      {file:"fr/index.html", label:"T&eacute;l&eacute;charger un PDF d'exemple", href:"../sample-form.pdf"},
    ];
    for (const page of pages) {
      const content = readFileSync(page.file, "utf8");
      expect(content).toContain(`href="${page.href}"`);
      expect(content).toContain(page.label);
      expect(content).not.toContain("subscribe to download");
    }
  });
});
