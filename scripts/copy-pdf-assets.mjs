import { cpSync, mkdirSync } from "node:fs";
// Keep PDF.js character maps, fallback fonts and decoders on our own origin.
mkdirSync("public/pdfjs", { recursive: true });
for (const directory of ["cmaps", "standard_fonts", "wasm"]) {
  cpSync(`node_modules/pdfjs-dist/${directory}`, `public/pdfjs/${directory}`, {
    recursive: true,
  });
}
