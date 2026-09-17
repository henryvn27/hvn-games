import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const required = [
  "site/index.html",
  "site/src/main.js",
  "site/src/styles.css",
  "site/src/play-intelligence.js",
  "games/phasebound/phasebound.js",
  "games/skyhook/skyhook.js",
  "games/lastcall/lastcall.js",
  "games/echo-lantern/echo-lantern.js",
  "INTEGRATION.md",
  ".github/workflows/pages.yml",
];

for (const relative of required) {
  if (!existsSync(join(root, relative))) throw new Error(`Missing required path: ${relative}`);
}

const html = readFileSync(join(root, "site/index.html"), "utf8");
if (!html.includes("src/main.js")) throw new Error("Gallery entry point is not wired");

const main = readFileSync(join(root, "site/src/main.js"), "utf8");
for (const marker of ["phasebound", "skyhook", "lastcall", "echo-lantern", "copy", "play-intelligence", "overlay-feedback", "Too easy", "preview: true", "data-touch-input", "Pause", "leaderboard", "What are you playing?", "data-game-filter"]) {
  if (!main.includes(marker)) throw new Error(`Gallery is missing marker: ${marker}`);
}

const styles = readFileSync(join(root, "site/src/styles.css"), "utf8");
for (const marker of ["prefers-color-scheme", "prefers-reduced-motion"]) {
  if (!styles.includes(marker)) throw new Error(`Styles are missing marker: ${marker}`);
}

const game = readFileSync(join(root, "games/phasebound/phasebound.js"), "utf8");
for (const marker of ["startPhasebound", "keydown-SPACE", "keydown-SHIFT", "phase", "heat", "updateDifficulty", "this.endRun(\"lost\")"]) {
  if (!game.includes(marker)) throw new Error(`Game is missing marker: ${marker}`);
}
if (game.includes("timeLeft = 60") || game.includes("target = 18")) throw new Error("Phasebound still has a fixed timer or packet target");

for (const [relative, marker] of [["games/skyhook/skyhook.js", "startSkyhook"], ["games/lastcall/lastcall.js", "startLastcall"]]) {
  if (!readFileSync(join(root, relative), "utf8").includes(marker)) throw new Error(`${relative} is missing marker: ${marker}`);
}

const skyhook = readFileSync(join(root, "games/skyhook/skyhook.js"), "utf8");
for (const marker of ["flightTime", "this.endRun(\"lost\")"]) {
  if (!skyhook.includes(marker)) throw new Error(`Skyhook is missing marker: ${marker}`);
}

const lastcall = readFileSync(join(root, "games/lastcall/lastcall.js"), "utf8");
for (const marker of ["hits", "this.hits >= 7", "this.shots >= this.target"]) {
  if (!lastcall.includes(marker)) throw new Error(`Last Call is missing marker: ${marker}`);
}

const echo = readFileSync(join(root, "games/echo-lantern/echo-lantern.js"), "utf8");
for (const marker of ["startEchoLantern", "setTouchDirection", "togglePause", "keydown-SPACE"]) {
  if (!echo.includes(marker)) throw new Error(`Echo Lantern is missing marker: ${marker}`);
}

const workflow = readFileSync(join(root, ".github/workflows/pages.yml"), "utf8");
for (const marker of ["actions/upload-pages-artifact@v3", "actions/deploy-pages@v4"]) {
  if (!workflow.includes(marker)) throw new Error(`Pages workflow is missing marker: ${marker}`);
}

console.log(`Smoke checks passed (${required.length} required paths).`);
