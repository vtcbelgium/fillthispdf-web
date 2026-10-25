import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  loadPdf,
  exportPdf,
  validateFile,
  pdfPoint,
  type Edit,
} from "../src/pdf";
import { fixture } from "./fixtures";
GlobalWorkerOptions.workerSrc = pathToFileURL(
  resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;
const font = new Uint8Array(
  await readFile("public/fonts/NotoSans-Regular.ttf"),
);

describe("input protection", () => {
  it("checks extension, MIME, size and empty files", () => {
    expect(() =>
      validateFile({ name: "form.PDF", type: "application/pdf", size: 200 }),
    ).not.toThrow();
    expect(() =>
      validateFile({ name: "form.pdf", type: "", size: 200 }),
    ).not.toThrow();
    for (const f of [
      { name: "form.txt", type: "application/pdf", size: 200 },
      { name: "form.pdf", type: "text/html", size: 200 },
      { name: "form.pdf", type: "", size: 0 },
      { name: "form.pdf", type: "", size: 26 * 1024 * 1024 },
    ])
      expect(() => validateFile(f)).toThrow();
  });
  it("rejects malformed and excessive documents", async () => {
    await expect(
      loadPdf(new Uint8Array([1, 2, 3]), font),
    ).rejects.toMatchObject({ code: "invalid" });
    await expect(
      loadPdf(await fixture({ pages: 51 }), font),
    ).rejects.toMatchObject({ code: "pages" });
  });
  it("accepts a blank page and exports it", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const source = await loadPdf(await doc.save(), font);
    const out = await PDFDocument.load(await exportPdf(source, [], {}));
    expect(out.getPageCount()).toBe(1);
    await source.destroy();
  });
  it("rejects a genuinely password-protected PDF", async () => {
    await expect(
      loadPdf(
        new Uint8Array(await readFile("tests/fixtures/password.pdf")),
        font,
      ),
    ).rejects.toMatchObject({ code: "password" });
  });
});
describe("real PDF export/reopen", () => {
  it("preserves form fields and saves text, checkboxes, dropdowns and radio selections", async () => {
    const source = await loadPdf(await fixture({ fields: true }), font);
    expect(source.fields).toHaveLength(6);
    expect(source.pages[0].widgets).toHaveLength(7);
    const values = {
      ...source.values,
      "Full name": "Zoë François",
      "I agree": true,
      Country: ["France"],
      Contact: "Phone",
      Notes: "Line one\nLine two",
    };
    const bytes = await exportPdf(source, [], values),
      out = await PDFDocument.load(bytes),
      form = out.getForm();
    expect(form.getTextField("Full name").getText()).toBe("Zoë François");
    expect(form.getCheckBox("I agree").isChecked()).toBe(true);
    expect(form.getDropdown("Country").getSelected()).toEqual(["France"]);
    expect(form.getRadioGroup("Contact").getSelected()).toBe("Phone");
    expect(form.getTextField("Reference").getText()).toBe("ABC-123");
    expect(out.getPageCount()).toBe(2);
    const reopened = await loadPdf(bytes, font);
    expect(reopened.values["Full name"]).toBe("Zoë François");
    await reopened.destroy();
    await source.destroy();
  });
  for (const rotation of [0, 90, 180, 270])
    it(`retains vector text and exact coordinates at ${rotation}° with a crop box`, async () => {
      const source = await loadPdf(
        await fixture({ rotations: [rotation], crop: true }),
        font,
      );
      const edit: Edit = {
        id: "test",
        page: 0,
        x: 100,
        y: 150,
        size: 18,
        text: "ROUNDTRIP",
        kind: "text",
      };
      const bytes = await exportPdf(
        source,
        [edit, { ...edit, id: "check", x: 60, kind: "check" }],
        {},
      );
      const reopened = await loadPdf(bytes, font),
        page = await reopened.viewer.getPage(1),
        content = await page.getTextContent();
      const item = content.items.find(
        (i) => "str" in i && i.str === "ROUNDTRIP",
      );
      expect(item).toBeDefined();
      if (!item || !("transform" in item)) throw new Error("Missing text");
      const expected = pdfPoint(source.pages[0], 100, 168);
      expect(item.transform[4]).toBeCloseTo(expected[0], 4);
      expect(item.transform[5]).toBeCloseTo(expected[1], 4);
      const viewportPoint = reopened.pages[0].viewport.convertToViewportPoint(
        item.transform[4],
        item.transform[5],
      );
      expect(viewportPoint[0]).toBeCloseTo(100, 4);
      expect(viewportPoint[1]).toBeCloseTo(168, 4);
      expect(
        content.items.some((i) => "str" in i && i.str === "Original page 1"),
      ).toBe(true);
      const out = await PDFDocument.load(bytes);
      expect(out.getPage(0).getRotation().angle).toBe(rotation);
      expect(out.getPage(0).getCropBox()).toEqual({
        x: 30,
        y: 45,
        width: 540,
        height: 700,
      });
      await source.destroy();
      await reopened.destroy();
    });
  it("reports unsupported characters instead of silently losing text", async () => {
    const source = await loadPdf(await fixture(), font);
    await expect(
      exportPdf(
        source,
        [
          {
            id: "bad",
            page: 0,
            x: 10,
            y: 10,
            size: 14,
            kind: "text",
            text: "🙂",
          },
        ],
        {},
      ),
    ).rejects.toMatchObject({ code: "font" });
    await source.destroy();
  });
  it("scales text correctly on PDFs with non-default user units", async () => {
    const source = await loadPdf(
      await fixture({ rotations: [270], crop: true, userUnit: 2 }),
      font,
    );
    const bytes = await exportPdf(
      source,
      [
        {
          id: "units",
          page: 0,
          x: 100,
          y: 150,
          size: 18,
          kind: "text",
          text: "SCALED",
        },
      ],
      {},
    );
    const reopened = await loadPdf(bytes, font),
      page = await reopened.viewer.getPage(1),
      content = await page.getTextContent();
    const item = content.items.find((i) => "str" in i && i.str === "SCALED");
    if (!item || !("transform" in item)) throw new Error("Missing text");
    expect(
      Math.hypot(item.transform[0], item.transform[1]) *
        reopened.pages[0].viewport.userUnit,
    ).toBeCloseTo(18);
    const point = reopened.pages[0].viewport.convertToViewportPoint(
      item.transform[4],
      item.transform[5],
    );
    expect(point[0]).toBeCloseTo(100);
    expect(point[1]).toBeCloseTo(168);
    await source.destroy();
    await reopened.destroy();
  });
});
