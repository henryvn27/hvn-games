import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const required = [
  "site/index.html",
  "site/src/main.js",
  "site/src/ads.js",
  "site/public/privacy.html",
  "site/public/ads.txt",
  "site/src/styles.css",
  "site/src/play-intelligence.js",
  "site/src/shelf.js",
  "site/public/shelf/embed.html",
  "site/public/shelf/app.js",
  "site/public/shelf/LICENSE",
  "site/public/shelf/licenses/SCOWL.txt",
  "games/phasebound/phasebound.js",
  "games/comet/comet.js",
  "games/comet/README.md",
  "games/phasebound/orbit-policy.js",
  "games/phasebound/orbit-policy.json",
  "tools/orbit_rl/orbit_env.py",
  "tools/orbit_rl/train.py",
  "INTEGRATION.md",
  ".github/workflows/pages.yml",
];

for (const relative of required) {
  if (!existsSync(join(root, relative))) throw new Error(`Missing required path: ${relative}`);
}

const html = readFileSync(join(root, "site/index.html"), "utf8");
if (!html.includes("src/main.js")) throw new Error("Gallery entry point is not wired");
if (!html.includes('name="google-adsense-account" content="ca-pub-1123012671033143"')) throw new Error("AdSense ownership meta tag is missing");

const main = readFileSync(join(root, "site/src/main.js"), "utf8");
for (const marker of ["phasebound", "ORBIT_ROUTE", "ORBIT_RL_ROUTE", "SHELF_ROUTE", "TOWER_DEFENSE_ROUTE", "COMET_ROUTE", "renderRLWriteup", "renderGameShelf", "renderComet", "reinforcement learning writeup", "?game=${ORBIT_ROUTE}", "?game=${COMET_ROUTE}", "?game=${TOWER_DEFENSE_ROUTE}", "copy", "play-intelligence", "overlay-detail", "score-save", "saved automatically", "first-play-tutorial", "tutorial-step", "tutorial-title", "tutorial-copy", "tutorial-status", "tutorial-swatch", "tutorial-start", "tutorialActive", "hud-phase", "hud-lives", "hud-streak", "streak", "leaderboard", "Match your color", "A few more", "Neon Bastion", "Game Shelf", "all-games", "SHELF_GAMES", "shelfCard", "mountAdsConsent"]) {
  if (!main.includes(marker)) throw new Error(`Gallery is missing marker: ${marker}`);
}
const gallerySource = main.slice(0, main.indexOf("async function renderRLWriteup"));
if (gallerySource.includes("preview: true") || gallerySource.includes("phasebound-card-preview-root")) throw new Error("Landing page still mounts the game demo");

const styles = readFileSync(join(root, "site/src/styles.css"), "utf8");
for (const marker of ["prefers-color-scheme", "prefers-reduced-motion"]) {
  if (!styles.includes(marker)) throw new Error(`Styles are missing marker: ${marker}`);
}

const ads = readFileSync(join(root, "site/src/ads.js"), "utf8");
for (const marker of ["ca-pub-1123012671033143", "pauseAdRequests", "requestNonPersonalizedAds", "ads-consent", "data-ads-settings"]) {
  if (!ads.includes(marker)) throw new Error(`Ads integration is missing marker: ${marker}`);
}

const game = readFileSync(join(root, "games/phasebound/phasebound.js"), "utf8");
for (const marker of ["startPhasebound", "startTutorial", "options.tutorial", "options.autoplay", "applyAutoplay", "getPolicyObservation", "mode === \"tutorial\"", "keydown-SPACE", "keydown-SHIFT", "phaseNumber", "phaseLabel", "phaseWarning", "phaseTransition", "PHASE_TURN_SLOWDOWN_DURATION", "updatePhase", "ORBIT_FOCI", "drawOrbitMap", "updateCamera", "HIT_FREEZE_DURATION", "hitFreeze", "HAZARD_PLAYER_CLEARANCE", "HAZARD_SPAWN_GRACE", "positionHazardSafely", "resetHazardsForRun", "cameras.main.flash", "this.tweens.pauseAll()", "this.tweens.resumeAll()", "const size = hazard.size;", "heat", "lives", "EXTRA_LIFE_SCORE_STEP", "maybeSpawnLifePickup", "drawLifePickup", "updateDifficulty", "this.endRun(\"lost\")"]) {
  if (!game.includes(marker)) throw new Error(`Game is missing marker: ${marker}`);
}
if (game.includes("timeLeft = 60") || game.includes("target = 18")) throw new Error("Phasebound still has a fixed timer or packet target");

const comet = readFileSync(join(root, "games/comet/comet.js"), "utf8");
for (const marker of ["startComet", "Comet", "setDirection", "spawnFood", "maybeAddRock", "togglePause", "this.mode = \"result\"", "BOARD", "stepDelay", "this.snake"]) {
  if (!comet.includes(marker)) throw new Error(`Comet is missing marker: ${marker}`);
}

const shelf = readFileSync(join(root, "site/src/shelf.js"), "utf8");
for (const marker of ["golf", "snake", "dodger", "memory", "reaction", "word", "clicker", "flappy", "platform", "tic", "checkers", "trade", "embed.html", "Game Shelf source + license"]) {
  if (!shelf.includes(marker)) throw new Error(`Shelf is missing game or route marker: ${marker}`);
}

const workflow = readFileSync(join(root, ".github/workflows/pages.yml"), "utf8");
for (const marker of ["actions/upload-pages-artifact@v3", "actions/deploy-pages@v4"]) {
  if (!workflow.includes(marker)) throw new Error(`Pages workflow is missing marker: ${marker}`);
}

console.log(`Smoke checks passed (${required.length} required paths).`);
