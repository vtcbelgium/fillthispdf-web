import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const domain = "https://fillthispdf.othrys.be/";

describe("SEO generator build contract", () => {
  it("regenerates all 30 forms, three locales and truthful privacy notices in isolation", () => {
    const formSlugs = readdirSync("public/forms", { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .sort();
    expect(formSlugs).toHaveLength(30);

    const cwd = mkdtempSync(join(tmpdir(), "fillthispdf-seo-"));
    try {
      for (const slug of formSlugs) {
        mkdirSync(join(cwd, "public", "forms", slug), { recursive: true });
      }
      execFileSync(process.execPath, [resolve("scripts/build-seo-pages.mjs")], {
        cwd,
        env: { ...process.env, FILLTHISPDF_SITE_URL: domain },
        timeout: 15000,
      });

      const xml = readFileSync(join(cwd, "public/sitemap.xml"), "utf8");
      const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      expect(urls).toHaveLength(34);
      expect(new Set(urls).size).toBe(urls.length);
      for (const page of [domain, domain + "nl/", domain + "fr/", domain + "forms/"]) {
        expect(urls).toContain(page);
      }
      for (const slug of formSlugs) {
        expect(urls).toContain(`${domain}forms/${slug}/`);
      }

      for (const [path, label] of [
        ["index.html", "Privacy information"],
        ["nl/index.html", "Privacy-informatie"],
        ["fr/index.html", "Informations de confidentialité"],
      ]) {
        const page = readFileSync(join(cwd, path), "utf8");
        expect(page).toContain(label);
        expect(page).toContain("https://othrys.be/legal/privacy");
        expect(page).toContain('src="/stats.js"');
        expect(page).not.toContain("Zero bytes leave your device");
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("does not transmit route fragments or query strings in the statistics client", () => {
    const source = readFileSync("public/stats.js", "utf8");
    expect(source).toContain("path: location.pathname");
    expect(source).not.toContain("location.hash");
    expect(source).not.toContain("hashchange");
  });
});
