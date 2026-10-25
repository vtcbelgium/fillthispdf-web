/** Explicitly pinned public URLs. Never accept an arbitrary SEO or asset origin. */
import process from "node:process";
export const GITHUB_PAGES_URL = "https://vtcbelgium.github.io/fillthispdf-web/";
export const CUSTOM_DOMAIN_URL = "https://fillthispdf.othrys.be/";

export function siteOrigin(env = process.env) {
  const requested = env.FILLTHISPDF_SITE_URL || GITHUB_PAGES_URL;
  if (requested !== GITHUB_PAGES_URL && requested !== CUSTOM_DOMAIN_URL) {
    throw new Error(
      "Unknown public URL: only the existing GitHub Pages path and verified OTHRYS domain are allowed.",
    );
  }
  return requested;
}
