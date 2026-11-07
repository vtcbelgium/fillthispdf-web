import { expect, test } from "@playwright/test";

test.describe("English canonical editor language", () => {
  test.use({ locale: "nl-BE" });

  test("keeps English SEO and UI on the English root regardless of browser locale", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1").first()).toContainText("Got a PDF to fill?");
    await expect(page).toHaveTitle(
      "Fill PDF Online Free – Fill Forms, Save & Download | FillThisPDF",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /^Fill PDF forms online for free/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://vtcbelgium.github.io/fillthispdf-web/",
    );
  });

  test("still supports a manual language change and restores English metadata", async ({ page }) => {
    await page.goto("/");
    const selector = page.locator("header select");
    await selector.selectOption("nl");
    await expect(page.locator("html")).toHaveAttribute("lang", "nl");
    await expect(page.locator("h1").first()).toContainText("Een PDF invullen?");
    await selector.selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1").first()).toContainText("Got a PDF to fill?");
    await expect(page).toHaveTitle(
      "Fill PDF Online Free – Fill Forms, Save & Download | FillThisPDF",
    );
  });
});
