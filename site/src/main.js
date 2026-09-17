import "./styles.css";
import { createGameTracker, getExperimentAssignment, getLeaderboard, getPlayReport, getPlayerName, recordGalleryView, recordLeaderboardScore, resetPlayReport, setPlayerName } from "./play-intelligence.js";
import { startSkyhook } from "../../games/skyhook/skyhook.js";
import { startLastcall } from "../../games/lastcall/lastcall.js";
import { startEchoLantern } from "../../games/echo-lantern/echo-lantern.js";

const app = document.querySelector("#app");
const base = import.meta.env.BASE_URL;
const params = new URLSearchParams(window.location.search);
const LEADERBOARD_GAME = "phasebound";

if (params.get("game")) {
  renderGame();
} else {
  renderGallery();
}

function renderGallery() {
  document.body.className = "gallery-page";
  recordGalleryView();
  app.innerHTML = `
    <header class="site-header page-width">
      <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="#leaderboard">scores</a>
        <a href="#history">history</a>
      </nav>
    </header>
    <main>
      <section class="phasebound-home page-width" aria-labelledby="hero-title">
        <div class="phasebound-home-copy">
          <p class="eyebrow">HVN games / 01</p>
          <h1 id="hero-title">Phasebound</h1>
          <p class="phasebound-rule">Grab the cyan dots. Don’t touch the red ones.</p>
          <a class="button button-primary" href="${base}?game=phasebound">play</a>
          <p class="made-note">made for a quick break<br>keyboard or touch</p>
        </div>
        <div class="phasebound-home-art" aria-label="Live Phasebound game preview">
          <div id="phasebound-card-preview-root"></div>
          <span class="art-caption">phasebound / live</span>
        </div>
      </section>

      <section class="phasebound-strip page-width" aria-label="Phasebound controls">
        <span><b>keys</b> WASD / arrows</span><span><b>phase</b> Space</span><span><b>dash</b> Shift</span><span><b>pause</b> P</span>
        <span class="bench-note">the other games are on the bench for now.</span>
      </section>

      <section class="leaderboard-section page-width" id="leaderboard" aria-labelledby="leaderboard-title">
        <div class="leaderboard-heading">
          <p class="eyebrow">saved on this browser</p>
          <h2 id="leaderboard-title">who got far?</h2>
          <p>Local Phasebound scores. Not a real leaderboard. Just this browser.</p>
        </div>
        <div class="leaderboard-panel">
          <form id="leaderboard-name-form" class="name-form">
            <label for="leaderboard-name">Name</label>
            <div><input id="leaderboard-name" name="name" maxlength="16" autocomplete="nickname"><button class="button button-secondary" type="submit">Save</button></div>
          </form>
          <div id="leaderboard-list" aria-live="polite"></div>
        </div>
      </section>

      <section class="history page-width" id="history" aria-labelledby="history-title">
        <div class="history-heading">
          <div>
            <h2 id="history-title">history</h2>
            <p>A tiny record of what got played here.</p>
          </div>
          <div class="insights-actions">
            <button class="button button-secondary" id="copy-play-report" type="button">copy</button>
            <button class="text-button" id="reset-play-report" type="button">clear it</button>
          </div>
        </div>
        <div id="play-report" class="play-report" aria-live="polite"></div>
      </section>

      <section class="developer-note page-width" id="details" aria-labelledby="details-title">
        <details>
          <summary id="details-title">want to poke at it?</summary>
          <div class="developer-note-body">
            <p>Install the repo if you want to change a game.</p>
            <div class="command-stack">
              ${commandBlock("INSTALL", "git clone https://github.com/henryvn27/hvn-games.git\ncd hvn-games", "install")}
              ${commandBlock("CHECK", "npm install\nnpm test", "setup")}
              ${commandBlock("RUN", "npm run dev", "run")}
            </div>
          </div>
        </details>
      </section>
    </main>
    <footer class="site-footer page-width"><span>HVN games</span><span>phasebound for now</span></footer>
  `;
  setupCopyButtons();
  setupPlayInsights();
  setupLeaderboard();
  startShelfPreview();
}

function commandBlock(label, command, id) {
  return `<div class="command-block"><div class="command-label">${label}</div><div class="command-row"><code id="command-${id}">${command}</code><button class="copy-button" type="button" data-copy="command-${id}">Copy</button></div></div>`;
}

function setupCopyButtons() {
  for (const button of document.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      const code = document.getElementById(button.dataset.copy);
      await copyText(code.textContent);
      const original = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = original; }, 1200);
    });
  }
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

function setupPlayInsights() {
  const report = document.querySelector("#play-report");
  const copyButton = document.querySelector("#copy-play-report");
  const resetButton = document.querySelector("#reset-play-report");
  const render = () => {
    const data = getPlayReport();
    if (!data.games.length) {
      report.innerHTML = `<p class="insights-empty">No runs recorded yet. Pick a game and the shelf will remember the useful bits locally.</p>`;
      return;
    }
    const gameRows = data.games.map((game) => {
      const label = game.gameId.replaceAll("-", " ");
      const favorite = data.favorite === game.gameId ? `<span class="insight-badge">Most played</span>` : "";
      const runs = `${game.starts} start${game.starts === 1 ? "" : "s"} · ${game.minutes} min · ${game.wins} win${game.wins === 1 ? "" : "s"}`;
      return `<div class="insight-row"><div><strong>${label}</strong><span>${runs}</span></div>${favorite}</div>`;
    }).join("");
    const experimentRows = data.experiments.flatMap((experiment) => experiment.variants.map((variant) => `
      <div class="experiment-row"><span>${experiment.experimentId} / ${variant.variant}</span><span>${variant.starts} start${variant.starts === 1 ? "" : "s"} · ${variant.wins} win${variant.wins === 1 ? "" : "s"}</span></div>
    `)).join("");
    report.innerHTML = `${gameRows}${experimentRows ? `<div class="experiment-report"><div class="report-label">LOCAL TEST GROUPS</div>${experimentRows}</div>` : ""}`;
  };
  render();
  copyButton.addEventListener("click", async () => {
    const original = copyButton.textContent;
    const copied = await copyText(JSON.stringify(getPlayReport(), null, 2));
    copyButton.textContent = copied ? "Copied" : "Copy failed";
    window.setTimeout(() => { copyButton.textContent = original; }, 1400);
  });
  resetButton.addEventListener("click", () => {
    if (!window.confirm("Reset local history, scores, and experiment assignments?")) return;
    resetPlayReport();
    render();
  });
}

function renderLeaderboard(node, entries = getLeaderboard(LEADERBOARD_GAME)) {
  node.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "leaderboard-empty";
    empty.textContent = "No scores yet. Play Phasebound and put one here.";
    node.append(empty);
    return;
  }
  const list = document.createElement("ol");
  list.className = "leaderboard-list";
  entries.forEach((entry, index) => {
    const row = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("strong");
    name.textContent = entry.name;
    const score = document.createElement("b");
    score.textContent = String(entry.score);
    row.append(rank, name, score);
    list.append(row);
  });
  node.append(list);
}

function setupLeaderboard() {
  const form = document.querySelector("#leaderboard-name-form");
  const input = document.querySelector("#leaderboard-name");
  const node = document.querySelector("#leaderboard-list");
  if (!form || !input || !node) return;
  input.value = getPlayerName();
  renderLeaderboard(node);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    input.value = setPlayerName(input.value);
    const button = form.querySelector("button");
    button.textContent = "Saved";
    window.setTimeout(() => { button.textContent = "Save"; }, 1000);
  });
}

function beginCountdown({ overlay, title, copy, detail, actionButton, feedback, message = "Match the color.", next }) {
  const countdownId = String(Date.now());
  overlay.dataset.countdownId = countdownId;
  overlay.classList.remove("is-hidden");
  overlay.classList.add("is-countdown");
  actionButton.hidden = true;
  feedback.hidden = true;
  let step = 3;
  const tick = () => {
    if (overlay.dataset.countdownId !== countdownId) return;
    title.textContent = step > 0 ? String(step) : "GO";
    copy.textContent = step > 0 ? "Get ready." : message;
    detail.textContent = step > 0 ? "" : detail.dataset.controls || "";
    if (step === 0) {
      window.setTimeout(() => {
        if (overlay.dataset.countdownId !== countdownId) return;
        overlay.classList.remove("is-countdown");
        next();
      }, 320);
      return;
    }
    step -= 1;
    window.setTimeout(tick, 620);
  };
  tick();
}

async function startShelfPreview() {
  const [{ startPhasebound }] = await Promise.all([import("../../games/phasebound/phasebound.js")]);
  startPhasebound({ parent: "phasebound-card-preview-root", preview: true, pacing: "steady" });
}

function formatSeconds(value) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

async function renderArcadeGame(gameId) {
  const games = {
    skyhook: {
      title: "Skyhook",
      heading: "Do not hit the floor.",
      blurb: "Tap to climb. Miss a gap and the run ends.",
      detail: "Space, W, or tap to rise · P to pause · R to restart",
      action: "Flap",
      start: startSkyhook,
      hud: [
        { id: "primary", label: "GATES", format: (state) => String(state.score).padStart(2, "0") },
        { id: "secondary", label: "CHAIN", format: (state) => String(state.streak).padStart(2, "0") },
        { id: "tertiary", label: "FLIGHT", format: (state) => formatSeconds(state.flightTime) },
      ],
      pause: { title: "Paused.", copy: "Your gate count is safe.", detail: "Press P or choose resume." },
      result: (state) => ({ title: "You hit the floor.", copy: `${state.score} gates in ${formatSeconds(state.flightTime)}.`, detail: "Run it again if you want." }),
      countdownCopy: "Tap to climb.",
    },
    lastcall: {
      title: "Last Call",
      heading: "Wait for pink.",
      blurb: "Ten shots. Press when the hand crosses the small pink mark.",
      detail: "Space, Enter, or tap when the hand hits pink · P to pause · R to restart",
      action: "Take shot",
      start: startLastcall,
      hud: [
        { id: "primary", label: "HITS", format: (state) => `${state.hits}/${state.target}` },
        { id: "secondary", label: "SHOT", format: (state) => `${state.shots}/${state.target}` },
        { id: "tertiary", label: "ACCURACY", format: (state) => state.shots ? `${Math.round((state.hits / state.shots) * 100)}%` : "--" },
      ],
      pause: { title: "Paused.", copy: "Your remaining shots are safe.", detail: "Press P or choose resume." },
      result: (state) => ({ title: state.result === "won" ? "Nice timing." : "Not quite.", copy: `${state.hits} of ${state.target} shots landed.`, detail: "Try again and wait a little longer." }),
      countdownCopy: "Wait for pink.",
    },
    "echo-lantern": {
      title: "Echo Lantern",
      heading: "Find the light.",
      blurb: "Send a pulse, then move to the beacon before it disappears.",
      detail: "WASD or arrows to move · Space or tap to pulse · P or Pause to pause · R to restart",
      action: "Pulse",
      start: startEchoLantern,
      hud: [
        { id: "primary", label: "BEACONS", format: (state) => `${state.packets}/${state.target}` },
        { id: "secondary", label: "CHAIN", format: (state) => String(state.streak).padStart(2, "0") },
        { id: "tertiary", label: "CLOCK", format: (state) => formatSeconds(state.timeLeft) },
      ],
      resource: "LANTERN",
      pause: { title: "Paused.", copy: "Your beacon count is safe.", detail: "Press P or choose resume." },
      result: (state) => ({ title: state.result === "won" ? "All lights found." : "The light went out.", copy: `${state.packets} beacons found.`, detail: "Try again and keep moving." }),
      countdownCopy: "Pulse, then move.",
    },
  };
  const game = games[gameId];
  if (!game) return renderGallery();
  document.body.className = `game-page game-${gameId}`;
  app.innerHTML = `
    <header class="game-header page-width"><a class="wordmark" href="${base}">HVN games</a><a class="back-link" href="${base}">Back to shelf</a></header>
    <main class="game-main page-width"><div class="game-heading"><div><h1>${game.heading}</h1></div><p class="game-blurb">${game.blurb}</p></div>
      <section class="game-frame" data-game-id="${gameId}" aria-label="${game.title} game"><div class="hud" aria-live="polite">${game.hud.map((metric) => `<div class="hud-group hud-${metric.id}"><span class="hud-label">${metric.label}</span><strong id="hud-${metric.id}">--</strong></div>`).join("")}</div><div id="game-root"></div>${game.resource ? `<div class="energy-wrap"><span class="hud-label">${game.resource}</span><div class="energy-track"><span id="hud-energy"></span></div></div>` : ""}<button id="game-action" class="game-action-button" type="button">${game.action}</button><div id="game-overlay" class="game-overlay"><h2 id="overlay-title">Ready?</h2><p id="overlay-copy">${game.blurb}</p><button id="overlay-action" class="button button-primary" type="button">Start</button><p id="overlay-detail" class="overlay-detail">${game.detail}</p><div id="overlay-feedback" class="overlay-feedback" hidden><span>How was it?</span><div><button type="button" data-feedback="keep">Keep it</button><button type="button" data-feedback="hard">Too hard</button><button type="button" data-feedback="easy">Too easy</button><button type="button" data-feedback="skip">Not for me</button></div></div></div>${gameId === "echo-lantern" ? `<div class="arcade-touch-controls" aria-label="Echo Lantern touch controls"><div class="arcade-touch-pad"><button type="button" data-touch-input="up" aria-label="Move up">↑</button><button type="button" data-touch-input="left" aria-label="Move left">←</button><button type="button" data-touch-input="down" aria-label="Move down">↓</button><button type="button" data-touch-input="right" aria-label="Move right">→</button></div><button class="arcade-pause-button" type="button" data-touch-input="pause">Pause</button></div>` : ""}</section>
      <div class="game-notes"><span><b>Action</b> ${game.action}</span><span><b>Restart</b> R</span><span><b>Pause</b> P</span></div>
    </main>`;
  const startGame = game.start;
  const overlay = document.querySelector("#game-overlay");
  const frame = document.querySelector(".game-frame");
  const title = document.querySelector("#overlay-title");
  const copy = document.querySelector("#overlay-copy");
  const detail = document.querySelector("#overlay-detail");
  const actionButton = document.querySelector("#overlay-action");
  const feedback = document.querySelector("#overlay-feedback");
  const gameAction = document.querySelector("#game-action");
  const experiment = getExperimentAssignment(gameId, "opening-load", ["steady", "busy"]);
  const tracker = createGameTracker(gameId, "opening-load", experiment);
  let api;
  let previousMode = "menu";
  const show = (nextTitle, nextCopy, nextDetail, nextLabel, nextAction) => { title.textContent = nextTitle; copy.textContent = nextCopy; detail.textContent = nextDetail; detail.dataset.controls = nextDetail; actionButton.textContent = nextLabel; actionButton.hidden = false; actionButton.onclick = nextAction; feedback.hidden = true; overlay.classList.remove("is-hidden", "is-countdown"); };
  const update = (state) => {
    if (state.mode === "active" && previousMode !== "active") tracker.start();
    if (state.mode === "result" && previousMode !== "result") tracker.finish(state);
    for (const metric of game.hud) document.querySelector(`#hud-${metric.id}`).textContent = metric.format(state);
    if (game.resource) document.querySelector("#hud-energy").style.transform = `scaleX(${Math.max(0, state.energy) / 100})`;
    frame.classList.toggle("is-active", state.mode === "active");
    gameAction.hidden = state.mode !== "active";
    if (state.mode === "active") overlay.classList.add("is-hidden");
    if (state.mode === "pause") show(game.pause.title, game.pause.copy, game.pause.detail, "Resume run", () => api.resume?.());
    if (state.mode === "result") { const result = game.result(state); show(result.title, result.copy, result.detail, "Run it again", () => beginCountdown({ overlay, title, copy, detail, actionButton, feedback, message: game.countdownCopy, next: () => api.start() })); feedback.hidden = false; }
    previousMode = state.mode;
  };
  api = startGame({ parent: "game-root", onState: update, preview: false, pacing: experiment });
  actionButton.onclick = () => beginCountdown({ overlay, title, copy, detail, actionButton, feedback, message: game.countdownCopy, next: () => api.start() });
  gameAction.onclick = () => api[gameId === "skyhook" ? "flap" : gameId === "lastcall" ? "shoot" : "light"]?.();
  for (const button of document.querySelectorAll("[data-touch-input]")) {
    const input = button.dataset.touchInput;
    if (input === "pause") {
      button.addEventListener("click", () => api.togglePause?.());
      continue;
    }
    const press = (event) => { event.preventDefault(); api.setTouchDirection?.(input, true); };
    const release = (event) => { event.preventDefault(); api.setTouchDirection?.(input, false); };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }
  for (const button of feedback.querySelectorAll("[data-feedback]")) button.addEventListener("click", () => { tracker.feedback(button.dataset.feedback); button.closest(".overlay-feedback").querySelectorAll("button").forEach((item) => { item.disabled = true; }); button.textContent = "Saved"; });
}

async function renderGame() {
  if (params.get("game") !== "phasebound") return renderArcadeGame(params.get("game"));
  document.body.className = "game-page game-phasebound";
  app.innerHTML = `
    <header class="game-header page-width">
      <a class="wordmark" href="${base}">HVN games</a>
      <a class="back-link" href="${base}">Back to shelf</a>
    </header>
    <main class="game-main page-width">
      <div class="game-heading">
        <div><p class="eyebrow">Phasebound</p><h1>Phasebound</h1></div>
        <p class="game-blurb">Grab cyan. Avoid red. It gets faster.</p>
      </div>
      <section class="game-frame" aria-label="Phasebound game">
        <div class="hud" aria-live="polite">
          <div class="hud-group"><span class="hud-label">PHASE</span><strong id="hud-phase">CYAN</strong></div>
          <div class="hud-group"><span class="hud-label">PACKETS</span><strong id="hud-packets">00</strong></div>
          <div class="hud-group"><span class="hud-label">HEAT</span><strong id="hud-heat">01</strong></div>
          <div class="hud-group"><span class="hud-label">SCORE</span><strong id="hud-score">0000</strong></div>
          <div class="hud-group hud-time"><span class="hud-label">DASH</span><strong id="hud-dash">READY</strong></div>
        </div>
        <div id="game-root"></div>
        <div class="energy-wrap"><span class="hud-label">SIGNAL</span><div class="energy-track"><span id="hud-energy"></span></div></div>
        <div id="game-overlay" class="game-overlay">
          <h2 id="overlay-title">Ready?</h2>
          <p id="overlay-copy">Grab cyan. Avoid red.</p>
          <button id="overlay-action" class="button button-primary" type="button">Start</button>
          <p id="overlay-detail" class="overlay-detail">WASD or arrows · Space changes phase · Shift dashes</p>
          <div id="overlay-feedback" class="overlay-feedback" hidden>
            <span>How was it?</span>
            <div><button type="button" data-feedback="keep">Keep it</button><button type="button" data-feedback="hard">Too hard</button><button type="button" data-feedback="easy">Too easy</button><button type="button" data-feedback="skip">Not for me</button></div>
          </div>
        </div>
        <div class="touch-controls" aria-label="Touch controls">
          <div class="touch-pad"><button type="button" data-input="up" aria-label="Up">↑</button><button type="button" data-input="left" aria-label="Left">←</button><button type="button" data-input="down" aria-label="Down">↓</button><button type="button" data-input="right" aria-label="Right">→</button></div>
          <div class="touch-actions"><button type="button" data-input="phase" aria-label="Change phase">Phase</button><button type="button" data-input="dash" aria-label="Dash">Dash</button></div>
        </div>
      </section>
      <div class="game-notes"><span><b>keys</b> WASD / arrows</span><span><b>phase</b> Space</span><span><b>dash</b> Shift</span><span><b>pause</b> P</span></div>
      <section class="route-leaderboard" aria-labelledby="route-leaderboard-title"><div><p class="eyebrow">saved on this browser</p><h2 id="route-leaderboard-title">scores</h2><p>Just local scores. Use the shelf to change your name.</p></div><div id="phasebound-leaderboard"></div></section>
    </main>
  `;

  const { startPhasebound } = await import("../../games/phasebound/phasebound.js");

  const overlay = document.querySelector("#game-overlay");
  const frame = document.querySelector(".game-frame");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");
  const overlayDetail = document.querySelector("#overlay-detail");
  const overlayAction = document.querySelector("#overlay-action");
  const overlayFeedback = document.querySelector("#overlay-feedback");
  const experiment = getExperimentAssignment("phasebound", "opening-load", ["steady", "busy"]);
  const tracker = createGameTracker("phasebound", "opening-load", experiment);
  let action = () => api.start();
  let api;
  let previousMode = "menu";

  function showOverlay({ title, copy, detail, label, next }) {
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    overlayDetail.textContent = detail;
    overlayAction.textContent = label;
    overlayAction.hidden = false;
    action = next;
    overlayFeedback.hidden = true;
    overlay.classList.remove("is-hidden", "is-countdown");
  }

  function updateHud(state) {
    document.querySelector("#hud-phase").textContent = state.phase.toUpperCase();
    document.querySelector("#hud-phase").className = `phase-${state.phase}`;
    document.querySelector("#hud-packets").textContent = String(state.packets).padStart(2, "0");
    document.querySelector("#hud-heat").textContent = String(state.heat).padStart(2, "0");
    document.querySelector("#hud-score").textContent = String(state.score).padStart(4, "0");
    document.querySelector("#hud-dash").textContent = state.dashCooldown > 0 ? `${state.dashCooldown.toFixed(1)}s` : "READY";
    document.querySelector("#hud-energy").style.transform = `scaleX(${Math.max(0, state.energy) / 100})`;
  }

  const startWithCountdown = () => beginCountdown({ overlay, title: overlayTitle, copy: overlayCopy, detail: overlayDetail, actionButton: overlayAction, feedback: overlayFeedback, message: "Grab cyan.", next: () => api.start() });

  api = startPhasebound({
    parent: "game-root",
    onState: (state) => {
      if (state.mode === "active" && previousMode !== "active") tracker.start();
      if (state.mode === "result" && previousMode !== "result") tracker.finish(state);
      updateHud(state);
      frame.classList.toggle("is-active", state.mode === "active");
      if (state.mode === "active") overlay.classList.add("is-hidden");
      if (state.mode === "pause") {
        showOverlay({ title: "Paused.", copy: "Your run is safe.", detail: "Press P or choose resume.", label: "Resume", next: () => api.resume() });
      }
      if (state.mode === "result" && previousMode !== "result") {
        const won = state.result === "won";
        recordLeaderboardScore("phasebound", state.score, state.packets, state.elapsed);
        renderLeaderboard(document.querySelector("#phasebound-leaderboard"));
        showOverlay({ title: won ? "Still playing?" : "Run over.", copy: `Score ${state.score}.`, detail: won ? "It gets faster." : "Try again if you want.", label: "Run it again", next: startWithCountdown });
        overlayFeedback.hidden = false;
      }
      previousMode = state.mode;
    },
    pacing: experiment,
  });
  renderLeaderboard(document.querySelector("#phasebound-leaderboard"));

  overlayAction.addEventListener("click", () => { if (overlayAction.hidden) return; startWithCountdown(); });
  for (const button of document.querySelectorAll("[data-input]")) {
    const input = button.dataset.input;
    const press = (event) => { event.preventDefault(); if (input === "phase") api.togglePhase(); else if (input === "dash") api.dash(); else api.setTouchDirection(input, true); };
    const release = (event) => { event.preventDefault(); if (!["phase", "dash"].includes(input)) api.setTouchDirection(input, false); };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }
  for (const button of document.querySelectorAll("[data-feedback]")) {
    button.addEventListener("click", () => {
      tracker.feedback(button.dataset.feedback);
      button.closest(".overlay-feedback").querySelectorAll("button").forEach((item) => { item.disabled = true; });
      button.textContent = "Saved";
    });
  }
}
