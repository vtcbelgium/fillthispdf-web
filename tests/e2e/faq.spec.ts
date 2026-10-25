import { test, expect } from "@playwright/test";

const pages = [
 {path:"/", heading:"Frequently asked questions", question:"Is FillThisPDF really free?", phrase:"without a subscription"},
 {path:"/nl/", heading:"Veelgestelde vragen", question:"Is FillThisPDF echt gratis?", phrase:"zonder abonnement"},
 {path:"/fr/", heading:"Questions fréquentes", question:"FillThisPDF est-il vraiment gratuit ?", phrase:"sans abonnement"},
];

for(const locale of pages) {
  test(`${locale.path} FAQ stays below the tool and can be expanded without scripts`,async ({page})=>{
    await page.goto(locale.path);
    const section=page.getByRole("region",{name:locale.heading});
    await expect(section).toBeVisible();
    const entries=section.locator("details");
    await expect(entries).toHaveCount(5);
    const first=entries.first();
    const summary=first.locator("summary");
    await expect(summary).toHaveText(locale.question);
    await expect(first).not.toHaveAttribute("open","");
    await summary.click();
    await expect(first).toHaveAttribute("open","");
    await expect(first.getByText(locale.phrase,{exact:false})).toBeVisible();
    await summary.click();
    await expect(first).not.toHaveAttribute("open","");
  });
}
