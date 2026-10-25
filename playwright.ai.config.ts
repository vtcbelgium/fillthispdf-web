import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: "**/ai.spec.ts",
  outputDir: "test-results-ai",
  use: { ...base.use, baseURL: "http://127.0.0.1:4174/fillthispdf-web/" },
  webServer: {
    command:
      "npm run build && npm run preview -- --port 4174 --strictPort --base /fillthispdf-web/",
    url: "http://127.0.0.1:4174/fillthispdf-web/",
    env: { VITE_AI_ENDPOINT: "https://ai.test/match" },
    reuseExistingServer: false,
  },
});
