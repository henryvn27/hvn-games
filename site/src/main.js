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
          <h1 id="hero-title">Hot Dot</h1>
          <p class="phasebound-rule">Grab cyan. Avoid red.</p>
          <a class="button button-primary" href="${base}?game=phasebound">play</a>
        </div>
      </section>

      <section class="leaderboard-section page-width" id="leaderboard" aria-labelledby="leaderboard-title">
        <div class="leaderboard-heading">
          <h2 id="leaderboard-title">high scores</h2>
          <p id="leaderboard-connection">Scores saved in this browser.</p>
        </div>
        <div class="leaderboard-panel">
          <form id="leaderboard-name-form" class="name-form">
            <label for="leaderboard-name">name or initials</label>
            <div><input id="leaderboard-name" name="name" maxlength="16" autocomplete="nickname" placeholder="ABC or your name"><button class="button button-secondary" type="submit">Save</button></div>
          </form>
          <div id="leaderboard-list" aria-live="polite"></div>
        </div>
      </section>
    </main>
    <footer class="site-footer page-width"><span>HVN games</span><span>Hot Dot</span></footer>
  `;
  setupCopyButtons();
  setupLeaderboard();
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

function beginCountdown({ overlay, title, copy, detail, actionButton, message = "Match the color.", next }) {
  const countdownId = String(Date.now());
  overlay.dataset.countdownId = countdownId;
  overlay.classList.remove("is-hidden");
  overlay.classList.add("is-countdown");
  actionButton.hidden = true;
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

async function renderGame() {
  if (params.get("game") !== "phasebound") return renderGallery();
  document.body.className = "game-page game-phasebound";
  app.innerHTML = `
    <header class="game-header page-width">
      <a class="wordmark" href="${base}">HVN games</a>
      <nav class="site-nav" aria-label="Primary navigation"><a href="#route-leaderboard">scores</a><a href="${base}">home</a></nav>
    </header>
    <main class="game-main page-width">
      <div class="game-heading">
        <h1>Hot Dot</h1>
        <p class="game-blurb">Grab cyan. Avoid red.</p>
      </div>
      <section class="game-frame" aria-label="Hot Dot game">
        <div class="hud" aria-live="polite">
          <div class="hud-group hud-score"><strong id="hud-score">0000</strong></div>
          <button id="phase-switch" class="phase-button" type="button" data-phase="cyan" aria-label="Switch color. Current color: cyan"><span aria-hidden="true"></span></button>
          <button id="pause-button" class="pause-button" type="button" aria-label="Pause">Ⅱ</button>
        </div>
        <div id="game-root"></div>
        <div id="game-overlay" class="game-overlay">
          <h2 id="overlay-title">Ready?</h2>
          <p id="overlay-copy">Grab cyan. Avoid red.</p>
          <button id="overlay-action" class="button button-primary" type="button">Start</button>
          <p id="overlay-detail" class="overlay-detail">move with WASD or arrows · tap the square or press Space</p>
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
      </section>
      <section class="route-leaderboard" id="route-leaderboard" aria-labelledby="route-leaderboard-title"><div><h2 id="route-leaderboard-title">high scores</h2><p>Scores saved in this browser.</p></div><div id="phasebound-leaderboard"></div></section>
    </main>
  `;

  const { startPhasebound } = await import("../../games/phasebound/phasebound.js");

  const overlay = document.querySelector("#game-overlay");
  const frame = document.querySelector(".game-frame");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");
  const overlayDetail = document.querySelector("#overlay-detail");
  const overlayAction = document.querySelector("#overlay-action");
  const phaseSwitch = document.querySelector("#phase-switch");
  const pauseButton = document.querySelector("#pause-button");
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
    document.querySelector("#hud-score").textContent = String(state.score).padStart(4, "0");
    phaseSwitch.dataset.phase = state.phase;
    phaseSwitch.setAttribute("aria-label", `Switch color. Current color: ${state.phase}`);
    pauseButton.textContent = state.mode === "pause" ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-label", state.mode === "pause" ? "Resume" : "Pause");
  }

  const startWithCountdown = () => beginCountdown({ overlay, title: overlayTitle, copy: overlayCopy, detail: overlayDetail, actionButton: overlayAction, message: "Grab cyan.", next: () => api.start() });

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
        showScoreSave(state);
      }
      previousMode = state.mode;
    },
    pacing: experiment,
  });
  renderLeaderboard(document.querySelector("#phasebound-leaderboard"));

  overlayAction.addEventListener("click", () => { if (overlayAction.hidden) return; action(); });
  phaseSwitch.addEventListener("click", () => api.togglePhase());
  pauseButton.addEventListener("click", () => api.togglePause());
  scoreSaveButton.addEventListener("click", () => {
    const savedName = getPlayerName();
    if (savedName) savePendingScore(savedName);
    else scoreSaveForm.hidden = false;
    if (!savedName) scoreSaveName.focus();
  });
  scoreSkipButton.addEventListener("click", () => { scoreSave.hidden = true; });
  scoreSaveForm.addEventListener("submit", (event) => { event.preventDefault(); savePendingScore(scoreSaveName.value); });
}
