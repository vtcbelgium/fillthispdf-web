import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        en: resolve("index.html"),
        nl: resolve("nl/index.html"),
        fr: resolve("fr/index.html"),
      },
    },
  },
  test: { include: ["tests/**/*.test.ts"], setupFiles: ["tests/setup.ts"] },
});
