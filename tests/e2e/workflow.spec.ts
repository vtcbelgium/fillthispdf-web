import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { fixture } from "../fixtures";
import { readFile } from "node:fs/promises";

test("flat PDF: edit, undo/redo, zoom, rotated page, offline download and reopen", async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requests: { url: string; method: string }[] = [];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method() }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Got a PDF to fill? Drop it here." }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("landing.png"),
    fullPage: true,
  });
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles({
      name: "flat-form.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await fixture()),
    });
  await expect(
    page.getByRole("heading", { name: "flat-form.pdf" }),
  ).toBeVisible();
  await page.getByLabel("Your text", { exact: true }).fill("Sarah Peters");
  await page
    .locator('[data-page="1"] canvas')
    .click({ position: { x: 100, y: 150 } });
  await expect(
    page.getByRole("button", { name: "Text: Sarah Peters", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Text: Sarah Peters", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Checkmark", exact: true }).click();
  await page
    .locator('[data-page="2"] canvas')
    .click({ position: { x: 100, y: 120 } });
  await expect(
    page.getByRole("button", { name: "Checkmark:", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fit width", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("editor.png"),
    fullPage: true,
  });
  await context.setOffline(true);
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download PDF", exact: false })
    .click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("flat-form-filled.pdf");
  const bytes = await readFile((await download.path())!);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(2);
  expect(doc.getPage(1).getRotation().angle).toBe(90);
  await expect(page.getByRole("status")).toContainText("Download started");
  expect(errors).toEqual([]);
  await context.setOffline(false);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Close document" }).click();
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles({
      name: "reopened.pdf",
      mimeType: "application/pdf",
      buffer: bytes,
    });
  await expect(
    page.getByRole("heading", { name: "reopened.pdf" }),
  ).toBeVisible();
  await expect(page.locator('[data-page="1"] canvas')).toBeVisible();
  expect(
    requests.filter(
      (r) =>
        r.method !== "GET" ||
        (r.url.startsWith("http") && new URL(r.url).hostname !== "127.0.0.1"),
    ),
  ).toEqual([]);
});

test("existing fields roundtrip, disabled AI and translations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("AI assistance", { exact: false }).click();
  await expect(
    page.getByRole("button", { name: "AI not configured" }),
  ).toBeDisabled();
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles({
      name: "fields.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await fixture({ fields: true })),
    });
  const fields = page.locator("aside");
  await fields.getByLabel("Full name", { exact: true }).fill("Zoë François");
  await fields.getByLabel("I agree", { exact: true }).check();
  await fields.getByLabel("Country", { exact: true }).selectOption("France");
  await fields.getByLabel("Contact", { exact: true }).selectOption("Phone");
  await expect(fields.getByLabel("Reference", { exact: true })).toBeDisabled();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloaded;
  const doc = await PDFDocument.load(await readFile((await download.path())!));
  expect(doc.getForm().getTextField("Full name").getText()).toBe(
    "Zoë François",
  );
  expect(doc.getForm().getCheckBox("I agree").isChecked()).toBe(true);
  expect(doc.getForm().getRadioGroup("Contact").getSelected()).toBe("Phone");
  await page.getByLabel("Language", { exact: true }).selectOption("nl");
  await expect(
    page.getByRole("button", { name: "PDF downloaden" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await page.getByLabel("Taal", { exact: true }).selectOption("fr");
  await expect(
    page.getByRole("button", { name: "Télécharger le PDF" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("invalid files give an actionable error and allow retry", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles({
      name: "bad.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not a PDF"),
    });
  await expect(page.getByRole("alert")).toContainText("could not open");
  const doc = await PDFDocument.create();
  doc.addPage();
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles({
      name: "blank.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await doc.save()),
    });
  await expect(page.getByRole("heading", { name: "blank.pdf" })).toBeVisible();
});
