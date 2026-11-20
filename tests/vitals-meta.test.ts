import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const ogImage = "https://fillthispdf.othrys.be/og-image.svg";

describe("social sharing metadata", () => {
  it("ships the referenced Open Graph image asset", () => {
    expect(existsSync("public/og-image.svg")).toBe(true);
  });

  it("points og:image and twitter:image at the existing asset", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toContain(`<meta property="og:image" content="${ogImage}"/>`);
    expect(html).toContain(`<meta name="twitter:image" content="${ogImage}"/>`);
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    expect(html).not.toContain('"@type": "Person"');
    expect(html).not.toMatch(/Zero Ads|Never Ads/i);
  });
});
