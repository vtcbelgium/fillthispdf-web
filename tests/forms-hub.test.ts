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
    const jsonText = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    expect(jsonText).toBeTruthy();
    const data = JSON.parse(jsonText!);
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(data.breadcrumb.itemListElement).toHaveLength(2);
    expect(html).toContain("Common PDF Forms Library");
  });

  it("links to all 30 form pages", () => {
    const html = readFileSync("public/forms/index.html", "utf8");
    expect(html).toContain('href="https://fillthispdf.othrys.be/forms/bill-of-sale/"');
    expect(html).toContain('href="https://fillthispdf.othrys.be/forms/commercial-sublease/"');
    expect(html).toContain('href="https://fillthispdf.othrys.be/forms/mutual-nda/"');
    expect(html).toContain('href="https://fillthispdf.othrys.be/forms/residential-lease-agreement/"');
    expect([...html.matchAll(/href="https:\/\/fillthispdf\.othrys\.be\/forms\/[a-z0-9-]+\//g)]).toHaveLength(30);
  });
});
