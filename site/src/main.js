import "./styles.css";
import { createGameTracker, getExperimentAssignment, getPlayReport, recordGalleryView, resetPlayReport } from "./play-intelligence.js";
import { startSkyhook } from "../../games/skyhook/skyhook.js";
import { startLastcall } from "../../games/lastcall/lastcall.js";
import { startEchoLantern } from "../../games/echo-lantern/echo-lantern.js";

const app = document.querySelector("#app");
const base = import.meta.env.BASE_URL;
const params = new URLSearchParams(window.location.search);

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
        <a href="#shelf">The shelf</a>
        <a href="#my-data">My data</a>
        <a href="#run-local">Run local</a>
      </nav>
    </header>
    <main>
      <section class="hero page-width" aria-labelledby="hero-title">
        <div class="hero-copy">
          <h1 id="hero-title">Phasebound</h1>
          <p class="hero-lede">Catch the packets that match your phase. Switch, dash, and stay alive for one more handoff.</p>
          <div class="hero-meta"><span>60 SEC RUN</span><span>SOLO</span><span>KEYBOARD + TOUCH</span></div>
          <a class="button button-primary" href="${base}?game=phasebound">Play Phasebound</a>
        </div>
        <div class="hero-art" aria-label="Live Phasebound game preview">
          <div id="shelf-preview-root"></div>
          <div class="art-caption">LIVE PREVIEW / PHASEBOUND</div>
        </div>
      </section>

      <section class="shelf page-width" id="shelf" aria-labelledby="shelf-title">
        <div class="section-intro">
          <div>
            <h2 id="shelf-title">Games</h2>
          </div>
          <p class="section-note">Three short browser games. Each one has a different trick.</p>
        </div>
        <article class="game-card">
          <div class="game-card-art" aria-label="Live Phasebound game preview">
            <div id="phasebound-card-preview-root"></div>
          </div>
          <div class="game-card-copy">
            <div class="card-kicker"><span>60 SEC RUN</span><span>KEYBOARD + TOUCH</span></div>
            <h3>Phasebound</h3>
            <p>Catch 18 packets before the relay goes quiet. Miss the color or meet a hazard and the run is over.</p>
            <div class="game-card-actions">
              <a class="button button-primary" href="${base}?game=phasebound">Play Phasebound</a>
              <span class="card-controls">WASD / SPACE / SHIFT</span>
            </div>
          </div>
        </article>
        <div class="game-shelf-grid">
          <article class="mini-game-card mini-game-card-skyhook">
            <div class="mini-game-art" aria-label="Live Skyhook game preview"><div id="skyhook-preview-root"></div><b>SKYHOOK</b></div>
            <div class="mini-game-copy"><h3>Skyhook</h3><p>Tap to climb. Thread the gap. The sky gets faster.</p><a class="text-link" href="${base}?game=skyhook">Play Skyhook</a></div>
          </article>
          <article class="mini-game-card mini-game-card-lastcall">
            <div class="mini-game-art" aria-label="Live Last Call game preview"><div id="lastcall-preview-root"></div><b>LAST CALL</b></div>
            <div class="mini-game-copy"><h3>Last Call</h3><p>Hit the pink window ten times before the clock turns on you.</p><a class="text-link" href="${base}?game=lastcall">Play Last Call</a></div>
          </article>
          <article class="mini-game-card mini-game-card-echo">
            <div class="mini-game-art" aria-label="Live Echo Lantern game preview"><div id="echo-lantern-preview-root"></div><b>ECHO LANTERN</b></div>
            <div class="mini-game-copy"><h3>Echo Lantern</h3><p>Send a pulse, chase the answer, and keep the dark from closing in.</p><a class="text-link" href="${base}?game=echo-lantern">Play Echo Lantern</a></div>
          </article>
        </div>
      </section>

      <section class="insights page-width" id="my-data" aria-labelledby="insights-title">
        <div class="insights-heading">
          <div>
            <h2 id="insights-title">Your runs</h2>
            <p>This stays on this browser. It helps decide what to tune next.</p>
          </div>
          <div class="insights-actions">
            <button class="button button-secondary" id="copy-play-report" type="button">Copy report</button>
            <button class="text-button" id="reset-play-report" type="button">Reset local data</button>
          </div>
        </div>
        <div id="play-report" class="play-report" aria-live="polite"></div>
      </section>

      <section class="run-local page-width" id="run-local" aria-labelledby="run-title">
        <div class="run-copy">
          <h2 id="run-title">Run locally</h2>
          <p>Install the shared repo and play the same games without a login.</p>
        </div>
        <div class="command-stack">
          ${commandBlock("1 / INSTALL", "git clone https://github.com/henryvn27/hvn-games.git\ncd hvn-games", "install")}
          ${commandBlock("2 / SET UP", "npm install\nnpm test", "setup")}
          ${commandBlock("3 / RUN", "npm run dev", "run")}
          <p class="command-next"><span>Next</span> Open the local URL Vite prints, then choose a game from the shelf.</p>
        </div>
      </section>
    </main>
    <footer class="site-footer page-width"><span>HVN games</span><span>Made to be played.</span></footer>
  `;
  setupCopyButtons();
  setupPlayInsights();
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
    if (!window.confirm("Reset local play history and experiment assignments?")) return;
    resetPlayReport();
    render();
  });
}

async function startShelfPreview() {
  const [{ startPhasebound }] = await Promise.all([import("../../games/phasebound/phasebound.js")]);
  startPhasebound({ parent: "shelf-preview-root", preview: true, pacing: "steady" });
  startPhasebound({ parent: "phasebound-card-preview-root", preview: true, pacing: "steady" });
  startSkyhook({ parent: "skyhook-preview-root", preview: true, pacing: "steady" });
  startLastcall({ parent: "lastcall-preview-root", preview: true, pacing: "steady" });
  startEchoLantern({ parent: "echo-lantern-preview-root", preview: true, pacing: "steady" });
}

async function renderArcadeGame(gameId) {
  const games = {
    skyhook: { title: "Skyhook", heading: "Keep your head up.", blurb: "Tap to climb through the gaps. The sky does not wait.", detail: "Space, W, or tap to rise · P to pause · R to restart", action: "Flap", stateLabel: "ALTITUDE", resourceLabel: "NERVE", start: startSkyhook },
    lastcall: { title: "Last Call", heading: "Do not miss the window.", blurb: "A tiny pink window. Ten chances. Make the clock nervous.", detail: "Space, Enter, or tap when the hand hits pink · R to restart", action: "Take shot", stateLabel: "WINDOW", resourceLabel: "FOCUS", start: startLastcall },
    "echo-lantern": { title: "Echo Lantern", heading: "Light only what answers.", blurb: "Send a pulse into the dark. Chase the beacon before its echo fades.", detail: "WASD or arrows to move · Space or tap to pulse · P to pause · R to restart", action: "Pulse", stateLabel: "ECHO", resourceLabel: "LANTERN", start: startEchoLantern },
  };
  const game = games[gameId];
  if (!game) return renderGallery();
  document.body.className = `game-page game-${gameId}`;
  app.innerHTML = `
    <header class="game-header page-width"><a class="wordmark" href="${base}">HVN games</a><a class="back-link" href="${base}">Back to shelf</a></header>
    <main class="game-main page-width"><div class="game-heading"><div><h1>${game.heading}</h1></div><p class="game-blurb">${game.blurb}</p></div>
      <section class="game-frame" aria-label="${game.title} game"><div class="hud" aria-live="polite"><div class="hud-group"><span class="hud-label">${game.stateLabel}</span><strong id="hud-phase">READY</strong></div><div class="hud-group"><span class="hud-label">SCORE</span><strong id="hud-score">0000</strong></div><div class="hud-group"><span class="hud-label">STREAK</span><strong id="hud-streak">0</strong></div><div class="hud-group hud-time"><span class="hud-label">TIME</span><strong id="hud-time">45</strong></div></div><div id="game-root"></div><div class="energy-wrap"><span class="hud-label">${game.resourceLabel}</span><div class="energy-track"><span id="hud-energy"></span></div></div><button id="game-action" class="game-action-button" type="button">${game.action}</button><div id="game-overlay" class="game-overlay"><h2 id="overlay-title">${game.title} is waiting.</h2><p id="overlay-copy">${game.blurb}</p><button id="overlay-action" class="button button-primary" type="button">Start run</button><p id="overlay-detail" class="overlay-detail">${game.detail}</p><div id="overlay-feedback" class="overlay-feedback" hidden><span>How did that run feel?</span><div><button type="button" data-feedback="keep">Keep it</button><button type="button" data-feedback="hard">Too hard</button><button type="button" data-feedback="skip">Not for me</button></div></div></div></section>
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
  const show = (nextTitle, nextCopy, nextDetail, nextLabel, nextAction) => { title.textContent = nextTitle; copy.textContent = nextCopy; detail.textContent = nextDetail; actionButton.textContent = nextLabel; actionButton.onclick = nextAction; feedback.hidden = true; overlay.classList.remove("is-hidden"); };
  const update = (state) => {
    if (state.mode === "active" && previousMode !== "active") tracker.start();
    if (state.mode === "result" && previousMode !== "result") tracker.finish(state);
    document.querySelector("#hud-phase").textContent = state.phase.toUpperCase();
    document.querySelector("#hud-score").textContent = String(state.score).padStart(4, "0");
    document.querySelector("#hud-streak").textContent = String(state.streak);
    document.querySelector("#hud-time").textContent = String(Math.max(0, Math.ceil(state.timeLeft))).padStart(2, "0");
    document.querySelector("#hud-energy").style.transform = `scaleX(${Math.max(0, state.energy) / 100})`;
    frame.classList.toggle("is-active", state.mode === "active");
    gameAction.hidden = state.mode !== "active";
    if (state.mode === "active") overlay.classList.add("is-hidden");
    if (state.mode === "pause") show("Catch your breath.", "The run is paused. Your score is safe.", "Press P or choose resume to return to the game.", "Resume run", () => api.resume?.());
    if (state.mode === "result") { const won = state.result === "won"; show(won ? "That was clean." : "The window closed.", won ? `${state.score} points. You found the rhythm.` : `${state.score} points. One more run knows more than this one did.`, game.detail, "Run it again", () => api.start()); feedback.hidden = false; }
    previousMode = state.mode;
  };
  api = startGame({ parent: "game-root", onState: update, preview: false, pacing: experiment });
  actionButton.onclick = () => api.start();
  gameAction.onclick = () => api[gameId === "skyhook" ? "flap" : gameId === "lastcall" ? "shoot" : "light"]?.();
  for (const button of feedback.querySelectorAll("[data-feedback]")) button.addEventListener("click", () => { tracker.feedback(button.dataset.feedback); button.closest(".overlay-feedback").querySelectorAll("button").forEach((item) => { item.disabled = true; }); button.textContent = "Saved"; });
}

async function renderGame() {
  if (params.get("game") !== "phasebound") return renderArcadeGame(params.get("game"));
  document.body.className = "game-page";
  app.innerHTML = `
    <header class="game-header page-width">
      <a class="wordmark" href="${base}">HVN games</a>
      <a class="back-link" href="${base}">Back to shelf</a>
    </header>
    <main class="game-main page-width">
      <div class="game-heading">
        <div><h1>Catch the right signal.</h1></div>
        <p class="game-blurb">The red ones are not a metaphor. Switch, dash, and see how long your nerve lasts.</p>
      </div>
      <section class="game-frame" aria-label="Phasebound game">
        <div class="hud" aria-live="polite">
          <div class="hud-group"><span class="hud-label">PHASE</span><strong id="hud-phase">CYAN</strong></div>
          <div class="hud-group"><span class="hud-label">SCORE</span><strong id="hud-score">0000</strong></div>
          <div class="hud-group"><span class="hud-label">STREAK</span><strong id="hud-streak">0</strong></div>
          <div class="hud-group hud-time"><span class="hud-label">TIME</span><strong id="hud-time">60</strong></div>
        </div>
        <div id="game-root"></div>
        <div class="energy-wrap"><span class="hud-label">SIGNAL</span><div class="energy-track"><span id="hud-energy"></span></div></div>
        <div id="game-overlay" class="game-overlay">
          <h2 id="overlay-title">The relay is live.</h2>
          <p id="overlay-copy">Catch the packets that match your phase. Switch with Space, dash with Shift, and do not hug the red.</p>
          <button id="overlay-action" class="button button-primary" type="button">Start run</button>
          <p id="overlay-detail" class="overlay-detail">WASD or arrows to move · P to pause · R to restart</p>
          <div id="overlay-feedback" class="overlay-feedback" hidden>
            <span>How did that run feel?</span>
            <div><button type="button" data-feedback="keep">Keep it</button><button type="button" data-feedback="hard">Too hard</button><button type="button" data-feedback="skip">Not for me</button></div>
          </div>
        </div>
        <div class="touch-controls" aria-label="Touch controls">
          <div class="touch-pad"><button type="button" data-input="up" aria-label="Move up">↑</button><button type="button" data-input="left" aria-label="Move left">←</button><button type="button" data-input="down" aria-label="Move down">↓</button><button type="button" data-input="right" aria-label="Move right">→</button></div>
          <div class="touch-actions"><button type="button" data-input="phase" aria-label="Switch phase">Phase</button><button type="button" data-input="dash" aria-label="Dash">Dash</button></div>
        </div>
      </section>
      <div class="game-notes"><span><b>Move</b> WASD / arrows</span><span><b>Switch</b> Space</span><span><b>Dash</b> Shift</span><span><b>Pause</b> P</span></div>
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
    action = next;
    overlayFeedback.hidden = true;
    overlay.classList.remove("is-hidden");
  }

  function updateHud(state) {
    document.querySelector("#hud-phase").textContent = state.phase.toUpperCase();
    document.querySelector("#hud-phase").className = `phase-${state.phase}`;
    document.querySelector("#hud-score").textContent = String(state.score).padStart(4, "0");
    document.querySelector("#hud-streak").textContent = String(state.streak);
    document.querySelector("#hud-time").textContent = String(Math.max(0, Math.ceil(state.timeLeft))).padStart(2, "0");
    document.querySelector("#hud-energy").style.transform = `scaleX(${Math.max(0, state.energy) / 100})`;
  }

  api = startPhasebound({
    parent: "game-root",
    onState: (state) => {
      if (state.mode === "active" && previousMode !== "active") tracker.start();
      if (state.mode === "result" && previousMode !== "result") tracker.finish(state);
      updateHud(state);
      frame.classList.toggle("is-active", state.mode === "active");
      if (state.mode === "active") overlay.classList.add("is-hidden");
      if (state.mode === "pause") {
        showOverlay({ title: "Hold the line.", copy: "The relay is paused. Your current run is safe.", detail: "Press P or choose resume to return to the field.", label: "Resume run", next: () => api.resume() });
      }
      if (state.mode === "result") {
        const won = state.result === "won";
        showOverlay({ title: won ? "You made the handoff." : "The relay went quiet.", copy: won ? `${state.packets} packets delivered with a score of ${state.score}.` : `${state.packets} packets delivered. The next run starts clean.`, detail: won ? "Try to beat your streak, then take the long route." : "The field gets readable once you stop chasing every packet.", label: "Run it again", next: () => api.start() });
        overlayFeedback.hidden = false;
      }
      previousMode = state.mode;
    },
    pacing: experiment,
  });

  overlayAction.addEventListener("click", () => { action(); });
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
