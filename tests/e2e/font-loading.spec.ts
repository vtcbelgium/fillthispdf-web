import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { xrefErrors } from "../xref";

test("the PDF embedding font is fetched only after a PDF is chosen", async ({ page }) => {
  const fontRequests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("NotoSans-Regular.ttf")) {
      fontRequests.push(request.url());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Got a PDF to fill/i })).toBeVisible();
  expect(fontRequests).toHaveLength(0);

  await page.getByLabel("Choose a PDF", { exact: true }).setInputFiles({
    name: "font-regression.pdf",
    mimeType: "application/pdf",
    buffer: await readFile("tests/fixtures/reportlab-incremental-root.pdf"),
  });
  await expect(page.getByRole("heading", { name: "font-regression.pdf" })).toBeVisible();
  expect(fontRequests).toHaveLength(1);

  const form = page.locator("aside").first();
  await form.getByLabel("Full name", { exact: true }).fill("Unicode Zoë");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await pending;
  const bytes = await readFile(await download.path());
  expect(xrefErrors(bytes)).toEqual([]);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getForm().getTextField("Full name").getText()).toBe("Unicode Zoë");
  expect(errors).toEqual([]);
});
