import type { Language } from "./i18n";
const en = {
  title: "AI assistance",
  disabled: "AI not configured",
  off: "No AI endpoint is configured. Manual filling and export work without AI.",
  noFields:
    "Open a PDF with editable form fields to use AI. For flat PDFs, use the manual tools; AI cannot suggest positions or signatures.",
  privacy:
    "Only the selected field labels and the text below will be sent to Cloudflare Workers AI. The PDF, images and existing values stay on your device. Avoid secrets and sensitive details you do not want to share.",
  terms:
    "Cloudflare processes this text remotely. Its terms describe no model training and limited retention for standard inference, with operational metadata and safety/legal exceptions.",
  policy: "Cloudflare data usage",
  fields:
    "Select fields to send (up to 20). You can edit their labels before sending.",
  label: "Label sent for",
  text: "Instructions for AI",
  payload: "Exact data to send",
  consent:
    "I consent to send exactly this data to Cloudflare Workers AI for this request.",
  send: "Suggest matches",
  pending: "Getting suggestions…",
  review:
    "Review each suggestion. Approve only values you want to apply; these may replace existing values.",
  approve: "Approve",
  apply: "Apply approved suggestions",
  empty: "No matching suggestions. You can fill the form manually.",
  invalid:
    "Select 1–20 fields with unique, non-empty labels (up to 120 characters) and enter up to 2,000 characters. The request must fit within 8 KB.",
  failed:
    "AI is unavailable or returned an invalid match. Your PDF is unchanged. You can try again with fresh consent or fill manually.",
  limited:
    "AI is temporarily rate limited or its free allowance is exhausted. Fill manually or try again later with fresh consent.",
  applied:
    "Approved suggestions applied. Review your PDF; Undo restores the previous values.",
};
export const aiMessages: Record<Language, typeof en> = {
  en,
  nl: {
    title: "AI-hulp",
    disabled: "AI niet ingesteld",
    off: "Er is geen AI-endpoint ingesteld. Handmatig invullen en exporteren werken zonder AI.",
    noFields:
      "Open een PDF met bewerkbare formuliervelden voor AI. Gebruik voor vlakke PDF’s de handmatige tools; AI stelt geen posities of handtekeningen voor.",
    privacy:
      "Alleen de geselecteerde veldlabels en de tekst hieronder worden naar Cloudflare Workers AI gestuurd. De PDF, afbeeldingen en bestaande waarden blijven op je apparaat. Vermijd geheimen en gevoelige informatie die je niet wilt delen.",
    terms:
      "Cloudflare verwerkt deze tekst op afstand. De voorwaarden beschrijven geen modeltraining en beperkte bewaring bij standaardverzoeken, met operationele metadata en uitzonderingen voor veiligheid en wettelijke verplichtingen.",
    policy: "Cloudflare-datagebruik",
    fields:
      "Selecteer velden om te versturen (maximaal 20). Je kunt hun labels vooraf aanpassen.",
    label: "Verstuurd label voor",
    text: "Instructies voor AI",
    payload: "Exact te versturen gegevens",
    consent:
      "Ik geef toestemming om precies deze gegevens voor dit verzoek naar Cloudflare Workers AI te sturen.",
    send: "Koppelingen voorstellen",
    pending: "Voorstellen ophalen…",
    review:
      "Controleer elk voorstel. Keur alleen gewenste waarden goed; ze kunnen bestaande waarden vervangen.",
    approve: "Goedkeuren",
    apply: "Goedgekeurde voorstellen toepassen",
    empty:
      "Geen passende voorstellen. Je kunt het formulier handmatig invullen.",
    invalid:
      "Selecteer 1–20 velden met unieke, niet-lege labels (maximaal 120 tekens) en voer maximaal 2.000 tekens in. Het verzoek moet binnen 8 KB passen.",
    failed:
      "AI is niet beschikbaar of gaf een ongeldig voorstel. Je PDF is ongewijzigd. Probeer opnieuw met nieuwe toestemming of vul handmatig in.",
    limited:
      "AI is tijdelijk begrensd of het gratis tegoed is op. Vul handmatig in of probeer later opnieuw met nieuwe toestemming.",
    applied:
      "Goedgekeurde voorstellen toegepast. Controleer je PDF; Ongedaan maken herstelt de vorige waarden.",
  },
  fr: {
    title: "Assistance IA",
    disabled: "IA non configurée",
    off: "Aucun endpoint IA n’est configuré. La saisie manuelle et l’export fonctionnent sans IA.",
    noFields:
      "Ouvrez un PDF avec des champs modifiables pour utiliser l’IA. Pour les PDF plats, utilisez les outils manuels ; l’IA ne propose ni positions ni signatures.",
    privacy:
      "Seuls les libellés sélectionnés et le texte ci-dessous seront envoyés à Cloudflare Workers AI. Le PDF, les images et les valeurs existantes restent sur votre appareil. Évitez les secrets et les informations sensibles que vous ne souhaitez pas partager.",
    terms:
      "Cloudflare traite ce texte à distance. Ses conditions décrivent l’absence d’entraînement et une conservation limitée pour l’inférence standard, avec des métadonnées opérationnelles et des exceptions légales et de sécurité.",
    policy: "Utilisation des données Cloudflare",
    fields:
      "Sélectionnez les champs à envoyer (20 maximum). Vous pouvez modifier leurs libellés avant l’envoi.",
    label: "Libellé envoyé pour",
    text: "Instructions pour l’IA",
    payload: "Données exactes à envoyer",
    consent:
      "J’accepte d’envoyer exactement ces données à Cloudflare Workers AI pour cette requête.",
    send: "Proposer des correspondances",
    pending: "Recherche de propositions…",
    review:
      "Vérifiez chaque proposition. Approuvez uniquement les valeurs souhaitées ; elles peuvent remplacer des valeurs existantes.",
    approve: "Approuver",
    apply: "Appliquer les propositions approuvées",
    empty:
      "Aucune proposition correspondante. Vous pouvez remplir le formulaire manuellement.",
    invalid:
      "Sélectionnez 1 à 20 champs avec des libellés uniques non vides (120 caractères maximum) et saisissez au plus 2 000 caractères. La requête doit tenir dans 8 Ko.",
    failed:
      "L’IA est indisponible ou a renvoyé une proposition invalide. Votre PDF est inchangé. Réessayez avec un nouveau consentement ou remplissez manuellement.",
    limited:
      "L’IA est temporairement limitée ou son quota gratuit est épuisé. Remplissez manuellement ou réessayez plus tard avec un nouveau consentement.",
    applied:
      "Propositions approuvées appliquées. Vérifiez votre PDF ; Annuler rétablit les valeurs précédentes.",
  },
};
