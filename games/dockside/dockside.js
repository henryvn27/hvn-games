import Phaser from "phaser";
import "./dockside.css";
import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { cameraOffsetForRound, createRound, dropCrate, pauseRound, resumeRound, startRound, stepRound } from "./simulation.js";

const BEST_KEY = "hvn-games:dockside:best";
const COLORS = [0xe87952, 0x3c9b90, 0xe6b94d, 0x596f91, 0xcf6250];

function readBest() {
  try {
    const score = Number(localStorage.getItem(BEST_KEY));
    return Number.isSafeInteger(score) && score >= 0 ? score : 0;
  } catch { return 0; }
}

function writeBest(score) {
  const best = Math.max(readBest(), score);
  try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* play continues without storage */ }
  return best;
}

export function mountDockside(host) {
  host.innerHTML = `
    <section class="dockside" aria-label="Dockside stacking game">
      <div class="dockside-bar" aria-label="Round stats">
        <div class="dockside-stat"><span>score</span><strong id="dock-score">0</strong></div>
        <div class="dockside-stat"><span>crates</span><strong id="dock-crates">0</strong></div>
        <div class="dockside-stat"><span>best here</span><strong id="dock-best">${readBest()}</strong></div>
        <div class="dockside-misses" id="dock-misses" aria-label="3 drops left"><i></i><i></i><i></i></div>
        <button class="dockside-pause" id="dock-pause" type="button" disabled>Pause</button>
      </div>
      <div class="dockside-stage" id="dock-stage" aria-label="Harbor crane and container stack">
        <div class="dockside-canvas" id="dock-canvas"></div>
        <div class="dockside-overlay" id="dock-overlay">
          <h2 id="dock-title">Build it higher.</h2>
          <p id="dock-copy">Drop each crate onto the stack. Land near the middle for a perfect and keep your streak. Three misses ends the run.</p>
          <button class="dockside-start" id="dock-action" type="button">Start</button>
          <form class="dockside-name-form" id="dock-name-form" hidden>
            <label for="dock-name">Name for the high score board<input id="dock-name" maxlength="16" autocomplete="nickname" placeholder="Initials or your name"></label>
            <button class="dockside-save" type="submit">Save score</button>
          </form>
          <p id="dock-result-note" role="status" aria-live="polite"></p>
        </div>
      </div>
      <div class="dockside-controls">
        <button class="dockside-drop" id="dock-drop" type="button" disabled>Drop crate <span aria-hidden="true">· Space</span></button>
        <p id="dock-hint">Watch the swing. Drop when it lines up.</p>
      </div>
    </section>`;

  const $ = (selector) => host.querySelector(selector);
  const stage = $("#dock-stage");
  const overlay = $("#dock-overlay");
  const action = $("#dock-action");
  const pauseButton = $("#dock-pause");
  const dropButton = $("#dock-drop");
  const nameForm = $("#dock-name-form");
  const nameInput = $("#dock-name");
  let state = createRound();
  let previousMode = "ready";
  let savedThisRun = false;
  let disposed = false;
  let smoothCamera = 0;
  let bestScore = readBest();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const showOverlay = (title, copy, label, onAction) => {
    $("#dock-title").textContent = title;
    $("#dock-copy").textContent = copy;
    action.textContent = label;
    action.onclick = onAction;
    overlay.hidden = false;
  };
  const start = () => {
    state = startRound();
    previousMode = "active";
    savedThisRun = false;
    nameForm.hidden = true;
    $("#dock-hint").textContent = "Watch the swing. Drop when it lines up.";
    $("#dock-result-note").textContent = "";
    overlay.hidden = true;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pause";
    dropButton.disabled = false;
    window.Shelf?.record("game_play", { id: "dockside" });
  };
  const togglePause = () => {
    if (state.mode === "active" || state.mode === "dropping") {
      state = pauseRound(state);
      pauseButton.textContent = "Resume";
      showOverlay("Paused", "The crane and the stack are holding still.", "Resume", () => {
        state = resumeRound(state);
        previousMode = state.mode;
        overlay.hidden = true;
        pauseButton.textContent = "Pause";
      });
    } else if (state.mode === "paused") {
      state = resumeRound(state);
      previousMode = state.mode;
      overlay.hidden = true;
      pauseButton.textContent = "Pause";
    }
  };
  const submitScore = async (name) => {
    const savedName = setPlayerName(name);
    if (!savedName) {
      $("#dock-result-note").textContent = "Use your own initials or name. The placeholder tag won’t be saved.";
      nameInput.focus();
      return false;
    }
    const entry = recordLeaderboardScore("dockside", state.score, state.floors.length - 1, Math.floor(state.elapsed));
    if (!entry) return false;
    const online = window.HVNOnlineLeaderboard;
    if (online?.configured) {
      const response = await online.submit("dockside", {
        name: savedName,
        score: state.score,
        packets: state.floors.length - 1,
        seconds: Math.floor(state.elapsed),
        submissionId: online.submissionId("dockside", entry),
      });
      $("#dock-result-note").textContent = response.status === "online"
        ? `Saved as ${savedName}. It’s on the shared Dockside board.`
        : `Saved as ${savedName} in this browser. The shared board couldn’t be reached.`;
    } else {
      $("#dock-result-note").textContent = `Saved as ${savedName} in this browser.`;
    }
    nameForm.hidden = true;
    savedThisRun = true;
    return true;
  };
  const finish = () => {
    if (savedThisRun || state.mode !== "result" || state.score < 1) return;
    window.Shelf?.record("dockside_run", { crates: state.floors.length - 1 });
    const name = getPlayerName();
    if (name) {
      savedThisRun = true;
      void submitScore(name);
    } else {
      nameForm.hidden = false;
      $("#dock-result-note").textContent = "Add your name once to put this score on the Dockside board.";
    }
  };
  nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitScore(nameInput.value);
  });
  action.onclick = start;
  pauseButton.addEventListener("click", togglePause);
  dropButton.addEventListener("click", () => { state = dropCrate(state); });
  const onKeyDown = (event) => {
    if (event.code === "Space" && !event.repeat && !event.target.closest("button,input")) {
      event.preventDefault();
      state = dropCrate(state);
    }
    if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) togglePause();
    if (event.code === "KeyR" && !event.repeat && state.mode === "result") start();
  };
  window.addEventListener("keydown", onKeyDown);

  class DocksideScene extends Phaser.Scene {
    create() {
      this.g = this.add.graphics();
      stage.addEventListener("pointerdown", this.onPointer = (event) => {
        if (event.target.closest("button,input,form")) return;
        state = dropCrate(state);
      });
    }
    update(_time, delta) {
      if (state.mode === "active" || state.mode === "dropping") state = stepRound(state, delta / 1000);
      const targetCamera = cameraOffsetForRound(state);
      smoothCamera = reducedMotion ? targetCamera : smoothCamera + (targetCamera - smoothCamera) * Math.min(1, delta / 220);
      this.draw();
      $("#dock-score").textContent = String(state.score);
      $("#dock-crates").textContent = String(state.floors.length - 1);
      const nextBest = Math.max(bestScore, state.score);
      if (nextBest !== bestScore) bestScore = writeBest(nextBest);
      $("#dock-best").textContent = String(bestScore);
      const misses = $("#dock-misses");
      [...misses.children].forEach((dot, index) => dot.classList.toggle("used", index < state.misses));
      misses.setAttribute("aria-label", `${3 - state.misses} drops left`);
      dropButton.disabled = state.mode !== "active";
      pauseButton.disabled = state.mode === "ready" || state.mode === "result";
      if (state.mode === "active" && previousMode !== "active" && previousMode !== "dropping") overlay.hidden = true;
      if (state.mode === "result" && previousMode !== "result") {
        pauseButton.disabled = true;
        dropButton.disabled = true;
        $("#dock-copy").textContent = `${state.floors.length - 1} crates · ${state.score} points · ${state.perfects} perfect.`;
        showOverlay("Stack came down.", $("#dock-copy").textContent, "Run it back", start);
        finish();
      }
      if (state.mode !== "result" && state.lastPlacement === "miss" && previousMode !== "active") {
        const left = 3 - state.misses;
        $("#dock-hint").textContent = `${left} ${left === 1 ? "drop" : "drops"} left. The next crate is on its way.`;
      }
      else if (state.lastPlacement === "perfect") $("#dock-hint").textContent = `Perfect. ${state.combo} in a row.`;
      else if (state.lastPlacement === "landed") $("#dock-hint").textContent = "Good landing. Watch the next swing.";
      previousMode = state.mode;
    }
    draw() {
      const g = this.g;
      const cam = smoothCamera;
      g.clear();
      g.fillStyle(0xb6dde0, 1); g.fillRect(0, 0, 960, 560);
      g.fillStyle(0xd9e6d3, 1); g.fillRect(0, 386, 960, 105);
      g.fillStyle(0x467d83, 1); g.fillRect(0, 491, 960, 69);
      g.fillStyle(0x32646e, 1);
      for (let x = 0; x < 960; x += 150) {
        const waveY = 508 + Math.sin(x * .015 + state.elapsed * .5) * 5;
        g.fillRoundedRect(x, waveY, 98, 3, 2);
      }
      // Distant sheds and cranes make the playfield feel like a place, not a game frame.
      for (let i = 0; i < 7; i += 1) {
        const x = 24 + i * 144;
        const h = 32 + ((i * 29) % 37);
        g.fillStyle(i % 2 ? 0x91c2bd : 0x7db2b1, .92);
        g.fillRect(x, 386 - h, 92, h);
        g.fillStyle(0xd5e7d9, .75);
        for (let row = 0; row < 2; row += 1) for (let col = 0; col < 4; col += 1) g.fillRect(x + 10 + col * 19, 366 - h + row * 16, 9, 6);
      }
      g.fillStyle(0x305c63, 1); g.fillRect(86, 80, 14, 306); g.fillRect(854, 80, 14, 306); g.fillRect(86, 72, 782, 13);
      g.fillStyle(0xd89d4b, 1); g.fillRect(118, 75, 112, 7); g.fillRect(730, 75, 112, 7);
      g.lineStyle(3, 0x315a60, .9); g.lineBetween(132, 86, 132, 310); g.lineBetween(824, 86, 824, 310);
      // Stacked freight; the camera follows the top as the run grows.
      const baseY = 488 + cam;
      g.fillStyle(0x344d4c, 1); g.fillRect(312, baseY, 336, 36);
      g.fillStyle(0xd8bd7a, 1); g.fillRect(328, baseY + 9, 304, 5);
      state.floors.slice(1).forEach((floor, index) => {
        const y = floor.y + cam;
        if (y < -36 || y > 590) return;
        const color = COLORS[index % COLORS.length];
        g.fillStyle(color, 1); g.fillRect(floor.x, y, floor.width, floor.height);
        g.lineStyle(2, 0x1c4246, .9); g.strokeRect(floor.x, y, floor.width, floor.height);
        g.lineStyle(1, 0x173e43, .5);
        for (let x = floor.x + 18; x < floor.x + floor.width; x += 26) g.lineBetween(x, y + 3, x, y + floor.height - 3);
        if (floor.perfect) { g.fillStyle(0xffe4a0, 1); g.fillRect(floor.x + floor.width / 2 - 2, y + 5, 4, floor.height - 10); }
      });
      const block = state.block;
      if (state.mode !== "result") {
        const blockY = block.y + (state.mode === "dropping" ? cam : 0);
        if (state.mode === "active" || state.mode === "paused" || state.mode === "dropping") {
          const trolleyX = block.x + block.width / 2;
          g.fillStyle(0x315a60, 1); g.fillRoundedRect(trolleyX - 15, 84, 30, 16, 3);
          g.lineStyle(3, 0x315a60, 1); g.lineBetween(trolleyX, 100, trolleyX, Math.max(109, blockY));
          const color = COLORS[state.floors.length % COLORS.length];
          g.fillStyle(color, 1); g.fillRect(block.x, blockY, block.width, block.height);
          g.lineStyle(2, 0x1c4246, 1); g.strokeRect(block.x, blockY, block.width, block.height);
          g.lineStyle(1, 0x173e43, .55);
          for (let x = block.x + 16; x < block.x + block.width; x += 26) g.lineBetween(x, blockY + 3, x, blockY + block.height - 3);
        }
      }
    }
    shutdown() { if (this.onPointer) stage.removeEventListener("pointerdown", this.onPointer); }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: $("#dock-canvas"),
    width: 960,
    height: 560,
    backgroundColor: "#b6dde0",
    antialias: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: DocksideScene,
    render: { antialias: true, roundPixels: true },
  });
  return () => {
    disposed = true;
    window.removeEventListener("keydown", onKeyDown);
    game.destroy(true);
    if (disposed) stage.replaceChildren();
  };
}
