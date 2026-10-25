import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { xrefErrors } from "../xref";

test("incremental-catalog PDF downloads with Acrobat-valid xref on desktop/mobile", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Choose a PDF", { exact: true }).setInputFiles({
    name: "incremental-credential-test.pdf",
    mimeType: "application/pdf",
    buffer: await readFile("tests/fixtures/reportlab-incremental-root.pdf"),
  });
  await expect(
    page.getByRole("heading", { name: "incremental-credential-test.pdf" }),
  ).toBeVisible();
  const form = page.locator("aside");
  await form.getByLabel("Full name", { exact: true }).fill("Acrobat Test");
  await form.getByLabel("I agree", { exact: true }).check();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await promise;
  expect(download.suggestedFilename()).toBe("incremental-credential-test-filled.pdf");
  const bytes = await readFile((await download.path())!);
  expect(xrefErrors(bytes)).toEqual([]);
  const reopened = await PDFDocument.load(bytes);
  expect(reopened.getPageCount()).toBe(1);
  expect(reopened.getForm().getTextField("Full name").getText()).toBe("Acrobat Test");
  expect(reopened.getForm().getCheckBox("I agree").isChecked()).toBe(true);
  expect(errors).toEqual([]);
});
