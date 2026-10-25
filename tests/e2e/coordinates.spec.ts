import { test, expect } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFile } from "node:fs/promises";
import { fixture } from "../fixtures";

test("zoom and reposition preserve the displayed baseline on a cropped, rotated page", async ({
  page,
}, testInfo) => {
  const original = await fixture({ rotations: [90], crop: true });
  const sourceTask = getDocument({
    data: original.slice(),
    useSystemFonts: true,
  });
  const source = await sourceTask.promise,
    first = await source.getPage(1),
    viewport = first.getViewport({ scale: 1 });
  await page.goto("/");
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles({
      name: "cropped-rotated.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(original),
    });
  await page.getByLabel("Your text", { exact: true }).fill("ALIGNMENT");
  const canvas = page.locator('[data-page="1"] canvas');
  if (testInfo.project.name === "mobile")
    await canvas.tap({ position: { x: 100, y: 120 } });
  else await canvas.click({ position: { x: 100, y: 120 } });
  const overlay = page.getByRole("button", {
    name: "Text: ALIGNMENT",
    exact: true,
  });
  async function position() {
    const box = await canvas.boundingBox();
    const xy = await overlay.evaluate((el) => ({
      x: parseFloat((el as HTMLElement).style.left),
      y: parseFloat((el as HTMLElement).style.top),
    }));
    return {
      x: (xy.x / box!.width) * viewport.width,
      y: (xy.y / box!.width) * viewport.width,
    };
  }
  const before = await position();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  const zoomed = await position();
  expect(zoomed.x).toBeCloseTo(before.x, 2);
  expect(zoomed.y).toBeCloseTo(before.y, 2);
  await overlay.press("ArrowRight");
  await overlay.press("Shift+ArrowDown");
  let moved = await position();
  expect(moved.x).toBeCloseTo(before.x + 1, 2);
  expect(moved.y).toBeCloseTo(before.y + 10, 2);
  if (testInfo.project.name === "desktop") {
    await overlay.scrollIntoViewIfNeeded();
    const box = await overlay.boundingBox(),
      canvasBox = await canvas.boundingBox();
    await page.mouse.move(box!.x + 10, box!.y + 10);
    await page.mouse.down();
    await page.mouse.move(box!.x + 40, box!.y + 30, { steps: 5 });
    await page.mouse.up();
    const dragged = await position();
    expect(dragged.x).toBeCloseTo(
      moved.x + (30 / canvasBox!.width) * viewport.width,
      2,
    );
    expect(dragged.y).toBeCloseTo(
      moved.y + (20 / canvasBox!.width) * viewport.width,
      2,
    );
    moved = dragged;
  }
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const downloaded = await pending;
  const outputTask = getDocument({
    data: new Uint8Array(await readFile((await downloaded.path())!)),
    useSystemFonts: true,
  });
  const output = await outputTask.promise,
    outputPage = await output.getPage(1),
    text = await outputPage.getTextContent();
  const item = text.items.find(
    (item) => "str" in item && item.str === "ALIGNMENT",
  );
  expect(item).toBeDefined();
  if (!item || !("transform" in item)) throw new Error("Text missing");
  const screen = outputPage
    .getViewport({ scale: 1 })
    .convertToViewportPoint(item.transform[4], item.transform[5]);
  expect(screen[0]).toBeCloseTo(moved.x, 2);
  expect(screen[1]).toBeCloseTo(moved.y + 14, 2);
  await page.getByRole("button", { name: "Fit width" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .locator('[data-page="1"]')
    .screenshot({ path: testInfo.outputPath("before-export.png") });
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Close document" }).click();
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles({
      name: "completed.pdf",
      mimeType: "application/pdf",
      buffer: await readFile((await downloaded.path())!),
    });
  await expect(
    page.getByRole("heading", { name: "completed.pdf" }),
  ).toBeVisible();
  await expect(page.locator('[data-page="1"] canvas')).toBeVisible();
  // Wait for actual canvas paint, not only the canvas element's layout.
  await expect
    .poll(() =>
      page.locator('[data-page="1"] canvas').evaluate((el) => {
        const c = el as HTMLCanvasElement;
        const d = c
          .getContext("2d")!
          .getImageData(0, 0, c.width, c.height).data;
        return d.some((v, i) => i % 4 === 0 && v < 150 && d[i + 3] > 0);
      }),
    )
    .toBe(true);
  await page
    .locator('[data-page="1"]')
    .screenshot({ path: testInfo.outputPath("after-reopen.png") });
  await sourceTask.destroy();
  await outputTask.destroy();
});

test("password errors, dates, typed signatures and deletion are usable", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles("tests/fixtures/password.pdf");
  await expect(page.getByRole("alert")).toContainText("password-protected");
  await page
    .getByLabel("Choose a PDF", { exact: true })
    .setInputFiles({
      name: "form.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await fixture({ rotations: [0] })),
    });
  await page.getByRole("button", { name: "Date", exact: true }).click();
  await page
    .locator('[data-page="1"] canvas')
    .click({ position: { x: 80, y: 120 } });
  await page.getByLabel("Your text", { exact: true }).fill("25/10/2026");
  await expect(
    page.getByRole("button", { name: "Date: 25/10/2026" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete selection" }).click();
  await expect(
    page.getByRole("button", { name: "Date: 25/10/2026" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Signature", exact: true }).click();
  await page.getByLabel("Your text", { exact: true }).fill("Sarah Peters");
  await page
    .locator('[data-page="1"] canvas')
    .click({ position: { x: 80, y: 120 } });
  await expect(
    page.getByRole("button", { name: "Signature: Sarah Peters" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "A simple typed signature, not a certified digital signature.",
    ),
  ).toBeVisible();
});
