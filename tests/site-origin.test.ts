import { describe, expect, it } from "vitest";
import {
  siteOrigin,
  GITHUB_PAGES_URL,
  CUSTOM_DOMAIN_URL,
} from "../scripts/site-origin.mjs";

describe("public SEO origin is deliberately pinned", () => {
  it("retains the working GitHub Pages canonical by default", () => {
    expect(siteOrigin({})).toBe(GITHUB_PAGES_URL);
    expect(siteOrigin({ FILLTHISPDF_SITE_URL: "" })).toBe(GITHUB_PAGES_URL);
  });
  it("allows the reserved custom domain only when explicitly selected", () => {
    expect(siteOrigin({ FILLTHISPDF_SITE_URL: CUSTOM_DOMAIN_URL })).toBe(CUSTOM_DOMAIN_URL);
  });
  it("refuses invalid hostnames, schemes, paths, query strings and missing slashes", () => {
    for (const value of [
      "https://fillthispdf.othrys.be",
      "http://fillthispdf.othrys.be/",
      "https://fillthispdf.othrys.be.evil.test/",
      "https://fillthispdf.othrys.be/?utm=foo",
      "https://vtcbelgium.github.io/",
      "https://evil.example/",
    ]) {
      expect(() => siteOrigin({ FILLTHISPDF_SITE_URL: value })).toThrow("Unknown public URL");
    }
  });
});
