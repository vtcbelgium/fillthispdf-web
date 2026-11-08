import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("Forms Hub Page", () => {
  it("exists at public/forms/index.html", () => {
    expect(existsSync("public/forms/index.html")).toBe(true);
  });

  it("contains valid canonical and BreadcrumbList JSON-LD", () => {
    const html = readFileSync("public/forms/index.html", "utf8");
    expect(html).toContain('<link rel="canonical" href="https://fillthispdf.othrys.be/forms/"/>');
    expect(html).toContain('"@type": "CollectionPage"');
    expect(html).toContain('"@type": "BreadcrumbList"');
    expect(html).toContain("Common PDF Forms Library");
  });

  it("links to all 30 form pages", () => {
    const html = readFileSync("public/forms/index.html", "utf8");
    expect(html).toContain('href="./bill-of-sale/"');
    expect(html).toContain('href="./commercial-sublease/"');
    expect(html).toContain('href="./mutual-nda/"');
    expect(html).toContain('href="./residential-lease-agreement/"');
  });
});
