import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { xrefErrors } from "../xref";

test("PDF engine is downloaded only when a visitor selects a PDF", async ({ page }) => {
  const scripts: string[] = [];
  const errors: string[] = [];
  page.on("request", (req) => {
    if (req.resourceType() === "script") scripts.push(req.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  expect(scripts.some((url) => url.includes("pdf-heavy-"))).toBe(false);
  await expect(page.getByRole("heading", { name: /Got a PDF to fill/i })).toBeVisible();

  await page.getByLabel("Choose a PDF", { exact: true }).setInputFiles({
    name: "lazy-acrobat-test.pdf",
    mimeType: "application/pdf",
    buffer: await readFile("tests/fixtures/reportlab-incremental-root.pdf"),
  });
  await expect(page.getByRole("heading", { name: "lazy-acrobat-test.pdf" })).toBeVisible();
  await expect.poll(() => scripts.some((url) => url.includes("pdf-heavy-"))).toBe(true);

  const form = page.locator("aside").first();
  await form.getByLabel("Full name", { exact: true }).fill("Lazy PDF Test");
  await form.getByLabel("I agree", { exact: true }).check();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await event;
  const bytes = await readFile(await download.path());
  expect(xrefErrors(bytes)).toEqual([]);
  const parsed = await PDFDocument.load(bytes);
  expect(parsed.getForm().getTextField("Full name").getText()).toBe("Lazy PDF Test");
  expect(parsed.getForm().getCheckBox("I agree").isChecked()).toBe(true);
  expect(errors).toEqual([]);
});
