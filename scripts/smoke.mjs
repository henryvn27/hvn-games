import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const required = [
  "site/index.html",
  "site/src/main.js",
  "site/src/styles.css",
  "games/phasebound/phasebound.js",
  "INTEGRATION.md",
  ".github/workflows/pages.yml",
];

for (const relative of required) {
  if (!existsSync(join(root, relative))) throw new Error(`Missing required path: ${relative}`);
}

const html = readFileSync(join(root, "site/index.html"), "utf8");
if (!html.includes("src/main.js")) throw new Error("Gallery entry point is not wired");

const main = readFileSync(join(root, "site/src/main.js"), "utf8");
for (const marker of ["phasebound", "copy"]) {
  if (!main.includes(marker)) throw new Error(`Gallery is missing marker: ${marker}`);
}

const styles = readFileSync(join(root, "site/src/styles.css"), "utf8");
for (const marker of ["prefers-color-scheme", "prefers-reduced-motion"]) {
  if (!styles.includes(marker)) throw new Error(`Styles are missing marker: ${marker}`);
}

const game = readFileSync(join(root, "games/phasebound/phasebound.js"), "utf8");
for (const marker of ["startPhasebound", "keydown-SPACE", "keydown-SHIFT", "phase"]) {
  if (!game.includes(marker)) throw new Error(`Game is missing marker: ${marker}`);
}

const workflow = readFileSync(join(root, ".github/workflows/pages.yml"), "utf8");
for (const marker of ["actions/upload-pages-artifact@v3", "actions/deploy-pages@v4"]) {
  if (!workflow.includes(marker)) throw new Error(`Pages workflow is missing marker: ${marker}`);
}

console.log(`Smoke checks passed (${required.length} required paths).`);
