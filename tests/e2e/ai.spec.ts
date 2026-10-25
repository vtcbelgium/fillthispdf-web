import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { fixture } from "../fixtures";

async function open(page: Page, fields = true) {
  await page.goto("./");
  await page.getByLabel("Choose a PDF", { exact: true }).setInputFiles({
    name: "private-name.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await fixture({ fields })),
  });
  await expect(
    page.getByRole("heading", { name: "private-name.pdf" }),
  ).toBeVisible();
  await page.locator(".ai-panel summary").click();
}
async function prepare(page: Page) {
  const panel = page.locator(".ai-panel");
  await panel.getByRole("checkbox", { name: "Full name", exact: true }).check();
  await panel
    .getByLabel("Instructions for AI", { exact: true })
    .fill("My name is Jane");
  return panel;
}

test("consent, exact payload, editable labels, individual review, undo and offline export", async ({
  page,
  context,
}, testInfo) => {
  const requests: unknown[] = [];
  await page.route("https://ai.test/match", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: { suggestions: [{ field: "Name", value: "Jane" }] },
    });
  });
  await open(page);
  const panel = await prepare(page);
  const consent = panel.getByRole("checkbox", { name: /I consent/ });
  const send = panel.getByRole("button", {
    name: "Suggest matches",
    exact: true,
  });
  await expect(consent).not.toBeChecked();
  await expect(send).toBeDisabled();
  await consent.check();
  await panel
    .getByLabel("Label sent for Full name", { exact: true })
    .fill("Name");
  await expect(consent).not.toBeChecked();
  expect(requests).toEqual([]);
  await consent.check();
  // Use the textbox's accessible role/name to verify it remains editable after
  // an explicit consent reset and a field-label change.
  const instructions = panel.getByRole("textbox", {
    name: "Instructions for AI",
    exact: true,
  });
  await expect(instructions).toBeVisible();
  await instructions.fill("My name is Jane.");
  await expect(consent).not.toBeChecked();
  await instructions.fill("My name is Jane");
  await expect(panel.locator("pre")).not.toContainText("Original name");
  await expect(panel.locator("pre")).not.toContainText("private-name.pdf");
  await consent.check();
  await send.click();
  await expect(
    panel.getByText("Review each suggestion.", { exact: false }),
  ).toBeVisible();
  expect(requests).toEqual([{ fields: ["Name"], text: "My name is Jane" }]);
  await expect(consent).not.toBeChecked();
  const original = page
    .locator("aside")
    .getByLabel("Full name", { exact: true });
  await expect(original).toHaveValue("Original name");
  const apply = panel.getByRole("button", {
    name: "Apply approved suggestions",
    exact: true,
  });
  await expect(apply).toBeDisabled();
  await panel.getByRole("checkbox", { name: /Approve: Full name/ }).check();
  await page.screenshot({
    path: testInfo.outputPath("ai-review.png"),
    fullPage: true,
  });
  await apply.click();
  await expect(original).toHaveValue("Jane");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(original).toHaveValue("Original name");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(original).toHaveValue("Jane");
  await context.setOffline(true);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download PDF/ }).click();
  const pdf = await PDFDocument.load(
    await readFile((await (await download).path())!),
  );
  expect(pdf.getForm().getTextField("Full name").getText()).toBe("Jane");
  expect(pdf.getPageCount()).toBe(2);
  expect(pdf.getPage(1).getRotation().angle).toBe(90);
  expect(pdf.getForm().getDropdown("Country").getSelected()).toEqual([
    "Belgium",
  ]);
  expect(requests).toHaveLength(1);
});

test("only individually approved suggestions are applied", async ({ page }) => {
  await page.route("https://ai.test/match", (route) =>
    route.fulfill({
      json: {
        suggestions: [
          { field: "Full name", value: "Jane" },
          { field: "Country", value: "France" },
        ],
      },
    }),
  );
  await open(page);
  const panel = await prepare(page);
  await panel.getByRole("checkbox", { name: "Country", exact: true }).check();
  await panel.getByRole("checkbox", { name: /I consent/ }).check();
  await panel
    .getByRole("button", { name: "Suggest matches", exact: true })
    .click();
  await panel.getByRole("checkbox", { name: /Approve: Full name/ }).check();
  await expect(
    panel.getByRole("checkbox", { name: /Approve: Country/ }),
  ).not.toBeChecked();
  await panel
    .getByRole("button", { name: "Apply approved suggestions" })
    .click();
  await expect(
    page.locator("aside").getByLabel("Full name", { exact: true }),
  ).toHaveValue("Jane");
  await expect(
    page.locator("aside").getByLabel("Country", { exact: true }),
  ).toHaveValue("Belgium");
});

for (const status of [400, 403, 429, 500]) {
  test(`HTTP ${status} recovers with fresh consent; manual fields remain usable`, async ({
    page,
  }) => {
    let calls = 0;
    await page.route("https://ai.test/match", (route) => {
      calls++;
      return route.fulfill(
        calls === 1
          ? { status, body: "private error" }
          : { json: { suggestions: [] } },
      );
    });
    await open(page);
    const panel = await prepare(page);
    const consent = panel.getByRole("checkbox", { name: /I consent/ });
    await consent.check();
    await panel
      .getByRole("button", { name: "Suggest matches", exact: true })
      .click();
    await expect(panel.getByRole("alert")).toContainText(
      status === 429 ? "rate limited" : "unavailable",
    );
    await expect(consent).not.toBeChecked();
    await expect(
      panel.getByRole("button", { name: "Suggest matches", exact: true }),
    ).toBeDisabled();
    await page
      .locator("aside")
      .getByLabel("Full name", { exact: true })
      .fill("Manual survives");
    await consent.check();
    await panel
      .getByRole("button", { name: "Suggest matches", exact: true })
      .click();
    await expect(panel.getByRole("status")).toContainText(
      "No matching suggestions",
    );
    await expect(
      page.locator("aside").getByLabel("Full name", { exact: true }),
    ).toHaveValue("Manual survives");
    expect(calls).toBe(2);
  });
}

test("hallucinated field rejects all suggestions; removal resets consent; no flat PDF claims", async ({
  page,
}) => {
  await page.route("https://ai.test/match", (route) =>
    route.fulfill({
      json: {
        suggestions: [
          { field: "Full name", value: "Jane" },
          { field: "Hallucination", value: "x" },
        ],
      },
    }),
  );
  await open(page);
  const panel = await prepare(page);
  const consent = panel.getByRole("checkbox", { name: /I consent/ });
  await consent.check();
  await panel
    .getByRole("checkbox", { name: "Full name", exact: true })
    .uncheck();
  await expect(consent).not.toBeChecked();
  await expect(consent).toBeDisabled();
  await panel.getByRole("checkbox", { name: "Full name", exact: true }).check();
  await consent.check();
  await panel
    .getByRole("button", { name: "Suggest matches", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Apply approved suggestions" }),
  ).toHaveCount(0);
  await expect(
    page.locator("aside").getByLabel("Full name", { exact: true }),
  ).toHaveValue("Original name");
  await page.getByRole("button", { name: "Close document" }).click();
  await page.locator(".ai-panel summary").click();
  await expect(panel.getByText(/Open a PDF with editable/)).toBeVisible();
  await page.getByLabel("Choose a PDF", { exact: true }).setInputFiles({
    name: "flat.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await fixture()),
  });
  await expect(page.getByRole("heading", { name: "flat.pdf" })).toBeVisible();
  await page.locator(".ai-panel summary").click();
  await expect(panel.getByText(/For flat PDFs/)).toBeVisible();
});

test("late responses cannot change a closed document; UI translates without persisting data", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("https://ai.test/match", async (route) => {
    await gate;
    await route
      .fulfill({
        json: { suggestions: [{ field: "Full name", value: "Jane" }] },
      })
      .catch(() => {});
  });
  await open(page);
  const panel = await prepare(page);
  await panel.getByRole("checkbox", { name: /I consent/ }).check();
  await panel
    .getByRole("button", { name: "Suggest matches", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("Getting suggestions");
  await page.getByRole("button", { name: "Close document" }).click();
  release();
  await page.getByLabel("Choose a PDF", { exact: true }).setInputFiles({
    name: "fresh.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await fixture({ fields: true })),
  });
  await expect(page.getByRole("heading", { name: "fresh.pdf" })).toBeVisible();
  await page.locator(".ai-panel summary").click();
  await expect(
    panel.getByLabel("Instructions for AI", { exact: true }),
  ).toHaveValue("");
  await page.getByLabel("Language", { exact: true }).selectOption("nl");
  await expect(
    panel.getByText("Instructies voor AI", { exact: true }),
  ).toBeVisible();
  await page.locator("header select").selectOption("fr");
  await expect(
    panel.getByText("Instructions pour l’IA", { exact: true }),
  ).toBeVisible();
});
