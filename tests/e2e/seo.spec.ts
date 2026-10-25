import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const locales = [
  {path: "/nl/", lang:"nl", title:/PDF invullen online gratis/, cta:/Gratis PDF-editor openen/},
  {path: "/fr/", lang:"fr", title:/Remplir un PDF en ligne gratuitement/, cta:/Ouvrir l’éditeur PDF gratuit/},
] as const;

test("homepage exposes free PDF product metadata and no paywall", async ({page}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Got a PDF to fill/i })).toBeVisible();
  await expect(page.getByRole("heading", {name:/Fill in a PDF online/i})).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href","https://vtcbelgium.github.io/fillthispdf-web/");
  await expect(page.getByText("No account. No watermark. No payment to download.")).toBeVisible();
  await expect(page.locator("a[href*='pdffiller.com']")).toHaveCount(0);
  const links = page.locator('link[rel="alternate"][hreflang]');
  await expect(links).toHaveCount(4);
});

for (const loc of locales) {
  test(`${loc.lang} localized landing page links to functioning editor`, async ({page}) => {
    await page.goto(loc.path);
    await expect(page.locator("html")).toHaveAttribute("lang",loc.lang);
    await expect(page).toHaveTitle(loc.title);
    const cta=page.getByRole("link",{name:loc.cta});
    await expect(cta).toBeVisible();
    await Promise.all([
      page.waitForURL("**/"),
      cta.click(),
    ]);
    await expect(page.getByRole("heading",{name:/Got a PDF to fill/i})).toBeVisible();
    const pdf=await PDFDocument.create();pdf.addPage([612,792]);
    await page.getByLabel("Choose a PDF",{exact:true}).setInputFiles({
      name:"seo-compatibility-test.pdf",
      mimeType:"application/pdf",
      buffer:Buffer.from(await pdf.save()),
    });
    await expect(page.getByRole("heading",{name:"seo-compatibility-test.pdf"})).toBeVisible();
    const awaited=page.waitForEvent("download");
    await page.getByRole("button",{name:"Download PDF"}).click();
    const d=await awaited;
    expect(d.suggestedFilename()).toContain("filled.pdf");
    const bytes=await (await import("node:fs/promises")).readFile(await d.path());
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
}

test("sitemap is served as crawlable XML",async ({request})=>{
  const result=await request.get("/sitemap.xml");
  expect(result.status()).toBe(200);
  expect(result.headers()["content-type"]).toMatch(/xml/);
  const text=await result.text();
  expect(text).toContain("<urlset");
  expect(text).toContain("<loc>https://vtcbelgium.github.io/fillthispdf-web/fr/</loc>");
});
