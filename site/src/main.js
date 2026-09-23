import "./styles.css";
import { mountGoogleAdSlots, mountScoutlyFallback } from "./ads.js";
import { createGamePlaytimeTracker, createGameTracker, getExperimentAssignment, getLeaderboard, getPlayReport, getPlayerName, getPlaytimeSharing, recordGalleryView, recordLeaderboardScore, resetPlayReport, setPlaytimeSharing, setPlayerName } from "./play-intelligence.js";
import orbitPolicyArtifact from "../../games/phasebound/orbit-policy.json";
import { renderGameShelf, SHELF_GAMES } from "./shelf.js";
import { hiddenGames, hiddenGamesLabel, rankFeaturedGames } from "./featured-games.js";

const app = document.querySelector("#app");
const base = import.meta.env.BASE_URL;
const params = new URLSearchParams(window.location.search);
const ORBIT_ROUTE = "orbit";
const LEGACY_ORBIT_ROUTE = "phasebound";
const ORBIT_RL_ROUTE = "orbit-rl";
const SHELF_ROUTE = "shelf";
const TOWER_DEFENSE_ROUTE = "neon-bastion";
const COMET_ROUTE = "comet";
// Archived: keep the implementation and direct route available without listing it in the gallery.
const SPACE_WARS_ROUTE = "space-wars";
const DEFAULT_LEADERBOARD_GAME = "phasebound";
const LEADERBOARD_GAMES = [
  { id: "phasebound", label: "Orbit" },
  { id: "neon-bastion", label: "Space Tower Defense" },
  { id: "reaction", label: "Reaction Test" },
  { id: "2048", label: "2048" },
  { id: "dockside", label: "Dockside" },
  { id: "invaders", label: "Invaders" },
  { id: "hex-stack", label: "Hex Stack" },
  { id: "minesweeper", label: "Minesweeper" },
];

if (params.get("game")) {
  renderGame().finally(() => {
    mountGoogleAdSlots();
    mountScoutlyFallback();
    setupPlaytimePreferences();
  });
} else {
  renderGallery();
  mountGoogleAdSlots();
  mountScoutlyFallback();
  setupPlaytimePreferences();
}

function currentPlaytimeGameId() {
  const route = params.get("game");
  if (route === "orbit" || route === "phasebound") return "phasebound";
  if ([TOWER_DEFENSE_ROUTE, COMET_ROUTE, SPACE_WARS_ROUTE].includes(route)) return route;
  if (route === SHELF_ROUTE) return params.get("play") || "";
  return "";
}

function setupPlaytimePreferences() {
  if (document.querySelector("#playtime-sharing")) return;
  const root = document.createElement("aside");
  root.id = "playtime-sharing";
  root.className = "playtime-sharing page-width";
  root.setAttribute("aria-live", "polite");
  const gameId = currentPlaytimeGameId();
  let stop = () => {};
  const updateTracker = () => {
    stop();
    stop = () => {};
    if (getPlaytimeSharing() === "yes" && gameId) stop = createGamePlaytimeTracker(gameId);
  };
  const render = () => {
    const choice = getPlaytimeSharing();
    if (choice === "yes") {
      root.innerHTML = `<p>Playtime sharing is on. Only the game and seconds in this visible tab are counted. <a href="${base}privacy.html">Details</a></p><button type="button" data-playtime="off">Turn off</button>`;
    } else if (choice === "no") {
      root.innerHTML = `<p>Playtime sharing is off. The home page uses shared totals and game requests to pick its ten. <a href="${base}privacy.html">Details</a></p><button type="button" data-playtime="on">Turn on</button>`;
    } else {
      root.innerHTML = `<div><strong>Help choose the games on the home page.</strong><p>Share time spent with each game in this visible tab. No name, score, or account is sent; totals are grouped by game.</p><a href="${base}privacy.html">Details</a></div><div><button type="button" data-playtime="on">Share playtime</button><button type="button" data-playtime="off">No thanks</button></div>`;
    }
  };
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-playtime]");
    if (!button) return;
    if (!setPlaytimeSharing(button.dataset.playtime === "on")) {
      root.setAttribute("role", "status");
      root.textContent = "Your browser couldn’t save that choice.";
      return;
    }
    updateTracker();
    render();
  });
  document.body.append(root);
  updateTracker();
  render();
}

function renderGallery() {
  document.body.className = "gallery-page";
  recordGalleryView();
  const galleryGames = getGalleryGames();
  if (params.get("view") === "hidden-games") {
    renderHiddenGameCatalog(galleryGames);
    return;
  }
  const initial = rankFeaturedGames(galleryGames, []);
  app.innerHTML = `
    <header class="site-header page-width">
      <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="#leaderboard">scores</a>
        <a href="#featured-games">games</a>
        <a href="${base}?game=${SHELF_ROUTE}&amp;view=rewards">achievements</a>
      </nav>
    </header>
    <main>
      <section class="gallery-intro page-width" aria-labelledby="gallery-title">
        <div><h1 id="gallery-title">Games.</h1></div>
        <p>Ten on the home page. The rest are still here if you want them.</p>
      </section>
      <div class="google-ad-slot page-width" data-google-ad-slot="3947449400" aria-label="Advertisement"></div>

      <section class="gallery-shelf page-width" id="featured-games" aria-labelledby="featured-games-title">
        <div class="gallery-shelf-heading"><h2 id="featured-games-title">Featured games</h2><p id="featured-games-note">A starter set while playtime totals build.</p></div>
        <div class="shelf-grid" id="featured-games-grid" aria-label="Ten featured games">${initial.games.map((game, index) => galleryGameCard({ ...game, number: String(index + 1).padStart(2, "0") })).join("")}</div>
        <a class="hidden-games-link" href="${base}?view=hidden-games">${hiddenGamesLabel(galleryGames.length - initial.games.length)}</a>
      </section>
      <div class="google-ad-slot page-width" data-google-ad-slot="3947449400" aria-label="Advertisement"></div>

      <section class="leaderboard-section page-width" id="leaderboard" aria-labelledby="leaderboard-title">
        <div class="leaderboard-heading">
          <h2 id="leaderboard-title">high scores</h2>
          <p id="leaderboard-connection">Checking the shared board…</p>
        </div>
        <div class="leaderboard-panel">
          <label class="leaderboard-game-picker" for="leaderboard-game">game<select id="leaderboard-game" aria-label="Choose a game leaderboard">${LEADERBOARD_GAMES.map((game) => `<option value="${game.id}">${game.label}</option>`).join("")}</select></label>
          <form id="leaderboard-name-form" class="name-form">
            <label for="leaderboard-name">name or initials</label>
            <div><input id="leaderboard-name" name="name" maxlength="16" autocomplete="nickname" placeholder="ABC or your name"><button class="button button-secondary" type="submit">Save</button></div>
          </form>
          <p id="leaderboard-name-status" class="name-status" role="status" aria-live="polite"></p>
          <div id="leaderboard-list" aria-live="polite"></div>
        </div>
      </section>
      </main>
    <footer class="site-footer page-width"><span>HVN games</span><a href="${base}?view=hidden-games">browse hidden games</a></footer>
  `;
  setupCopyButtons();
  setupLeaderboard();
  void refreshFeaturedGames(galleryGames);
}

function getGalleryGames() {
  return [
    { id: "phasebound", number: "01", name: "Orbit", kind: "arcade", description: "Match your color. Dodge the red planets.", href: `${base}?game=${ORBIT_ROUTE}`, action: "play Orbit" },
    { id: "neon-bastion", number: "02", name: "Space Tower Defense", kind: "strategy", description: "Build a lunar relay defense, then stop the crawlers before they reach it.", href: `${base}?game=${TOWER_DEFENSE_ROUTE}`, action: "play" },
    ...SHELF_GAMES.map((game) => ({ ...game, number: String(Number(game.number) + 2).padStart(2, "0"), href: `${base}?game=${SHELF_ROUTE}&play=${game.id}`, action: `play ${game.name}` })),
  ];
}

async function refreshFeaturedGames(catalog) {
  const grid = document.querySelector("#featured-games-grid");
  const note = document.querySelector("#featured-games-note");
  if (!grid || !note) return;
  const online = window.HVNOnlineLeaderboard;
  if (!online?.configured || !online.getGameUsage) {
    note.textContent = "Waiting for shared playtime totals; this starter set stays available for now.";
    return;
  }
  const result = await online.getGameUsage();
  if (result.status !== "online") {
    note.textContent = "Couldn’t load shared playtime. Showing the starter set.";
    return;
  }
  const ranking = rankFeaturedGames(catalog, result.games, 10, result.requests);
  grid.innerHTML = ranking.games.map((game, index) => galleryGameCard({ ...game, number: String(index + 1).padStart(2, "0") })).join("");
  note.textContent = ranking.ranked
    ? "Sorted by playtime. A recent request can move a game onto the home page."
    : "No shared playtime yet. This starter set stays up while totals build.";
}

function renderHiddenGameCatalog(catalog) {
  document.body.className = "gallery-page hidden-games-page";
  const initial = rankFeaturedGames(catalog, []);
  const hidden = hiddenGames(catalog, initial.games);
  app.innerHTML = `
    <header class="site-header page-width"><a class="wordmark" href="${base}">HVN games</a><nav class="site-nav" aria-label="Game navigation"><a href="${base}">home</a></nav></header>
    <main class="hidden-games-main page-width">
      <div class="game-heading"><div><p class="game-index">${hidden.length} games</p><h1>Hidden games.</h1></div><p class="game-blurb">They’re off the home page, but the games still work. Pick one to play.</p></div>
      <div class="shelf-grid" id="hidden-games-grid" aria-label="Hidden games">${hidden.map((game) => galleryGameCard(game, { requestFeature: true })).join("")}</div>
      <p id="hidden-games-note" role="status" aria-live="polite"></p>
    </main>
    <footer class="site-footer page-width"><span>HVN games</span><a href="${base}">back to featured games</a></footer>
  `;
  const grid = document.querySelector("#hidden-games-grid");
  const status = document.querySelector("#hidden-games-note");
  grid?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-feature-request]");
    if (!button) return;
    button.disabled = true;
    button.textContent = "Sending…";
    const gameId = button.dataset.featureRequest;
    const response = await window.HVNOnlineLeaderboard?.requestGameFeature?.(gameId);
    if (response?.status === "already-requested") {
      button.textContent = "Already requested";
      status.textContent = "You’ve already requested that game.";
      return;
    }
    if (response?.status !== "online") {
      button.disabled = false;
      button.textContent = "Request a spot on the home page";
      status.textContent = "Couldn’t send the request. Check your connection and try again.";
      return;
    }
    const updated = await window.HVNOnlineLeaderboard.getGameUsage();
    if (updated.status !== "online") {
      status.textContent = "Request received. The featured games will update when totals load.";
      return;
    }
    const next = rankFeaturedGames(catalog, updated.games, 10, updated.requests);
    const isFeatured = next.games.some((game) => game.id === gameId);
    grid.innerHTML = hiddenGames(catalog, next.games).map((game) => galleryGameCard(game, { requestFeature: true })).join("");
    status.textContent = isFeatured ? "Added to the featured games on the home page." : "Request counted. It’ll move up as more players request it.";
  });
  const online = window.HVNOnlineLeaderboard;
  if (!online?.configured || !online.getGameUsage) return;
  void online.getGameUsage().then((result) => {
    if (result.status !== "online") return;
    const ranking = rankFeaturedGames(catalog, result.games, 10, result.requests);
    const other = hiddenGames(catalog, ranking.games);
    const grid = document.querySelector("#hidden-games-grid");
    const note = document.querySelector("#hidden-games-note");
    if (grid) grid.innerHTML = other.map((game) => galleryGameCard(game, { requestFeature: true })).join("");
    if (note) note.textContent = ranking.ranked ? "The home-page set updates as shared playtime changes." : "The home page will sort these after playtime totals build.";
  });
}

function galleryGameCard(game, options = {}) {
  return `<article class="shelf-card shelf-card-${game.kind}">
    <div class="shelf-card-top"><span>${game.number}</span><span>${game.kind}</span></div>
    <div><h2>${game.name}</h2><p>${game.description}</p></div>
    <div class="shelf-card-actions"><a class="button button-secondary" href="${game.href}">${game.action}</a>${options.requestFeature ? `<button class="hidden-game-request" type="button" data-feature-request="${game.id}">Request a spot on the home page</button>` : ""}</div>
  </article>`;
}

async function renderSpaceWars() {
  document.body.className = "game-page game-space-wars";
  app.innerHTML = `
    <header class="game-header page-width">
      <a class="wordmark" href="${base}">HVN games</a>
      <nav class="site-nav" aria-label="Primary navigation"><a href="${base}">all games</a><a href="${base}?game=${ORBIT_ROUTE}">Orbit</a></nav>
    </header>
    <main class="game-main page-width space-wars-main">
      <div class="game-heading space-wars-heading"><h1>Space Wars</h1><p class="game-blurb">Fly, shoot, and keep the base clear.</p></div>
      <section class="space-wars-frame" aria-label="Space Wars game">
        <div class="space-wars-hud" aria-live="polite">
          <div><span>shields</span><strong id="space-wars-shields">3</strong></div>
          <div><span>wave</span><strong id="space-wars-wave">1</strong></div>
          <div><span>score</span><strong id="space-wars-score">0000</strong></div>
          <button id="space-wars-pause" class="space-wars-pause" type="button" aria-label="Pause">Ⅱ</button>
        </div>
        <div id="space-wars-root"></div>
        <div class="space-wars-overlay" id="space-wars-overlay">
          <p class="space-wars-overline">Mars airspace</p>
          <h2 id="space-wars-overlay-title">Keep them out.</h2>
          <p id="space-wars-overlay-copy">Move your ship and shoot the red ships before they reach the base.</p>
          <button id="space-wars-overlay-action" class="button button-primary" type="button">start</button>
          <p class="space-wars-controls">WASD or arrows to move · Space or tap to shoot · P pauses</p>
        </div>
        <div class="space-wars-touch" aria-label="Touch movement controls">
          <button type="button" data-space-move="up" aria-label="Fly up">↑</button>
          <button type="button" data-space-move="left" aria-label="Fly left">←</button>
          <button type="button" data-space-move="down" aria-label="Fly down">↓</button>
          <button type="button" data-space-move="right" aria-label="Fly right">→</button>
        </div>
      </section>
      <p class="space-wars-note">A native HVN adaptation of the Space Wars demo from <a href="https://github.com/instructa/viber3d" rel="noreferrer">viber3d</a>, under its MIT license.</p>
    </main>
  `;

  const { startSpaceWars } = await import("../../games/spacewars/spacewars.js");
  const overlay = document.querySelector("#space-wars-overlay");
  const title = document.querySelector("#space-wars-overlay-title");
  const copy = document.querySelector("#space-wars-overlay-copy");
  const action = document.querySelector("#space-wars-overlay-action");
  const pause = document.querySelector("#space-wars-pause");
  const score = document.querySelector("#space-wars-score");
  const wave = document.querySelector("#space-wars-wave");
  const shields = document.querySelector("#space-wars-shields");
  let api;
  let nextAction = () => api.start();
  const showOverlay = ({ heading, message, label, callback }) => {
    title.textContent = heading;
    copy.textContent = message;
    action.textContent = label;
    nextAction = callback;
    overlay.classList.remove("is-hidden");
  };
  api = startSpaceWars({
    parent: "space-wars-root",
    onState: (state) => {
      score.textContent = String(state.score).padStart(4, "0");
      wave.textContent = String(state.wave);
      shields.textContent = String(state.shields);
      pause.textContent = state.mode === "pause" ? "▶" : "Ⅱ";
      pause.setAttribute("aria-label", state.mode === "pause" ? "Resume" : "Pause");
      if (state.mode === "active") overlay.classList.add("is-hidden");
      if (state.mode === "pause") showOverlay({ heading: "Paused.", message: "Nothing moves while paused.", label: "resume", callback: () => api.togglePause() });
      if (state.mode === "result") showOverlay({ heading: "Ship lost.", message: `Targets hit: ${state.score}.`, label: "play again", callback: () => api.start() });
    },
  });
  action.addEventListener("click", () => nextAction());
  pause.addEventListener("click", () => api.togglePause());
  for (const button of document.querySelectorAll("[data-space-move]")) {
    const direction = button.dataset.spaceMove;
    const press = (event) => { event.preventDefault(); api.setMove(direction, true); };
    const release = (event) => { event.preventDefault(); api.setMove(direction, false); };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }
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

function renderLeaderboard(node, gameId = DEFAULT_LEADERBOARD_GAME, statusNode = null, options = {}) {
  const game = LEADERBOARD_GAMES.find((item) => item.id === gameId);
  const localEntries = getLeaderboard(gameId);
  const online = window.HVNOnlineLeaderboard;
  const renderEntries = (entries) => {
    node.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "leaderboard-empty";
      empty.textContent = `No ${game?.label || "game"} scores yet.`;
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
  };
  renderEntries(localEntries);
  if (!online) {
    if (statusNode) statusNode.textContent = "Scores saved in this browser.";
    return Promise.resolve({ status: "unavailable", entries: localEntries });
  }
  if (!online.configured) {
    if (statusNode) statusNode.textContent = "Local board for now. The shared board is not connected.";
    return Promise.resolve({ status: "unconfigured", entries: localEntries });
  }
  if (options.localOnly) {
    if (statusNode) statusNode.textContent = options.localOnlyMessage || "Score saved to the shared board. Rankings will refresh shortly.";
    return Promise.resolve({ status: "pending-refresh", entries: localEntries });
  }
  if (statusNode) statusNode.textContent = "Loading shared scores…";
  return online.get(gameId).then((result) => {
    if (result.status === "online") {
      renderEntries(result.entries);
      if (statusNode) statusNode.textContent = "Shared board · top 10 scores";
    } else if (statusNode) {
      statusNode.textContent = options.preserveSaved
        ? "Score saved to the shared board. Rankings are still loading."
        : "Shared board unavailable · showing this browser’s scores";
    }
    return result;
  });
}

function setupLeaderboard() {
  const form = document.querySelector("#leaderboard-name-form");
  const input = document.querySelector("#leaderboard-name");
  const node = document.querySelector("#leaderboard-list");
  const picker = document.querySelector("#leaderboard-game");
  const title = document.querySelector("#leaderboard-title");
  const status = document.querySelector("#leaderboard-connection");
  const nameStatus = document.querySelector("#leaderboard-name-status");
  if (!form || !input || !node || !picker) return;
  input.value = getPlayerName();
  const update = () => {
    const game = LEADERBOARD_GAMES.find((item) => item.id === picker.value) || LEADERBOARD_GAMES[0];
    title.textContent = "high scores";
    void renderLeaderboard(node, game.id, status);
  };
  picker.value = DEFAULT_LEADERBOARD_GAME;
  update();
  picker.addEventListener("change", update);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = setPlayerName(input.value);
    const button = form.querySelector("button");
    if (!name) {
      input.value = "";
      if (nameStatus) nameStatus.textContent = "Pick your own initials or name. YOU is only a placeholder.";
      input.focus();
      return;
    }
    input.value = name;
    if (nameStatus) nameStatus.textContent = `Saved as ${name}. New scores will use it automatically.`;
    button.textContent = "Saved";
    window.setTimeout(() => { button.textContent = "Save"; }, 1000);
  });
  const online = window.HVNOnlineLeaderboard;
  if (online?.configured) {
    const cached = Object.fromEntries(LEADERBOARD_GAMES.map((game) => [game.id, getLeaderboard(game.id)]));
    void online.migrate(cached);
  }
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

async function renderComet() {
  document.body.className = "game-page game-comet";
  app.innerHTML = `
    <header class="game-header page-width">
      <a class="wordmark" href="${base}">HVN games</a>
      <nav class="site-nav" aria-label="Primary navigation"><a href="${base}?game=${ORBIT_ROUTE}">Orbit</a><a href="${base}">home</a></nav>
    </header>
    <main class="game-main page-width">
    <div class="game-heading">
        <h1>Comet Courier</h1>
        <p class="game-blurb">Bring green beacons home through the tail.</p>
      </div>
      <section class="game-frame comet-frame" aria-label="Comet Courier game">
        <div class="comet-hud" aria-live="polite">
          <div><span>score</span><strong id="comet-score">000</strong></div>
          <div><span>best</span><strong id="comet-best">000</strong></div>
          <div><span>tail</span><strong id="comet-length">04</strong></div>
          <div><span>level</span><strong id="comet-level">01</strong></div>
          <button id="comet-pause" class="pause-button" type="button" aria-label="Pause">Ⅱ</button>
        </div>
        <div id="game-root"></div>
        <div id="comet-touch" class="comet-touch" aria-label="Touch controls">
          <button type="button" data-direction="up" aria-label="Move up">↑</button>
          <button type="button" data-direction="left" aria-label="Move left">←</button>
          <button type="button" data-direction="down" aria-label="Move down">↓</button>
          <button type="button" data-direction="right" aria-label="Move right">→</button>
        </div>
        <div id="game-overlay" class="game-overlay">
          <h2 id="overlay-title">Ready?</h2>
          <p id="overlay-copy">Bring green beacons home. Red debris and your tail end the run.</p>
          <button id="overlay-action" class="button button-primary" type="button">start</button>
          <p id="overlay-detail" class="overlay-detail">WASD or arrows to steer · Space pauses</p>
        </div>
      </section>
      <section class="comet-note" aria-label="How to play Comet Courier">
        <p><strong>One rule.</strong> Green beacons add to your tail. Red debris and your own tail end the run.</p>
        <p>Inspired by <a href="https://github.com/adrianov/snake" rel="noreferrer">adrianov/snake</a>, rebuilt for HVN Games under its MIT License.</p>
      </section>
    </main>
  `;

  const { startComet } = await import("../../games/comet/comet.js");
  const overlay = document.querySelector("#game-overlay");
  const frame = document.querySelector(".comet-frame");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");
  const overlayDetail = document.querySelector("#overlay-detail");
  const overlayAction = document.querySelector("#overlay-action");
  const pauseButton = document.querySelector("#comet-pause");
  const experiment = getExperimentAssignment("comet", "opening-load", ["steady"]);
  const tracker = createGameTracker("comet", "opening-load", experiment);
  const bestKey = "hvn-games:comet-best:v1";
  let api;
  let previousMode = "menu";
  let action = null;
  let savedBest = Number(window.localStorage.getItem(bestKey) || 0);

  const showOverlay = ({ title, copy, detail, label, next }) => {
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    overlayDetail.textContent = detail;
    overlayAction.textContent = label;
    overlayAction.hidden = false;
    action = next;
    overlay.classList.remove("is-hidden", "is-countdown");
  };
  const startWithCountdown = () => beginCountdown({
    overlay,
    title: overlayTitle,
    copy: overlayCopy,
    detail: overlayDetail,
    actionButton: overlayAction,
    message: "Bring a beacon home.",
    next: () => api.start(),
  });

  action = startWithCountdown;

  api = startComet({
    parent: "game-root",
    onState: (state) => {
      const score = Math.max(0, Math.floor(state.score));
      savedBest = Math.max(savedBest, score, Number(state.best) || 0);
      if (savedBest > Number(window.localStorage.getItem(bestKey) || 0)) window.localStorage.setItem(bestKey, String(savedBest));
      document.querySelector("#comet-score").textContent = String(score).padStart(3, "0");
      document.querySelector("#comet-best").textContent = String(savedBest).padStart(3, "0");
      document.querySelector("#comet-length").textContent = String(state.length).padStart(2, "0");
      document.querySelector("#comet-level").textContent = String(state.level).padStart(2, "0");
      pauseButton.textContent = state.mode === "pause" ? "▶" : "Ⅱ";
      pauseButton.setAttribute("aria-label", state.mode === "pause" ? "Resume" : "Pause");
      frame.classList.toggle("is-active", state.mode === "active");
      if (state.mode === "active" && previousMode !== "active") tracker.start();
      if (state.mode === "result" && previousMode !== "result") tracker.finish(state);
      if (state.mode === "active") overlay.classList.add("is-hidden");
      if (state.mode === "pause") showOverlay({ title: "Paused.", copy: "Nothing moves while paused.", detail: "Press Space or click resume.", label: "resume", next: () => api.togglePause() });
      if (state.mode === "result" && previousMode !== "result") showOverlay({ title: "Crash.", copy: `Score ${score}.`, detail: `Best ${savedBest}.`, label: "play again", next: startWithCountdown });
      previousMode = state.mode;
    },
  });

  overlayAction.addEventListener("click", () => { if (!overlayAction.hidden) action(); });
  pauseButton.addEventListener("click", () => api.togglePause());
  for (const button of document.querySelectorAll("[data-direction]")) button.addEventListener("click", () => api.setDirection(button.dataset.direction));
}

async function renderGame() {
  if (params.get("game") === SHELF_ROUTE) return renderGameShelf({ app, base });
  if (params.get("game") === TOWER_DEFENSE_ROUTE) return renderTowerDefense();
  if (params.get("game") === ORBIT_RL_ROUTE) return renderRLWriteup();
  if (params.get("game") === COMET_ROUTE) return renderComet();
  if (params.get("game") === SPACE_WARS_ROUTE) return renderSpaceWars();
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
        <p class="game-blurb">Collect matching dots. Avoid red planets.</p>
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
            <p class="tutorial-kicker">practice</p>
            <p id="tutorial-step" class="tutorial-step">lesson 1 of 4</p>
            <h2 id="tutorial-title">Move your triangle.</h2>
            <p id="tutorial-copy" class="tutorial-intro">Use WASD or an arrow key, or tap the move button below on a phone.</p>
            <div id="tutorial-demo" class="tutorial-demo" aria-live="polite">
              <span id="tutorial-status">waiting for movement</span>
            </div>
            <button id="tutorial-move" class="tutorial-action" type="button" hidden>tap to move</button>
            <button id="tutorial-swatch" class="tutorial-swatch" type="button" hidden aria-label="Switch color in the practice lesson"><span aria-hidden="true"></span><b>tap to switch</b></button>
            <button id="tutorial-dash" class="tutorial-action" type="button" hidden>tap to dash</button>
            <button id="tutorial-start" class="button button-primary" type="button" disabled>move to continue</button>
            <button id="tutorial-skip" class="text-button tutorial-skip" type="button">skip tutorial</button>
          </div>
          <h2 id="overlay-title">Your move.</h2>
          <p id="overlay-copy">Collect cyan or yellow dots. Avoid red planets.</p>
          <button id="overlay-action" class="button button-primary" type="button">start</button>
          <p id="overlay-detail" class="overlay-detail">WASD or arrows move · Space or square switches color · Q slows time</p>
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
      <div class="google-ad-slot" data-google-ad-slot="3947449400" aria-label="Advertisement"></div>
      <section class="route-leaderboard" id="route-leaderboard" aria-labelledby="route-leaderboard-title"><div><h2 id="route-leaderboard-title">high scores</h2><p id="phasebound-leaderboard-connection">Checking the shared board…</p></div><div id="phasebound-leaderboard"></div></section>
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
  const tutorialMove = document.querySelector("#tutorial-move");
  const tutorialSwatch = document.querySelector("#tutorial-swatch");
  const tutorialDash = document.querySelector("#tutorial-dash");
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
      copy: "Use WASD or an arrow key. On a phone, tap the move button.",
      waiting: "move once",
      ready: "Now move to a matching dot.",
      blocked: "move to continue",
      next: "next: match a color",
    },
    {
      title: "Match the dot's color.",
      copy: "Press Space, or tap the square, to switch between cyan and yellow.",
      waiting: "switch color",
      ready: "Now collect a dot of that color.",
      blocked: "change color to continue",
      next: "next: use a dash",
    },
    {
      title: "Dash when you need room.",
      copy: "Press Shift, or tap dash on a phone. Use the burst to get past a red planet.",
      waiting: "dash once",
      ready: "Use it when a planet gets close.",
      blocked: "dash to continue",
      next: "next: play a run",
    },
    {
      title: "Collect matching dots.",
      copy: "Collect dots that match your triangle. Red planets cost a life. Pink stars add one.",
      waiting: "you know the controls",
      ready: "Start when you’re ready.",
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
    tutorialMove.hidden = tutorialLessonIndex !== 0;
    tutorialSwatch.hidden = tutorialLessonIndex !== 1;
    tutorialSwatch.dataset.phase = tutorialLessonIndex === 1 ? "cyan" : "";
    tutorialDash.hidden = tutorialLessonIndex !== 2;
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
      copy: "Collect matching dots. Avoid red planets.",
      detail: "WASD or arrows move · Space or square switches color · Q slows time",
      label: "start",
      next: startWithCountdown,
    });
  }

  let pendingScore = null;
  async function publishLeaderboardScore(gameId, score) {
    const localEntry = recordLeaderboardScore(gameId, score.score, score.packets, score.elapsed);
    if (!localEntry) return { status: "needs-name", entries: [] };
    const online = window.HVNOnlineLeaderboard;
    const leaderboard = document.querySelector("#phasebound-leaderboard");
    const connection = document.querySelector("#phasebound-leaderboard-connection");
    if (online?.configured) {
      const submitted = await online.submit(gameId, { name: localEntry.name, score: score.score, packets: score.packets, seconds: score.elapsed, submissionId: online.submissionId(gameId, localEntry) });
      if (submitted.status === "online") {
        await renderLeaderboard(leaderboard, gameId, connection, { localOnly: true });
        window.setTimeout(() => { void renderLeaderboard(leaderboard, gameId, connection, { preserveSaved: true }); }, 1800);
        return submitted;
      }
      await renderLeaderboard(leaderboard, gameId, connection, { localOnly: true, localOnlyMessage: "Saved in this browser. The shared board will retry when it is reachable." });
      return submitted;
    }
    return renderLeaderboard(leaderboard, gameId, connection);
  }

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
      void publishLeaderboardScore("phasebound", pendingScore).then(() => { scoreSaveStatus.textContent = "saved automatically."; });
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
    void publishLeaderboardScore("phasebound", pendingScore);
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
    beginCountdown({ overlay, title: overlayTitle, copy: overlayCopy, detail: overlayDetail, actionButton: overlayAction, message: "Collect matching dots.", next: () => api.start() });
  };

  api = startPhasebound({
    parent: "game-root",
    tutorial: !hasSeenTutorial(),
    onInput: (input) => {
      if (!tutorialActive || tutorialLessonReady) return;
      if (tutorialLessonIndex === 0 && input === "move") finishTutorialLesson(tutorialLessons[0].ready);
      if (tutorialLessonIndex === 1 && input === "phase") finishTutorialLesson(tutorialLessons[1].ready);
      if (tutorialLessonIndex === 2 && input === "dash") finishTutorialLesson(tutorialLessons[2].ready);
    },
    onState: (state) => {
      if (state.mode === "active" && previousMode !== "active") tracker.start();
      if (state.mode === "result" && previousMode !== "result") tracker.finish(state);
      updateHud(state);
      frame.classList.toggle("is-active", state.mode === "active" || state.mode === "tutorial");
      if (state.mode === "active") overlay.classList.add("is-hidden");
      if (state.mode === "pause") {
        showOverlay({ title: "Paused.", copy: "Nothing moves while paused.", detail: "Press P or click resume.", label: "resume", next: () => api.resume() });
      }
      if (state.mode === "result" && previousMode !== "result") {
        const won = state.result === "won";
        showOverlay({ title: "Run over.", copy: `Score ${Math.max(0, Math.floor(state.score))}.`, detail: "The next run starts at phase 1.", label: "play again", next: startWithCountdown });
        showScoreSave(state);
      }
      previousMode = state.mode;
    },
    pacing: experiment,
  });
  void renderLeaderboard(document.querySelector("#phasebound-leaderboard"), "phasebound", document.querySelector("#phasebound-leaderboard-connection"));
  const online = window.HVNOnlineLeaderboard;
  if (online?.configured) {
    const cached = Object.fromEntries(LEADERBOARD_GAMES.map((game) => [game.id, getLeaderboard(game.id)]));
    void online.migrate(cached);
  }

  overlayAction.addEventListener("click", () => { if (overlayAction.hidden) return; action(); });
  tutorialStart.addEventListener("click", advanceTutorial);
  tutorialMove.addEventListener("click", () => {
    if (!tutorialActive || tutorialLessonIndex !== 0 || tutorialLessonReady) return;
    api.setTouchDirection("right", true);
    window.setTimeout(() => api.setTouchDirection("right", false), 260);
    finishTutorialLesson(tutorialLessons[0].ready);
  });
  tutorialSkip.addEventListener("click", skipTutorial);
  tutorialSwatch.addEventListener("click", () => {
    if (!tutorialActive || tutorialLessonIndex !== 1 || tutorialLessonReady) return;
    api.togglePhase();
    finishTutorialLesson(tutorialLessons[1].ready);
  });
  tutorialDash.addEventListener("click", () => {
    if (!tutorialActive || tutorialLessonIndex !== 2 || tutorialLessonReady) return;
    api.dash();
    finishTutorialLesson(tutorialLessons[2].ready);
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
