import Phaser from "phaser";
import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { newRun, startRun, stepRun, togglePause } from "./simulation.js";
import "./hex-stack.css";

const COLORS = { mint: 0x8dd7ad, coral: 0xe98272, gold: 0xe5be68, lilac: 0xb5a0d7 };
const SIZES = { width: 720, center: 360, inner: 42, step: 40, tile: 18 };
const vertices = (x, y, radius) => Array.from({ length: 6 }, (_, index) => ({
  x: x + Math.cos(index * Math.PI / 3) * radius,
  y: y + Math.sin(index * Math.PI / 3) * radius,
}));

export function mountHexStack(host) {
  host.innerHTML = `
    <section class="hex-stack" aria-label="Hex Stack">
      <div class="hex-stack-bar">
        <dl class="hex-stack-stats" aria-label="Round score">
          <div><dt>score</dt><dd data-score>0</dd></div>
          <div><dt>cleared</dt><dd data-cleared>0</dd></div>
          <div><dt>best</dt><dd data-best>0</dd></div>
          <div><dt>level</dt><dd data-level>1</dd></div>
        </dl>
        <div class="hex-stack-next"><span>next</span><i data-next aria-label="Next tile color"></i></div>
        <button type="button" data-pause disabled>Pause</button>
      </div>
      <div class="hex-stack-stage">
        <div class="hex-stack-canvas" data-canvas aria-label="Six-sided tile board"></div>
        <div class="hex-stack-overlay" data-overlay>
          <div class="hex-stack-message">
            <h2 data-title>Turn the ring.</h2>
            <p data-copy>Line up three matching tiles. A spoke that fills ends the round.</p>
            <button class="hex-stack-action" type="button" data-action>Start</button>
            <form class="hex-stack-name" data-name hidden>
              <label for="hex-stack-player-name">Name for the high-score board<input id="hex-stack-player-name" maxlength="16" autocomplete="nickname" placeholder="Your name or initials"></label>
              <button type="submit">Save score</button>
            </form>
            <span class="hex-stack-status" data-status role="status" aria-live="polite"></span>
          </div>
        </div>
      </div>
      <div class="hex-stack-controls" aria-label="Game controls">
        <button type="button" data-left aria-label="Turn left">Turn left</button>
        <button type="button" data-drop>Drop tile</button>
        <button type="button" data-right aria-label="Turn right">Turn right</button>
      </div>
      <p class="hex-stack-help">← / → or A / D to turn · Space to drop · P to pause</p>
    </section>`;

  const $ = (selector) => host.querySelector(selector);
  const overlay = $("[data-overlay]");
  const action = $("[data-action]");
  const pauseButton = $("[data-pause]");
  const nameForm = $("[data-name]");
  const status = $("[data-status]");
  const bestKey = "hvn-games:hex-stack:best";
  let best = 0;
  try { best = Number(localStorage.getItem(bestKey)) || 0; } catch { /* Best score is optional. */ }
  let state = newRun();
  let heldTurn = "";
  let turnRepeat = 0;
  let pendingDrop = false;
  let previousMode = state.mode;
  let savedThisRun = false;
  let disposed = false;
  const pressed = new Set();

  const showOverlay = (title, copy, buttonLabel) => {
    $("[data-title]").textContent = title;
    $("[data-copy]").textContent = copy;
    action.textContent = buttonLabel;
    overlay.hidden = false;
  };
  let actionHandler = () => {};
  action.addEventListener("click", () => actionHandler());

  const start = () => {
    state = startRun();
    heldTurn = "";
    pendingDrop = false;
    savedThisRun = false;
    nameForm.hidden = true;
    status.textContent = "";
    overlay.hidden = true;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pause";
    actionHandler = start;
    window.Shelf?.record("game_play", { id: "hex-stack" });
  };
  actionHandler = start;

  const saveScore = async () => {
    if (savedThisRun || state.score < 1) return;
    const playerName = getPlayerName();
    if (!playerName) {
      nameForm.hidden = false;
      $("#hex-stack-player-name").focus();
      status.textContent = "Add your name once to put this score on the board.";
      return;
    }
    const entry = recordLeaderboardScore("hex-stack", state.score, state.cleared, Math.floor(state.elapsed));
    if (!entry) {
      status.textContent = "This score could not be saved.";
      return;
    }
    savedThisRun = true;
    nameForm.hidden = true;
    const online = window.HVNOnlineLeaderboard;
    if (!online?.configured) {
      status.textContent = `Saved as ${playerName} in this browser.`;
      return;
    }
    try {
      const result = await online.submit("hex-stack", {
        name: playerName,
        score: state.score,
        packets: state.cleared,
        seconds: Math.floor(state.elapsed),
        submissionId: online.submissionId("hex-stack", entry),
      });
      status.textContent = result.status === "online"
        ? `Saved as ${playerName}. It’s on the shared Hex Stack board.`
        : `Saved as ${playerName} in this browser. The shared board could not be reached.`;
    } catch {
      status.textContent = `Saved as ${playerName} in this browser. The shared board could not be reached.`;
    }
  };

  nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = setPlayerName($("#hex-stack-player-name").value);
    if (!name) {
      status.textContent = "Use your own name or initials, not the example tag.";
      $("#hex-stack-player-name").focus();
      return;
    }
    void saveScore();
  });

  const pause = () => {
    if (state.mode === "active") {
      state = togglePause(state);
      heldTurn = "";
      pendingDrop = false;
      pauseButton.textContent = "Resume";
      showOverlay("Paused.", "The tiles are stopped.", "Resume");
      actionHandler = () => {
        state = togglePause(state);
        overlay.hidden = true;
        pauseButton.textContent = "Pause";
      };
    } else if (state.mode === "paused") {
      state = togglePause(state);
      overlay.hidden = true;
      pauseButton.textContent = "Pause";
      actionHandler = start;
    }
  };
  pauseButton.addEventListener("click", pause);

  const onKeyDown = (event) => {
    if (event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable=true]")) return;
    if (["KeyP", "Escape"].includes(event.code) && !event.repeat) { pause(); return; }
    if (!["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(event.code)) return;
    if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (pressed.has(event.code) || state.mode !== "active") return;
    if (["ArrowLeft", "KeyA"].includes(event.code)) state = stepRun(state, { rotate: "left" }, 0);
    if (["ArrowRight", "KeyD"].includes(event.code)) state = stepRun(state, { rotate: "right" }, 0);
    if (event.code === "Space") pendingDrop = true;
    pressed.add(event.code);
  };
  const onKeyUp = (event) => pressed.delete(event.code);
  const clearPressed = () => { pressed.clear(); heldTurn = ""; };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearPressed);

  const bindTurn = (selector, direction) => {
    const button = $(selector);
    button.addEventListener("pointerdown", (event) => {
      if (state.mode !== "active") return;
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      heldTurn = direction;
      state = stepRun(state, { rotate: direction }, 0);
      turnRepeat = 0;
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"]) {
      button.addEventListener(type, () => { if (heldTurn === direction) heldTurn = ""; });
    }
  };
  bindTurn("[data-left]", "left");
  bindTurn("[data-right]", "right");
  $("[data-drop]").addEventListener("click", () => { if (state.mode === "active") pendingDrop = true; });

  const paint = (graphics) => {
    const { center: c, inner, step, tile } = SIZES;
    const startAngle = -Math.PI / 2;
    graphics.clear();
    graphics.fillStyle(0x111411, 1);
    graphics.fillRect(0, 0, SIZES.width, SIZES.width);
    graphics.fillStyle(0x161a15, 1);
    graphics.fillCircle(c, c, 21);
    for (let side = 0; side < 6; side += 1) {
      const angle = startAngle + side * Math.PI / 3;
      const ux = Math.cos(angle), uy = Math.sin(angle);
      const selected = side === state.orientation;
      graphics.lineStyle(selected ? 2 : 1, selected ? 0xdfff73 : 0x343b33, 1);
      graphics.lineBetween(c + ux * 21, c + uy * 21, c + ux * 345, c + uy * 345);
      for (let depth = 0; depth < state.stacks[side].length; depth += 1) {
        const radius = inner + depth * step;
        const x = c + ux * radius, y = c + uy * radius;
        const polygon = vertices(x, y, tile);
        graphics.fillStyle(COLORS[state.stacks[side][depth]], 1);
        graphics.fillPoints(polygon, true);
        graphics.lineStyle(1, 0x111411, 1);
        graphics.strokePoints(polygon, true);
      }
    }
    if (state.current) {
      const angle = startAngle + state.orientation * Math.PI / 3;
      const progress = Math.min(1, state.fallAt / state.fallEvery);
      const radius = 330 - progress * (330 - inner);
      const polygon = vertices(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius, tile + 2);
      graphics.fillStyle(COLORS[state.current], 1);
      graphics.fillPoints(polygon, true);
      graphics.lineStyle(2, 0xf0eee5, 1);
      graphics.strokePoints(polygon, true);
    }
  };

  class HexStackScene extends Phaser.Scene {
    create() {
      this.graphics = this.add.graphics();
      this.clearLabel = this.add.text(SIZES.center, SIZES.center - 9, "", {
        fontFamily: '"Avenir Next", "Helvetica Neue", sans-serif',
        fontSize: "16px",
        color: "#f0eee5",
      }).setOrigin(.5).setVisible(false);
    }
    update(_time, delta) {
      if (state.mode === "active") {
        const dt = Math.min(.05, Math.max(0, delta / 1000));
        if (heldTurn) {
          turnRepeat += dt;
          if (turnRepeat >= .2) {
            state = stepRun(state, { rotate: heldTurn }, 0);
            turnRepeat = .14;
          }
        }
        state = stepRun(state, { drop: pendingDrop }, dt);
        pendingDrop = false;
      }
      paint(this.graphics);
      this.clearLabel.setVisible(state.lastClear > 0);
      if (state.lastClear > 0) {
        this.clearLabel.setText(`${state.lastClear} clear`);
        this.clearLabel.setAlpha(Math.min(1, state.lastClear));
      }
      $("[data-score]").textContent = String(state.score);
      $("[data-cleared]").textContent = String(state.cleared);
      $("[data-level]").textContent = String(state.level);
      const next = $("[data-next]");
      next.style.setProperty("--next-color", `#${(COLORS[state.next] ?? 0xffffff).toString(16).padStart(6, "0")}`);
      next.setAttribute("aria-label", `Next tile: ${state.next}`);
      if (state.score > best) {
        best = state.score;
        try { localStorage.setItem(bestKey, String(best)); } catch { /* Local best is optional. */ }
      }
      $("[data-best]").textContent = String(best);
      pauseButton.disabled = !["active", "paused"].includes(state.mode);
      if (state.mode === "over" && previousMode !== "over") {
        showOverlay("Spoke full.", `${state.score} points. ${state.cleared} tiles cleared.`, "Play again");
        actionHandler = start;
        status.textContent = state.score > 0 ? "" : "Clear tiles to set a score.";
        void saveScore();
      }
      previousMode = state.mode;
    }
  }

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: $("[data-canvas]"),
    width: SIZES.width,
    height: SIZES.width,
    backgroundColor: "#111411",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: HexStackScene,
    render: { antialias: true, pixelArt: false, roundPixels: true },
  });

  const onVisibility = () => {
    if (document.visibilityState === "hidden" && state.mode === "active") pause();
  };
  const onPageHide = () => dispose();
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    game.destroy(true);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clearPressed);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  return dispose;
}
