import { expect, test } from "@playwright/test";

test("the static SEO section stays below the viewport before the editor hydrates", async ({ page }) => {
  // Simulate a slow/unavailable JavaScript bundle. The CSS alone must
  // keep SEO help from jumping through the initial viewport during hydration.
  await page.route("**/*.js", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const positions = await page.evaluate(() => {
    const root = document.querySelector("#root");
    const help = document.querySelector("body > aside.seo-help");
    if (!root || !help) throw new Error("Expected app and static help");
    return {
      rootHeight: root.getBoundingClientRect().height,
      helpTop: help.getBoundingClientRect().top,
      viewport: window.innerHeight,
    };
  });
  expect(positions.rootHeight).toBeGreaterThanOrEqual(positions.viewport - 1);
  expect(positions.helpTop).toBeGreaterThanOrEqual(positions.viewport - 1);
});

test("small instructional text meets 4.5:1 contrast", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const cases = [
    [".paper-icon span", "#f3f8f4"],
    [".dropzone small", "#ffffff"],
    [".benefits article > span", "#f7f8f4"],
    ["footer p", "#f7f8f4"],
    [".seo-help .seo-help-note", "#f4f8f5"],
  ] as const;
  const contrasts = await page.evaluate((targets) => {
    function luminance(color: string) {
      const vals = color.startsWith("#")
        ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
        : (color.match(/\d+/g) ?? []).slice(0, 3).map(Number);
      const linear = vals.map((num) => {
        const c = num / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    }
    return targets.map(([selector, background]) => {
      const elem = document.querySelector(selector);
      if (!elem) throw new Error(`Missing element: ${selector}`);
      const fg = luminance(getComputedStyle(elem).color);
      const bg = luminance(background);
      return { selector, ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) };
    });
  }, cases);
  for (const item of contrasts) {
    expect(item.ratio, `Insufficient contrast for ${item.selector}`).toBeGreaterThanOrEqual(4.5);
  }
});
