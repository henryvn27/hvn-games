import "./styles.css";
import { createGameTracker, getExperimentAssignment, getLeaderboard, getPlayReport, getPlayerName, recordGalleryView, recordLeaderboardScore, resetPlayReport, setPlayerName } from "./play-intelligence.js";
import orbitPolicyArtifact from "../../games/phasebound/orbit-policy.json";
import { renderGameShelf } from "./shelf.js";

const app = document.querySelector("#app");
const base = import.meta.env.BASE_URL;
const params = new URLSearchParams(window.location.search);
const ORBIT_ROUTE = "orbit";
const LEGACY_ORBIT_ROUTE = "phasebound";
const ORBIT_RL_ROUTE = "orbit-rl";
const SHELF_ROUTE = "shelf";
const TOWER_DEFENSE_ROUTE = "neon-bastion";
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
        <a href="${base}?game=${SHELF_ROUTE}">more games</a>
        <a href="${base}?game=${TOWER_DEFENSE_ROUTE}">defense</a>
        <a href="${base}?game=${ORBIT_ROUTE}">play</a>
      </nav>
    </header>
    <main>
      <section class="phasebound-home page-width" aria-labelledby="hero-title">
        <div class="phasebound-home-copy">
          <h1 id="hero-title">Orbit</h1>
          <p class="phasebound-rule">Match your color. Dodge the red planets.</p>
          <div class="hero-actions"><a class="button button-primary" href="${base}?game=${ORBIT_ROUTE}">play Orbit</a><a class="button button-secondary" href="${base}?game=${SHELF_ROUTE}">more games</a></div>
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
    <footer class="site-footer page-width"><span>HVN games</span><span>Orbit</span></footer>
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
    empty.textContent = "No scores yet. Play Orbit and put one here.";
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

async function renderRLWriteup() {
  document.body.className = "rl-page";
  app.innerHTML = `
    <header class="site-header page-width">
      <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
      <nav class="site-nav" aria-label="Page navigation"><a href="${base}?game=${ORBIT_ROUTE}">back to Orbit</a></nav>
    </header>
    <main class="rl-main page-width">
      <section class="rl-hero" aria-labelledby="rl-title">
        <p class="rl-kicker">Orbit / technical note 01</p>
        <h1 id="rl-title">Teaching Orbit<br><em>to keep going.</em></h1>
        <p class="rl-dek">A small policy trained in Python, then moved into the browser. It watches the same playfield you do and chooses where to steer next.</p>
      </section>

      <section class="rl-demo-layout" aria-labelledby="rl-demo-title">
        <div class="rl-demo-panel">
          <div class="rl-demo-heading"><div><p class="rl-label">live demo</p><h2 id="rl-demo-title">The model is playing.</h2></div><span id="rl-status" class="rl-status">running</span></div>
          <div class="rl-demo-frame" aria-label="Orbit reinforcement learning autoplay demo">
            <div id="rl-game-root"></div>
            <div class="rl-demo-hud"><span>score <b id="rl-score">0000</b></span><span id="rl-phase">phase 1</span></div>
          </div>
          <div class="rl-demo-footer"><p id="rl-demo-note">This is a live run, not a recorded video.</p><button id="rl-restart" class="button button-secondary" type="button">restart model</button></div>
        </div>
        <aside class="rl-facts" aria-label="Model facts">
          <p class="rl-label">model facts</p>
          <dl>
            <div><dt>policy</dt><dd>${orbitPolicyArtifact.name}</dd></div>
            <div><dt>training</dt><dd>${orbitPolicyArtifact.training.algorithm}</dd></div>
            <div><dt>input</dt><dd>player, dots, planets, energy</dd></div>
            <div><dt>output</dt><dd>steer, switch, dash</dd></div>
            <div><dt>inference</dt><dd>20 times / second</dd></div>
          </dl>
        </aside>
      </section>

      <article class="rl-paper" aria-label="Orbit reinforcement learning writeup">
        <section class="rl-paper-section rl-paper-intro"><p class="rl-label">abstract</p><p>The goal is simple: collect dots that match the triangle, stay away from the red planets, and keep the run alive. The agent gets the game state as numbers, turns those numbers into a short steering command, and repeats the loop many times per second.</p></section>
        <div class="rl-paper-grid">
          <section class="rl-paper-section"><p class="rl-label">01 / the problem</p><h2>Find a good dot before the orbit catches up.</h2><p>Orbit is awkward for a bot because the best path changes while the bot is moving. A dot can be close but unsafe. A planet can be far away but moving into the same space. The policy has to value progress and room to escape at the same time.</p></section>
          <section class="rl-paper-section"><p class="rl-label">02 / what it sees</p><h2>A small view of the board.</h2><p>Each observation contains the triangle position, every dot's position and color, every planet's position, the current color, energy, lives, score, and elapsed time. It does not read pixels or click the page.</p></section>
          <section class="rl-paper-section"><p class="rl-label">03 / what it can do</p><h2>Continuous steering, two useful buttons.</h2><p>The policy outputs a direction between left/right and up/down. It can also switch color or spend energy on a dash. A light safety filter adds space around nearby planets so the movement stays fluid instead of snapping between waypoints.</p></section>
          <section class="rl-paper-section"><p class="rl-label">04 / training</p><h2>Reward the run, not the pose.</h2><p>Python runs short episodes in a dependency-free simulator. Matching dots earn reward, a longer streak helps, and collisions cost reward. A cross-entropy search keeps the better policies and samples the next group around them. The resulting coefficients are exported as a small JSON artifact for the browser.</p></section>
          <section class="rl-paper-section"><p class="rl-label">05 / browser handoff</p><h2>The demo uses the real game loop.</h2><p>Once loaded, the model is given the same authoritative state that drives the human game. Phaser still owns collisions, score, phases, lives, and rendering. The policy only chooses the next action, so the demo remains a real run rather than a precomputed animation.</p></section>
          <section class="rl-paper-section"><p class="rl-label">06 / limits</p><h2>Good at this board. Not magic.</h2><p>The training simulator is intentionally smaller than the full game, so this is a research demo, not a claim that the agent has solved every possible Orbit layout. The score above is measured live in this browser session. Refreshing the page starts a new run.</p></section>
        </div>
      </article>
    </main>
  `;

  const { startPhasebound } = await import("../../games/phasebound/phasebound.js");
  const scoreNode = document.querySelector("#rl-score");
  const phaseNode = document.querySelector("#rl-phase");
  const statusNode = document.querySelector("#rl-status");
  const demoTitle = document.querySelector("#rl-demo-title");
  const noteNode = document.querySelector("#rl-demo-note");
  const restartButton = document.querySelector("#rl-restart");
  let bestScore = 0;
  let api;
  api = startPhasebound({
    parent: "rl-game-root",
    preview: true,
    autoplay: true,
    onState: (state) => {
      scoreNode.textContent = String(state.score).padStart(4, "0");
      phaseNode.textContent = state.phaseTurning ? "turning" : `phase ${state.phaseNumber}`;
      const isResult = state.mode === "result";
      const isPaused = state.mode === "pause";
      statusNode.textContent = isResult ? "run over" : isPaused ? "paused" : "running";
      demoTitle.textContent = isResult ? "Run over." : isPaused ? "Model paused." : "The model is playing.";
      if (state.score > bestScore) bestScore = state.score;
      noteNode.textContent = state.mode === "result" ? `Run ended at ${state.score}. Start another live run whenever you want.` : `live score ${state.score} · best this visit ${bestScore}`;
    },
  });
  restartButton.addEventListener("click", () => api.start());
}

async function renderGame() {
  if (params.get("game") === SHELF_ROUTE) return renderGameShelf({ app, base });
  if (params.get("game") === TOWER_DEFENSE_ROUTE) return renderTowerDefense();
  if (params.get("game") === ORBIT_RL_ROUTE) return renderRLWriteup();
  if (![ORBIT_ROUTE, LEGACY_ORBIT_ROUTE].includes(params.get("game"))) return renderGallery();
  document.body.className = "game-page game-phasebound";
  app.innerHTML = `
    <header class="game-header page-width">
      <a class="wordmark" href="${base}">HVN games</a>
      <nav class="site-nav" aria-label="Primary navigation"><a href="#route-leaderboard">scores</a><a href="${base}">home</a></nav>
    </header>
    <main class="game-main page-width">
      <div class="game-heading">
        <h1>Orbit</h1>
        <p class="game-blurb">Match your color. Dodge the red planets.</p>
      </div>
      <section class="game-frame" aria-label="Orbit game">
        <div class="hud" aria-live="polite">
          <div class="hud-group hud-score"><strong id="hud-score">0000</strong><span id="hud-phase" class="hud-phase">phase 1 · steady</span><span id="hud-lives" class="hud-lives" hidden></span></div>
          <div class="phase-control"><button id="phase-switch" class="phase-button" type="button" data-phase="cyan" aria-label="Switch color. Current color: cyan"><span aria-hidden="true"></span></button><span id="hud-streak" class="hud-streak">streak 0</span></div>
          <div class="game-actions"><button id="slow-button" class="slow-button" type="button" aria-pressed="false" aria-label="Turn slow mode on. It costs points">slow</button><button id="pause-button" class="pause-button" type="button" aria-label="Pause">Ⅱ</button></div>
        </div>
        <div id="game-root"></div>
        <div id="game-overlay" class="game-overlay">
          <div id="first-play-tutorial" class="first-play-tutorial" hidden>
            <p class="tutorial-kicker">try it once</p>
            <p id="tutorial-step" class="tutorial-step">lesson 1 of 4</p>
            <h2 id="tutorial-title">Move the triangle.</h2>
            <p id="tutorial-copy" class="tutorial-intro">Press WASD or an arrow key. Try moving once.</p>
            <div id="tutorial-demo" class="tutorial-demo" aria-live="polite">
              <span id="tutorial-status">waiting for movement</span>
            </div>
            <button id="tutorial-swatch" class="tutorial-swatch" type="button" hidden aria-label="Switch color in the practice lesson"><span aria-hidden="true"></span><b>tap to switch</b></button>
            <button id="tutorial-start" class="button button-primary" type="button" disabled>move to continue</button>
            <button id="tutorial-skip" class="text-button tutorial-skip" type="button">skip tutorial</button>
          </div>
          <h2 id="overlay-title">Ready?</h2>
          <p id="overlay-copy">Match your color. Dodge the red planets.</p>
          <button id="overlay-action" class="button button-primary" type="button">Start</button>
          <p id="overlay-detail" class="overlay-detail">move with WASD or arrows · square or Space changes color · slow costs points</p>
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
      <a class="button button-secondary rl-link" href="${base}?game=${ORBIT_RL_ROUTE}">reinforcement learning writeup</a>
    </main>
  `;

  const { startPhasebound } = await import("../../games/phasebound/phasebound.js");

  const overlay = document.querySelector("#game-overlay");
  const frame = document.querySelector(".game-frame");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");
  const overlayDetail = document.querySelector("#overlay-detail");
  const overlayAction = document.querySelector("#overlay-action");
  const hudPhase = document.querySelector("#hud-phase");
  const hudLives = document.querySelector("#hud-lives");
  const hudStreak = document.querySelector("#hud-streak");
  const firstPlayTutorial = document.querySelector("#first-play-tutorial");
  const tutorialStep = document.querySelector("#tutorial-step");
  const tutorialTitle = document.querySelector("#tutorial-title");
  const tutorialCopy = document.querySelector("#tutorial-copy");
  const tutorialStatus = document.querySelector("#tutorial-status");
  const tutorialSwatch = document.querySelector("#tutorial-swatch");
  const tutorialStart = document.querySelector("#tutorial-start");
  const tutorialSkip = document.querySelector("#tutorial-skip");
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
  const slowButton = document.querySelector("#slow-button");
  const experiment = getExperimentAssignment("phasebound", "opening-load", ["steady", "busy"]);
  const tracker = createGameTracker("phasebound", "opening-load", experiment);
  let action = () => api.start();
  let api;
  let previousMode = "menu";

  const tutorialStorageKey = "hvn-games:orbit-tutorial:v5";
  const hasSeenTutorial = () => {
    try {
      return window.localStorage.getItem(tutorialStorageKey) === "seen";
    } catch {
      return false;
    }
  };
  const markTutorialSeen = () => {
    try {
      window.localStorage.setItem(tutorialStorageKey, "seen");
    } catch {
      // The tutorial can show again when storage is unavailable.
    }
  };

  const tutorialLessons = [
    {
      title: "Move your triangle.",
      copy: "Press WASD or an arrow key to move. In the game, you steer this triangle around the field.",
      waiting: "move the triangle once",
      ready: "That is you. Use it to reach matching dots.",
      blocked: "move to continue",
      next: "next: match a color",
    },
    {
      title: "Match the dot's color.",
      copy: "Press Space, or tap the square. Your triangle changes color. Collect dots with the same color.",
      waiting: "change your color",
      ready: "Good. Now look for a dot that matches.",
      blocked: "change color to continue",
      next: "next: use a dash",
    },
    {
      title: "Dash when you need room.",
      copy: "Press Shift. The triangle surges forward for a moment. Use it to escape a red planet.",
      waiting: "press Shift once",
      ready: "That burst is your escape move.",
      blocked: "dash to continue",
      next: "next: play a run",
    },
    {
      title: "Collect matching dots.",
      copy: "Grab cyan or yellow dots that match your triangle. Red planets hurt. Pink stars give you another life.",
      waiting: "you have the basics",
      ready: "Matching dots raise your score. Red planets end the run.",
      blocked: "start the run",
      next: "start the run",
    },
  ];
  let tutorialActive = false;
  let tutorialLessonIndex = 0;
  let tutorialLessonReady = false;

  function renderTutorialLesson() {
    const lesson = tutorialLessons[tutorialLessonIndex];
    tutorialStep.textContent = `lesson ${tutorialLessonIndex + 1} of ${tutorialLessons.length}`;
    tutorialTitle.textContent = lesson.title;
    tutorialCopy.textContent = lesson.copy;
    tutorialStatus.textContent = tutorialLessonReady ? lesson.ready : lesson.waiting;
    tutorialStart.textContent = tutorialLessonReady ? lesson.next : lesson.blocked;
    tutorialStart.disabled = !tutorialLessonReady;
    tutorialSwatch.hidden = tutorialLessonIndex !== 1;
    tutorialSwatch.dataset.phase = tutorialLessonIndex === 1 ? "cyan" : "";
  }

  function finishTutorialLesson(message) {
    tutorialLessonReady = true;
    tutorialStatus.textContent = message;
    tutorialStart.disabled = false;
    tutorialStart.focus({ preventScroll: true });
  }

  function advanceTutorial() {
    if (!tutorialLessonReady) return;
    if (tutorialLessonIndex === tutorialLessons.length - 1) {
      startWithCountdown();
      return;
    }
    tutorialLessonIndex += 1;
    tutorialLessonReady = tutorialLessonIndex === tutorialLessons.length - 1;
    renderTutorialLesson();
  }

  function showTutorial() {
    tutorialActive = true;
    tutorialLessonIndex = 0;
    tutorialLessonReady = false;
    renderTutorialLesson();
    firstPlayTutorial.hidden = false;
    overlayTitle.hidden = true;
    overlayCopy.hidden = true;
    overlayAction.hidden = true;
    overlayDetail.hidden = true;
    scoreSave.hidden = true;
    overlay.classList.add("tutorial-open");
    overlay.classList.remove("is-hidden", "is-countdown");
  }

  function hideTutorial() {
    tutorialActive = false;
    firstPlayTutorial.hidden = true;
    overlay.classList.remove("tutorial-open");
    overlayTitle.hidden = false;
    overlayCopy.hidden = false;
    overlayAction.hidden = false;
    overlayDetail.hidden = false;
  }

  function showOverlay({ title, copy, detail, label, next }) {
    hideTutorial();
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    overlayDetail.textContent = detail;
    overlayAction.textContent = label;
    overlayAction.hidden = false;
    action = next;
    scoreSave.hidden = true;
    overlay.classList.remove("is-hidden", "is-countdown");
  }

  function skipTutorial() {
    markTutorialSeen();
    showOverlay({
      title: "Ready?",
      copy: "Match your color. Dodge the red planets.",
      detail: "move with WASD or arrows · square or Space changes color · slow costs points",
      label: "Start",
      next: startWithCountdown,
    });
  }

  let pendingScore = null;
  function showScoreSave(state) {
    pendingScore = { score: Math.max(0, Math.floor(state.score)), packets: state.packets, elapsed: state.elapsed };
    const savedName = getPlayerName();
    scoreSaveQuestion.textContent = savedName ? `saved as ${savedName}` : "add your initials or name once";
    scoreSaveName.value = savedName;
    scoreSaveError.textContent = "";
    scoreSaveStatus.textContent = "";
    scoreSaveButton.hidden = true;
    scoreSkipButton.hidden = true;
    scoreSaveForm.hidden = Boolean(savedName);
    scoreSave.hidden = false;
    if (savedName) {
      recordLeaderboardScore("phasebound", pendingScore.score, pendingScore.packets, pendingScore.elapsed);
      renderLeaderboard(document.querySelector("#phasebound-leaderboard"));
      scoreSaveStatus.textContent = "saved automatically.";
    } else {
      scoreSaveName.focus();
    }
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
    scoreSaveStatus.textContent = "saved automatically from now on.";
  }

  function updateHud(state) {
    const displayedScore = Math.max(0, Math.floor(state.score));
    document.querySelector("#hud-score").textContent = String(displayedScore).padStart(4, "0");
    hudPhase.textContent = state.phaseTurning ? "turning..." : state.phaseWarning ? "turning soon" : `phase ${state.phaseNumber} · ${state.phaseLabel}`;
    hudPhase.classList.toggle("is-warning", state.phaseWarning || state.phaseTurning);
    hudLives.hidden = state.lives < 1;
    hudLives.textContent = state.lives === 1 ? "1 extra life" : `${state.lives} extra lives`;
    hudStreak.textContent = `streak ${state.streak}`;
    phaseSwitch.dataset.phase = state.phase;
    tutorialSwatch.dataset.phase = state.phase;
    phaseSwitch.setAttribute("aria-label", `Switch color. Current color: ${state.phase}`);
    const slowRate = Math.max(0, Math.round(state.slowModeRate || 0));
    slowButton.textContent = state.slowMode ? `slow · −${slowRate}/s` : "slow";
    slowButton.classList.toggle("is-active", state.slowMode);
    slowButton.disabled = state.mode !== "active";
    slowButton.setAttribute("aria-pressed", String(state.slowMode));
    slowButton.setAttribute("aria-label", state.slowMode ? `Turn slow mode off. Losing about ${slowRate} points per second` : `Turn slow mode on. It costs about ${slowRate} points per second`);
    pauseButton.textContent = state.mode === "pause" ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-label", state.mode === "pause" ? "Resume" : "Pause");
  }

  const startWithCountdown = () => {
    tutorialActive = false;
    markTutorialSeen();
    hideTutorial();
    beginCountdown({ overlay, title: overlayTitle, copy: overlayCopy, detail: overlayDetail, actionButton: overlayAction, message: "Match your color.", next: () => api.start() });
  };

  api = startPhasebound({
    parent: "game-root",
    tutorial: !hasSeenTutorial(),
    onState: (state) => {
      if (state.mode === "active" && previousMode !== "active") tracker.start();
      if (state.mode === "result" && previousMode !== "result") tracker.finish(state);
      updateHud(state);
      frame.classList.toggle("is-active", state.mode === "active" || state.mode === "tutorial");
      if (state.mode === "active") overlay.classList.add("is-hidden");
      if (state.mode === "pause") {
        showOverlay({ title: "Paused.", copy: "Your run is safe.", detail: "Press P or choose resume.", label: "Resume", next: () => api.resume() });
      }
      if (state.mode === "result" && previousMode !== "result") {
        const won = state.result === "won";
        showOverlay({ title: won ? "Still playing?" : "Run over.", copy: `Score ${Math.max(0, Math.floor(state.score))}.`, detail: won ? "It gets faster." : "Try again if you want.", label: "Run it again", next: startWithCountdown });
        showScoreSave(state);
      }
      previousMode = state.mode;
    },
    pacing: experiment,
  });
  renderLeaderboard(document.querySelector("#phasebound-leaderboard"));

  overlayAction.addEventListener("click", () => { if (overlayAction.hidden) return; action(); });
  tutorialStart.addEventListener("click", advanceTutorial);
  tutorialSkip.addEventListener("click", skipTutorial);
  tutorialSwatch.addEventListener("click", () => {
    if (!tutorialActive || tutorialLessonIndex !== 1 || tutorialLessonReady) return;
    api.togglePhase();
    finishTutorialLesson(tutorialLessons[1].ready);
  });
  window.addEventListener("keydown", (event) => {
    if (!tutorialActive || event.repeat) return;
    const key = event.key.toLowerCase();
    if (tutorialLessonIndex === 0 && ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      finishTutorialLesson(tutorialLessons[0].ready);
    } else if (tutorialLessonIndex === 1 && event.code === "Space") {
      finishTutorialLesson(tutorialLessons[1].ready);
    } else if (tutorialLessonIndex === 2 && event.key === "Shift") {
      finishTutorialLesson(tutorialLessons[2].ready);
    }
  }, { capture: true });
  phaseSwitch.addEventListener("click", () => api.togglePhase());
  slowButton.addEventListener("click", () => api.toggleSlowMode());
  pauseButton.addEventListener("click", () => api.togglePause());
  scoreSaveForm.addEventListener("submit", (event) => { event.preventDefault(); savePendingScore(scoreSaveName.value); });
  if (!hasSeenTutorial()) showTutorial();
}

function renderTowerDefense() {
  document.body.className = "tower-defense-page";
  app.innerHTML = `<main id="tower-defense-root"><p class="tower-defense-loading">loading the board…</p></main>`;
  import("./tower-defense.js").then(({ startNeonBastion }) => {
    const game = startNeonBastion({ parent: "tower-defense-root", base });
    game.installTestHooks();
  });
}
