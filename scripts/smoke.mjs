import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const required = [
  "site/index.html",
  "site/src/main.js",
  "site/src/styles.css",
  "site/src/play-intelligence.js",
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
for (const marker of ["phasebound", "copy", "play-intelligence", "overlay-detail", "score-save", "first-play-tutorial", "tutorial-start", "tutorial-dot-life", "hud-phase", "hud-lives", "leaderboard", "Grab cyan"]) {
  if (!main.includes(marker)) throw new Error(`Gallery is missing marker: ${marker}`);
}
if (main.includes("preview: true") || main.includes("phasebound-card-preview-root")) throw new Error("Landing page still mounts the game demo");

const styles = readFileSync(join(root, "site/src/styles.css"), "utf8");
for (const marker of ["prefers-color-scheme", "prefers-reduced-motion"]) {
  if (!styles.includes(marker)) throw new Error(`Styles are missing marker: ${marker}`);
}

const game = readFileSync(join(root, "games/phasebound/phasebound.js"), "utf8");
for (const marker of ["startPhasebound", "keydown-SPACE", "keydown-SHIFT", "phaseNumber", "phaseLabel", "phaseWarning", "phaseTransition", "PHASE_TURN_SLOWDOWN_DURATION", "updatePhase", "ORBIT_FOCI", "drawOrbitMap", "updateCamera", "HIT_FREEZE_DURATION", "hitFreeze", "cameras.main.flash", "this.tweens.pauseAll()", "this.tweens.resumeAll()", "heat", "lives", "EXTRA_LIFE_SCORE_STEP", "maybeSpawnLifePickup", "drawLifePickup", "updateDifficulty", "this.endRun(\"lost\")"]) {
  if (!game.includes(marker)) throw new Error(`Game is missing marker: ${marker}`);
}
if (game.includes("timeLeft = 60") || game.includes("target = 18")) throw new Error("Phasebound still has a fixed timer or packet target");

const workflow = readFileSync(join(root, ".github/workflows/pages.yml"), "utf8");
for (const marker of ["actions/upload-pages-artifact@v3", "actions/deploy-pages@v4"]) {
  if (!workflow.includes(marker)) throw new Error(`Pages workflow is missing marker: ${marker}`);
}

console.log(`Smoke checks passed (${required.length} required paths).`);
