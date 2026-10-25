import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { xrefErrors } from "../xref";

test("public sample form downloads, fills and exports as an Acrobat-compatible PDF", async ({page, request}) => {
  const source = await request.get("/sample-form.pdf");
  expect(source.status()).toBe(200);
  expect(source.headers()["content-type"]).toMatch(/pdf/i);
  const sourceBytes = await source.body();
  expect(xrefErrors(sourceBytes)).toEqual([]);

  await page.goto("/");
  const link = page.getByRole("link", { name: "Download a free sample PDF to try" });
  await expect(link).toHaveAttribute("href", "./sample-form.pdf");
  const saving = page.waitForEvent("download");
  await link.click();
  const sample = await saving;
  expect(sample.suggestedFilename()).toBe("FillThisPDF-Sample-Form.pdf");
  const bytes = await readFile(await sample.path());
  expect(bytes.length).toBeGreaterThan(2000);

  await page.getByLabel("Choose a PDF", {exact:true}).setInputFiles({
    name: "sample-form.pdf",
    mimeType: "application/pdf",
    buffer: bytes,
  });
  await expect(page.getByRole("heading", {name:"sample-form.pdf"})).toBeVisible();
  const form = page.locator("aside").first();
  await form.getByLabel("Full name", {exact:true}).fill("Sample Website Test");
  await form.getByLabel("I agree", {exact:true}).check();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", {name:"Download PDF"}).click();
  const filled = await exported;
  const resultBytes = await readFile(await filled.path());
  expect(xrefErrors(resultBytes)).toEqual([]);
  const pdf = await PDFDocument.load(resultBytes);
  expect(pdf.getForm().getTextField("Full name").getText()).toBe("Sample Website Test");
  expect(pdf.getForm().getCheckBox("I agree").isChecked()).toBe(true);
});
