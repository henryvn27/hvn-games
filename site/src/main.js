import "./styles.css";
import { createGameTracker, getExperimentAssignment, getLeaderboard, getPlayReport, getPlayerName, recordGalleryView, recordLeaderboardScore, resetPlayReport, setPlayerName } from "./play-intelligence.js";

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
        <a href="${base}?game=phasebound">play</a>
      </nav>
    </header>
    <main>
      <section class="phasebound-home page-width" aria-labelledby="hero-title">
        <div class="phasebound-home-copy">
          <p class="eyebrow">one game / 01</p>
          <h1 id="hero-title">Hot Dot</h1>
          <p class="phasebound-rule">Grab cyan. Miss red. It gets quicker.</p>
          <a class="button button-primary" href="${base}?game=phasebound">play it</a>
          <p class="made-note">made for a quick break<br>keyboard or touch</p>
        </div>
        <div class="phasebound-home-art" aria-label="Live Hot Dot game preview">
          <div class="preview-topline"><span>01 / 01</span><span>live run</span></div>
          <div id="phasebound-card-preview-root"></div>
          <div class="phasebound-legend" aria-label="Hot Dot rules"><span><i class="legend-dot legend-cyan"></i>cyan = good</span><span><i class="legend-dot legend-red"></i>red = bad</span><span>faster after each hit</span></div>
        </div>
      </section>

      <section class="phasebound-strip page-width" aria-label="Hot Dot controls">
        <span><b>keys</b> WASD / arrows</span><span><b>phase</b> Space</span><span><b>dash</b> Shift</span><span><b>pause</b> P</span>
        <span class="bench-note">a small one-game site.</span>
      </section>

      <section class="leaderboard-section page-width" id="leaderboard" aria-labelledby="leaderboard-title">
        <div class="leaderboard-heading">
          <p class="eyebrow">high scores</p>
          <h2 id="leaderboard-title">who got far?</h2>
          <p id="leaderboard-connection">This board stays in your browser for now.</p>
        </div>
        <div class="leaderboard-panel">
          <form id="leaderboard-name-form" class="name-form">
            <label for="leaderboard-name">your initials or name</label>
            <div><input id="leaderboard-name" name="name" maxlength="16" autocomplete="nickname" placeholder="ABC or your name"><button class="button button-secondary" type="submit">Save</button></div>
          </form>
          <div id="leaderboard-list" aria-live="polite"></div>
        </div>
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
    <footer class="site-footer page-width"><span>HVN games</span><span>hot dot / 01</span></footer>
  `;
  setupCopyButtons();
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
    empty.textContent = "No scores yet. Play Hot Dot and put one here.";
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

async function renderGame() {
  if (params.get("game") !== "phasebound") return renderGallery();
  document.body.className = "game-page game-phasebound";
  app.innerHTML = `
    <header class="game-header page-width">
      <a class="wordmark" href="${base}">HVN games</a>
      <a class="back-link" href="${base}">Back to shelf</a>
    </header>
    <main class="game-main page-width">
      <div class="game-heading">
        <div><p class="game-index">01 / hot dot</p><h1>Hot Dot</h1></div>
        <p class="game-blurb">cyan good. red bad. gets quicker.</p>
      </div>
      <section class="game-frame" aria-label="Hot Dot game">
        <div class="hud" aria-live="polite">
          <div class="hud-group"><span class="hud-label">phase</span><strong id="hud-phase">cyan</strong></div>
          <div class="hud-group"><span class="hud-label">hits</span><strong id="hud-packets">00</strong></div>
          <div class="hud-group"><span class="hud-label">heat</span><strong id="hud-heat">01</strong></div>
          <div class="hud-group"><span class="hud-label">score</span><strong id="hud-score">0000</strong></div>
          <div class="hud-group hud-time"><span class="hud-label">dash</span><strong id="hud-dash">ready</strong></div>
        </div>
        <div id="game-root"></div>
        <div class="energy-wrap"><span class="hud-label">signal</span><div class="energy-track"><span id="hud-energy"></span></div></div>
        <div id="game-overlay" class="game-overlay">
          <h2 id="overlay-title">Ready?</h2>
          <p id="overlay-copy">Grab cyan. Avoid red.</p>
          <button id="overlay-action" class="button button-primary" type="button">Start</button>
          <p id="overlay-detail" class="overlay-detail">move with WASD or arrows · Space changes phase · Shift dashes</p>
          <div id="overlay-feedback" class="overlay-feedback" hidden>
            <span>How was it?</span>
            <div><button type="button" data-feedback="keep">Keep it</button><button type="button" data-feedback="hard">Too hard</button><button type="button" data-feedback="easy">Too easy</button><button type="button" data-feedback="skip">Not for me</button></div>
          </div>
          <div id="score-save" class="score-save" hidden>
            <p id="score-save-question">Save this score?</p>
            <div class="score-save-actions"><button id="score-save-button" class="button button-primary" type="button">save it</button><button id="score-skip-button" class="text-button" type="button">not this time</button></div>
            <form id="score-save-form" class="score-save-form" hidden>
              <label for="score-save-name">your initials or name</label>
              <div><input id="score-save-name" maxlength="16" autocomplete="nickname" placeholder="ABC or your name"><button class="button button-secondary" type="submit">put it on the board</button></div>
              <p id="score-save-error" class="score-save-error" role="alert"></p>
            </form>
            <p id="score-save-status" class="score-save-status" aria-live="polite"></p>
          </div>
        </div>
        <div class="touch-controls" aria-label="Touch controls">
          <div class="touch-pad"><button type="button" data-input="up" aria-label="Up">↑</button><button type="button" data-input="left" aria-label="Left">←</button><button type="button" data-input="down" aria-label="Down">↓</button><button type="button" data-input="right" aria-label="Right">→</button></div>
          <div class="touch-actions"><button type="button" data-input="phase" aria-label="Change phase">Phase</button><button type="button" data-input="dash" aria-label="Dash">Dash</button></div>
        </div>
      </section>
      <div class="game-notes"><span><b>move</b> WASD / arrows</span><span><b>phase</b> Space</span><span><b>dash</b> Shift</span><span><b>pause</b> P</span></div>
      <section class="route-leaderboard" aria-labelledby="route-leaderboard-title"><div><p class="game-index">high scores</p><h2 id="route-leaderboard-title">scores</h2><p>Scores from this browser.</p></div><div id="phasebound-leaderboard"></div></section>
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
  const scoreSave = document.querySelector("#score-save");
  const scoreSaveQuestion = document.querySelector("#score-save-question");
  const scoreSaveButton = document.querySelector("#score-save-button");
  const scoreSkipButton = document.querySelector("#score-skip-button");
  const scoreSaveForm = document.querySelector("#score-save-form");
  const scoreSaveName = document.querySelector("#score-save-name");
  const scoreSaveError = document.querySelector("#score-save-error");
  const scoreSaveStatus = document.querySelector("#score-save-status");
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
    scoreSave.hidden = true;
    overlay.classList.remove("is-hidden", "is-countdown");
  }

  let pendingScore = null;
  function showScoreSave(state) {
    pendingScore = { score: state.score, packets: state.packets, elapsed: state.elapsed };
    const savedName = getPlayerName();
    scoreSaveQuestion.textContent = savedName ? `Save this as ${savedName}?` : "Save this score?";
    scoreSaveButton.textContent = savedName ? `save as ${savedName}` : "save it";
    scoreSaveName.value = savedName;
    scoreSaveError.textContent = "";
    scoreSaveStatus.textContent = "";
    scoreSaveForm.hidden = true;
    scoreSaveButton.hidden = false;
    scoreSkipButton.hidden = false;
    scoreSave.hidden = false;
  }

  function savePendingScore(value) {
    const name = setPlayerName(value);
    if (!name) {
      scoreSaveError.textContent = "Type three letters or a name first.";
      scoreSaveForm.hidden = false;
      scoreSaveName.focus();
      return;
    }
    recordLeaderboardScore("phasebound", pendingScore.score, pendingScore.packets, pendingScore.elapsed);
    renderLeaderboard(document.querySelector("#phasebound-leaderboard"));
    scoreSaveQuestion.textContent = `Saved as ${name}.`;
    scoreSaveButton.hidden = true;
    scoreSkipButton.hidden = true;
    scoreSaveForm.hidden = true;
    scoreSaveStatus.textContent = "next run, this name is already here.";
  }

  function updateHud(state) {
    document.querySelector("#hud-phase").textContent = state.phase;
    document.querySelector("#hud-phase").className = `phase-${state.phase}`;
    document.querySelector("#hud-packets").textContent = String(state.packets).padStart(2, "0");
    document.querySelector("#hud-heat").textContent = String(state.heat).padStart(2, "0");
    document.querySelector("#hud-score").textContent = String(state.score).padStart(4, "0");
    document.querySelector("#hud-dash").textContent = state.dashCooldown > 0 ? `${state.dashCooldown.toFixed(1)}s` : "ready";
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
        showOverlay({ title: won ? "Still playing?" : "Run over.", copy: `Score ${state.score}.`, detail: won ? "It gets faster." : "Try again if you want.", label: "Run it again", next: startWithCountdown });
        overlayFeedback.hidden = false;
        showScoreSave(state);
      }
      previousMode = state.mode;
    },
    pacing: experiment,
  });
  renderLeaderboard(document.querySelector("#phasebound-leaderboard"));

  overlayAction.addEventListener("click", () => { if (overlayAction.hidden) return; startWithCountdown(); });
  scoreSaveButton.addEventListener("click", () => {
    const savedName = getPlayerName();
    if (savedName) savePendingScore(savedName);
    else scoreSaveForm.hidden = false;
    if (!savedName) scoreSaveName.focus();
  });
  scoreSkipButton.addEventListener("click", () => { scoreSave.hidden = true; });
  scoreSaveForm.addEventListener("submit", (event) => { event.preventDefault(); savePendingScore(scoreSaveName.value); });
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
