import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { siteOrigin } from "./site-origin.mjs";

const domain = siteOrigin();
const locales = {
  en: {
    path: "", lang: "en",
    title: "Fill PDF Online Free – Fill Forms, Save & Download | FillThisPDF",
    description: "Fill PDF forms online for free. Type into existing fields or add text, dates, checkmarks and typed signatures. Save without an account, watermark or paywall. Files stay on your device.",
    heading: "Fill in a PDF online — free, private and simple",
    intro: "Use FillThisPDF to complete a PDF form directly in your browser. No signup, trial, payment card or watermark. Your original PDF stays on your device.",
    steps: ["Choose a PDF from your device.", "Fill existing form fields or place text, dates and checkmarks on the PDF.", "Download your completed PDF and reopen it in your PDF reader."],
    why: "What can I do with FillThisPDF?",
    detail: "Fill interactive PDF forms, or write on regular and scanned PDFs by placing text on the page. Add checkmarks or a simple typed signature, undo edits, and download the finished file. It does not erase existing content, edit scanned text, or create certified digital signatures.",
    note: "For personal documents, remember to download your finished file before closing the tab. Nothing is uploaded for manual editing.",
    links: ["English","Nederlands","Français"],
  },
  nl: {
    path: "nl/", lang: "nl",
    title: "PDF invullen online gratis – bewerken en downloaden | FillThisPDF",
    description: "Gratis een PDF-formulier invullen, tekst, datums, vinkjes en een getypte handtekening toevoegen en downloaden. Geen account, watermerk, abonnement of upload naar een server.",
    heading: "PDF invullen online — gratis en zonder registratie",
    intro: "Met FillThisPDF vul je PDF-formulieren rechtstreeks in je browser in. Geen abonnement, proefperiode, betaalkaart of watermerk. Je PDF blijft op je eigen apparaat.",
    steps: ["Kies een PDF-bestand op je apparaat.", "Vul bestaande formuliervelden in of plaats tekst, datums en vinkjes op de pagina.", "Download je ingevulde PDF en open hem opnieuw in een PDF-lezer."],
    why: "Wat kun je doen met FillThisPDF?",
    detail: "Vul invulbare PDF-formulieren in of zet tekst op gewone en gescande PDF's. Voeg vinkjes of een eenvoudige getypte handtekening toe, maak wijzigingen ongedaan en sla de ingevulde PDF op. De tool wist geen bestaande inhoud en maakt geen gekwalificeerde digitale handtekeningen.",
    note: "Download je ingevulde bestand voordat je dit tabblad sluit. Bij handmatig bewerken wordt je PDF niet geüpload.",
    links: ["English","Nederlands","Français"],
  },
  fr: {
    path: "fr/", lang: "fr",
    title: "Remplir un PDF en ligne gratuitement, sans inscription | FillThisPDF",
    description: "Remplissez un formulaire PDF gratuitement dans votre navigateur. Ajoutez du texte, des dates, des coches ou une signature saisie. Téléchargement sans compte, filigrane ni abonnement.",
    heading: "Remplir un PDF en ligne — gratuit et sans inscription",
    intro: "FillThisPDF vous permet de remplir des formulaires PDF directement dans votre navigateur. Pas d'abonnement, d'essai, de carte bancaire ni de filigrane. Votre fichier reste sur votre appareil.",
    steps: ["Choisissez un PDF sur votre appareil.", "Remplissez les champs existants ou ajoutez du texte, des dates et des coches.", "Téléchargez le PDF rempli et ouvrez-le dans votre lecteur PDF."],
    why: "Que permet FillThisPDF ?",
    detail: "Remplissez les formulaires PDF interactifs ou placez du texte sur des PDF ordinaires ou numérisés. Ajoutez des coches ou une signature simplement saisie, annulez les modifications et téléchargez le fichier. L'outil n'efface pas le contenu d'origine et ne crée pas de signature numérique certifiée.",
    note: "Téléchargez votre document avant de fermer cet onglet. Aucun PDF n'est envoyé à un serveur pour l'édition manuelle.",
    links: ["English","Nederlands","Français"],
  },
};
const e = (v) => String(v).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const href = (lang) => domain + locales[lang].path;
const allLangs = ["en","nl","fr"];
function page(lang) {
  const t = locales[lang];
  const url = href(lang);
  const dir = t.path ? "../" : "./";
  const structured = {
    "@context":"https://schema.org",
    "@type":"WebApplication",
    name:"FillThisPDF",
    applicationCategory:"BusinessApplication",
    operatingSystem:"Any modern web browser",
    url,
    description:t.description,
    inLanguage:lang,
    offers:{"@type":"Offer","price":"0","priceCurrency":"EUR"},
    isAccessibleForFree:true,
    featureList:["Fill PDF form fields","Add text and checkmarks","Download a completed PDF"],
  };
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="theme-color" content="#11695e"/>
  <meta name="app-root" content="${dir}"/>
  <title>${e(t.title)}</title>
  <meta name="description" content="${e(t.description)}"/>
  <meta name="robots" content="index,follow,max-image-preview:large"/>
  <link rel="canonical" href="${url}"/>
  ${allLangs.map((key) => `<link rel="alternate" hreflang="${key}" href="${href(key)}"/>`).join("\n  ")}
  <link rel="alternate" hreflang="x-default" href="${domain}"/>
  <link rel="icon" type="image/svg+xml" href="${dir}favicon.svg"/>
  ${lang !== "en" ? `<style>body{margin:0;background:#f7f8f4;color:#182c32;font:16px/1.65 system-ui,sans-serif}.localized-start{max-width:750px;margin:5vh auto;padding:30px 24px}h1{font-size:clamp(28px,5vw,46px);line-height:1.16}h2{margin-top:34px}.start-button{display:inline-block;background:#126c60;color:white;border-radius:8px;font-weight:700;padding:13px 22px;margin:12px 0;text-decoration:none}a{color:#11695e}.seo-help-note{font-size:14px;color:#526173}nav{margin-top:34px}nav a{margin-right:10px}@media(max-width:600px){.localized-start{margin:0 auto;padding:22px}}</style>` : ""}
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="FillThisPDF"/>
  <meta property="og:locale" content="${lang === "nl" ? "nl_BE" : lang === "fr" ? "fr_BE" : "en_US"}"/>
  <meta property="og:url" content="${url}"/>
  <meta property="og:title" content="${e(t.title)}"/>
  <meta property="og:description" content="${e(t.description)}"/>
  <meta name="twitter:card" content="summary"/>
  <script type="application/ld+json">${JSON.stringify(structured).replaceAll("<", "\\u003c")}</script>
</head>
<body>
  ${lang === "en" ? '<div id="root"></div><aside class="seo-help" aria-label="'+e(t.heading)+'">' : '<main class="localized-start"><p><strong>FillThisPDF</strong> · '+e(lang === "nl" ? "Gratis online PDF invullen" : "Remplir un PDF gratuitement")+'</p>'}
  ${lang !== "en" ? `<h1>${e(t.heading)}</h1><a class="start-button" href="${domain}">${lang === "nl" ? "Gratis PDF-editor openen" : "Ouvrir l’éditeur PDF gratuit"} →</a>` : ""}
    <div class="seo-help-inner">
      ${lang === "en" ? "<h2>"+e(t.heading)+"</h2>" : ""}
      <p>${e(t.intro)}</p>
      <ol>${t.steps.map(step=>`<li>${e(step)}</li>`).join("")}</ol>
      <h3>${e(t.why)}</h3>
      <p>${e(t.detail)}</p>
      <p class="seo-help-note">${e(t.note)}</p>
      <p><a href="${dir}sample-form.pdf" download="FillThisPDF-Sample-Form.pdf">${lang === "nl" ? "Download een voorbeeld-PDF" : lang === "fr" ? "T&eacute;l&eacute;charger un PDF d'exemple" : "Download a free sample PDF to try"}</a></p>
      <nav aria-label="Languages">
        ${allLangs.map((key,i)=>`<a hreflang="${key}" lang="${key}" href="${href(key)}"${key===lang?' aria-current="page"':''}>${e(t.links[i])}</a>`).join(" · ")}
      </nav>
    </div>
  ${lang === "en" ? '</aside>' : '</main>'}
  ${lang === "en" ? '<script type="module" src="./src/main.tsx"></script>' : ""}
</body>
</html>`.replace(/^[ \t]+$/gm, "");
}
for (const key of allLangs) {
  const path = resolve(locales[key].path, "index.html");
  await mkdir(dirname(path),{recursive:true});
  await writeFile(path, page(key), "utf8");
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allLangs.map((key) => `  <url><loc>${href(key)}</loc>${allLangs.map(alt=>`<xhtml:link rel="alternate" hreflang="${alt}" href="${href(alt)}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${domain}"/></url>`).join("\n")}
</urlset>
`;
await writeFile(resolve("public/sitemap.xml"), sitemap, "utf8");
// Generated pages are part of the checked-in release and validated in tests.
