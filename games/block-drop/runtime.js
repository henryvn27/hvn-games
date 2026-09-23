import Phaser from "phaser";
import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { BLOCK_DROP, collides, fallInterval, hardDrop, holdPiece, matrixFor, movePiece, newRun, rotatePiece, softDrop, startRun, stepRun, togglePause } from "./simulation.js";
import "./block-drop.css";

const COLORS = Object.freeze({
  I: { fill: 0x69c7c2, css: "#69c7c2" },
  J: { fill: 0x7492db, css: "#7492db" },
  L: { fill: 0xe39a65, css: "#e39a65" },
  O: { fill: 0xe4c968, css: "#e4c968" },
  S: { fill: 0x8dbb76, css: "#8dbb76" },
  T: { fill: 0xb18acb, css: "#b18acb" },
  Z: { fill: 0xd8756a, css: "#d8756a" },
});
const BEST_KEY = "hvn-games:block-drop:best";
const WELL = { columns: BLOCK_DROP.columns, rows: BLOCK_DROP.rows };
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };

export function mountBlockDrop(host) {
  host.innerHTML = `
    <section class="block-drop" aria-label="Block Drop">
      <div class="block-drop-toolbar">
        <dl class="block-drop-stats" aria-label="Round score">
          <div><dt>score</dt><dd data-score>0</dd></div>
          <div><dt>rows</dt><dd data-lines>0</dd></div>
          <div><dt>level</dt><dd data-level>1</dd></div>
          <div><dt>best</dt><dd data-best>0</dd></div>
        </dl>
        <button type="button" data-pause disabled>Pause</button>
      </div>
      <div class="block-drop-previews" aria-label="Piece queue">
        <div class="block-drop-preview"><span>hold</span><div class="block-drop-mini" data-held aria-label="No held piece"></div></div>
        <div class="block-drop-preview block-drop-next"><span>next</span><div class="block-drop-mini" data-next aria-label="Next piece"></div></div>
      </div>
      <div class="block-drop-board" data-board aria-label="Falling block board">
        <div class="block-drop-canvas" data-canvas></div>
        <div class="block-drop-overlay" data-overlay role="dialog" aria-labelledby="block-drop-title" aria-describedby="block-drop-copy">
          <div class="block-drop-message">
            <h2 data-title id="block-drop-title">Make a clean row.</h2>
            <p data-copy id="block-drop-copy">Place the falling pieces to clear full rows. If the stack reaches the top, the run is over.</p>
            <button class="block-drop-action" type="button" data-action>Start</button>
            <form class="block-drop-name" data-name hidden>
              <label for="block-drop-player-name">Name or initials for the Block Drop board<input id="block-drop-player-name" maxlength="16" autocomplete="nickname" placeholder="Your name or initials"></label>
              <button type="submit">Save score</button>
            </form>
            <span class="block-drop-status" data-status role="status" aria-live="polite"></span>
          </div>
        </div>
      </div>
      <div class="block-drop-controls" aria-label="Touch controls">
        <button type="button" data-left aria-label="Move left">←</button>
        <button type="button" data-rotate>Rotate</button>
        <button type="button" data-right aria-label="Move right">→</button>
        <button type="button" data-down>↓ Soft drop</button>
        <button type="button" data-hard-drop>Drop</button>
        <button type="button" data-hold>Hold</button>
      </div>
      <p class="block-drop-help">← / → move · ↑ or X rotate · Z reverse · C hold · ↓ soft drop · Space drop · P pause</p>
    </section>`;

  const $ = (selector) => host.querySelector(selector);
  const overlay = $(`[data-overlay]`);
  const actionButton = $(`[data-action]`);
  const pauseButton = $(`[data-pause]`);
  const nameForm = $(`[data-name]`);
  const status = $(`[data-status]`);
  const nameInput = $(`#block-drop-player-name`);
  const boardElement = $(`[data-board]`);
  let state = newRun();
  let best = readBest();
  let lastMode = state.mode;
  let lastClearCount = 0;
  let savedThisRun = false;
  let disposed = false;
  let actionHandler = () => {};
  let heldDirection = 0;
  let moveHeldFor = 0;
  let moveRepeatFor = 0;
  let softDropHeld = false;
  let softDropFor = 0;
  let clearKeys = () => {};
  const heldKeys = new Set();

  function renderMini(node, type) {
    if (!type) {
      node.innerHTML = Array.from({ length: 16 }, () => `<i></i>`).join("");
      node.setAttribute("aria-label", "No held piece");
      node.style.removeProperty("--piece-color");
      return;
    }
    const matrix = matrixFor({ type, rotation: 0 });
    const xOffset = Math.floor((4 - matrix[0].length) / 2);
    const yOffset = Math.floor((4 - matrix.length) / 2);
    const filled = new Set();
    matrix.forEach((row, y) => row.forEach((cell, x) => { if (cell) filled.add((y + yOffset) * 4 + x + xOffset); }));
    node.innerHTML = Array.from({ length: 16 }, (_unused, index) => `<i${filled.has(index) ? " data-filled" : ""}></i>`).join("");
    node.style.setProperty("--piece-color", COLORS[type].css);
    node.setAttribute("aria-label", `${type} piece`);
  }

  function renderHud() {
    $(`[data-score]`).textContent = String(state.score);
    $(`[data-lines]`).textContent = String(state.lines);
    $(`[data-level]`).textContent = String(state.level);
    $(`[data-best]`).textContent = String(best);
    renderMini($(`[data-held]`), state.held);
    renderMini($(`[data-next]`), state.queue[0]);
    pauseButton.disabled = !["active", "paused"].includes(state.mode);
    pauseButton.textContent = state.mode === "paused" ? "Resume" : "Pause";
  }

  function showOverlay(title, copy, label, next) {
    $(`[data-title]`).textContent = title;
    $(`[data-copy]`).textContent = copy;
    actionButton.textContent = label;
    actionHandler = next;
    overlay.hidden = false;
  }

  function start() {
    state = startRun();
    lastMode = "active";
    lastClearCount = state.clearCount;
    savedThisRun = false;
    status.textContent = "";
    nameForm.hidden = true;
    heldKeys.clear();
    clearKeys();
    overlay.hidden = true;
    actionHandler = start;
    window.Shelf?.record("game_play", { id: "block-drop" });
    renderHud();
  }
  actionHandler = start;
  actionButton.addEventListener("click", () => actionHandler());

  async function saveScore() {
    if (savedThisRun || state.score < 1) return;
    const playerName = getPlayerName();
    if (!playerName) {
      nameForm.hidden = false;
      status.textContent = "Add your name or initials before saving this score.";
      nameInput.focus();
      return;
    }
    const entry = recordLeaderboardScore("block-drop", state.score, state.lines, Math.floor(state.elapsed));
    if (!entry) { status.textContent = "The score could not be saved in this browser."; return; }
    savedThisRun = true;
    nameForm.hidden = true;
    const online = window.HVNOnlineLeaderboard;
    if (!online?.configured) { status.textContent = `Saved as ${playerName} in this browser.`; return; }
    try {
      const result = await online.submit("block-drop", {
        name: playerName,
        score: state.score,
        packets: state.lines,
        seconds: Math.floor(state.elapsed),
        submissionId: online.submissionId("block-drop", entry),
      });
      status.textContent = result.status === "online"
        ? `Saved as ${playerName} on the shared Block Drop board.`
        : `Saved as ${playerName} here. The shared board could not be reached.`;
    } catch {
      status.textContent = `Saved as ${playerName} here. The shared board could not be reached.`;
    }
  }

  nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!setPlayerName(nameInput.value)) {
      status.textContent = "Use your own name or initials, not the example tag.";
      nameInput.focus();
      return;
    }
    void saveScore();
  });

  function finishRun() {
    showOverlay("Stack reached the top.", `${state.score} points · ${state.lines} rows · level ${state.level}.`, "Play again", start);
    if (state.score > 0) {
      if (getPlayerName()) void saveScore();
      else {
        nameForm.hidden = false;
        status.textContent = "Add a name once to save scores to the board.";
      }
    } else status.textContent = "Place a piece to get on the board.";
  }

  function pause() {
    if (state.mode === "active") {
      state = togglePause(state);
      clearKeys();
      showOverlay("Paused.", "The pieces and clock are stopped.", "Resume", () => {
        state = togglePause(state);
        overlay.hidden = true;
        pauseButton.textContent = "Pause";
      });
      pauseButton.textContent = "Resume";
    } else if (state.mode === "paused") {
      state = togglePause(state);
      overlay.hidden = true;
      pauseButton.textContent = "Pause";
    }
  }
  pauseButton.addEventListener("click", pause);

  function onKeyDown(event) {
    if (event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable=true]")) return;
    if (["KeyP", "Escape"].includes(event.code) && !event.repeat) { pause(); return; }
    if (state.mode !== "active") return;
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
    if (heldKeys.has(event.code) || event.repeat) return;
    heldKeys.add(event.code);
    if (["ArrowLeft", "KeyA"].includes(event.code)) { heldDirection = -1; state = movePiece(state, -1); moveHeldFor = 0; moveRepeatFor = 0; }
    else if (["ArrowRight", "KeyD"].includes(event.code)) { heldDirection = 1; state = movePiece(state, 1); moveHeldFor = 0; moveRepeatFor = 0; }
    else if (event.code === "ArrowDown") { softDropHeld = true; softDropFor = 0; state = softDrop(state); }
    else if (["ArrowUp", "KeyX"].includes(event.code)) state = rotatePiece(state, 1);
    else if (event.code === "KeyZ") state = rotatePiece(state, -1);
    else if (event.code === "KeyC") state = holdPiece(state);
    else if (event.code === "Space") state = hardDrop(state);
  }
  function onKeyUp(event) {
    heldKeys.delete(event.code);
    if (["ArrowLeft", "KeyA"].includes(event.code) && heldDirection < 0) heldDirection = 0;
    if (["ArrowRight", "KeyD"].includes(event.code) && heldDirection > 0) heldDirection = 0;
    if (event.code === "ArrowDown") softDropHeld = false;
  }
  clearKeys = () => { heldKeys.clear(); heldDirection = 0; softDropHeld = false; moveHeldFor = 0; moveRepeatFor = 0; softDropFor = 0; };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);

  function bindRepeat(button, direction) {
    button.addEventListener("pointerdown", (event) => {
      if (state.mode !== "active") return;
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      heldDirection = direction;
      state = movePiece(state, direction);
      moveHeldFor = 0;
      moveRepeatFor = 0;
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"]) button.addEventListener(type, () => { if (heldDirection === direction) heldDirection = 0; });
  }
  bindRepeat($(`[data-left]`), -1);
  bindRepeat($(`[data-right]`), 1);
  const bindPress = (selector, callback) => $(selector).addEventListener("click", () => { if (state.mode === "active") state = callback(state); });
  bindPress(`[data-rotate]`, (run) => rotatePiece(run, 1));
  bindPress(`[data-hard-drop]`, (run) => hardDrop(run));
  bindPress(`[data-hold]`, (run) => holdPiece(run));
  const downButton = $(`[data-down]`);
  downButton.addEventListener("pointerdown", (event) => {
    if (state.mode !== "active") return;
    event.preventDefault();
    downButton.setPointerCapture?.(event.pointerId);
    softDropHeld = true;
    softDropFor = 0;
    state = softDrop(state);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"]) downButton.addEventListener(type, () => { softDropHeld = false; });

  const drawTile = (graphics, x, y, cell, type, alpha = 1, outline = false) => {
    if (outline) {
      graphics.lineStyle(Math.max(1, Math.floor(cell / 14)), COLORS[type].fill, alpha);
      graphics.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
    } else {
      graphics.fillStyle(COLORS[type].fill, alpha);
      graphics.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      graphics.lineStyle(1, 0x172019, .72);
      graphics.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
    }
  };
  const ghostY = () => {
    if (!state.current) return 0;
    let distance = 0;
    while (!collides(state.board, state.current, 0, distance + 1)) distance += 1;
    return state.current.y + distance;
  };

  class BlockDropScene extends Phaser.Scene {
    create() {
      this.graphics = this.add.graphics();
      this.scale.on("resize", () => this.paint());
      this.paint();
    }
    paint() {
      if (!this.graphics) return;
      const graphics = this.graphics;
      const width = this.scale.width;
      const height = this.scale.height;
      const cell = Math.floor(Math.min((width - 24) / WELL.columns, (height - 24) / WELL.rows, 34));
      const left = Math.floor((width - cell * WELL.columns) / 2);
      const top = Math.floor((height - cell * WELL.rows) / 2);
      graphics.clear();
      graphics.fillStyle(0x18201a, 1);
      graphics.fillRect(0, 0, width, height);
      graphics.fillStyle(0x111611, 1);
      graphics.fillRect(left, top, cell * WELL.columns, cell * WELL.rows);
      graphics.lineStyle(1, 0x29332b, 1);
      for (let column = 0; column <= WELL.columns; column += 1) graphics.lineBetween(left + column * cell, top, left + column * cell, top + cell * WELL.rows);
      for (let row = 0; row <= WELL.rows; row += 1) graphics.lineBetween(left, top + row * cell, left + cell * WELL.columns, top + row * cell);

      state.board.forEach((row, y) => row.forEach((type, x) => { if (type) drawTile(graphics, left + x * cell, top + y * cell, cell, type); }));
      if (state.current) {
        const shape = matrixFor(state.current);
        const landingY = ghostY();
        shape.forEach((row, y) => row.forEach((filled, x) => {
          if (!filled) return;
          drawTile(graphics, left + (state.current.x + x) * cell, top + (landingY + y) * cell, cell, state.current.type, .35, true);
          drawTile(graphics, left + (state.current.x + x) * cell, top + (state.current.y + y) * cell, cell, state.current.type);
        }));
      }
    }
    update(_time, delta) {
      if (state.mode === "active") {
        const dt = Math.min(.05, Math.max(0, delta / 1000));
        if (heldDirection) {
          moveHeldFor += dt;
          if (moveHeldFor >= .18) {
            moveRepeatFor += dt;
            while (moveRepeatFor >= .075) { state = movePiece(state, heldDirection); moveRepeatFor -= .075; }
          }
        }
        if (softDropHeld) {
          softDropFor += dt;
          while (softDropFor >= .045) { state = softDrop(state); softDropFor -= .045; }
        }
        state = stepRun(state, dt);
      }
      if (state.score > best) {
        best = state.score;
        try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* A local best is optional. */ }
      }
      if (state.clearCount !== lastClearCount) {
        lastClearCount = state.clearCount;
        if (state.lastClear === 4) window.Shelf?.record("block_drop_sweep", {});
      }
      if (state.mode === "over" && lastMode !== "over") finishRun();
      lastMode = state.mode;
      renderHud();
      this.paint();
    }
  }

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: $(`[data-canvas]`),
    width: 420,
    height: 640,
    backgroundColor: "#18201a",
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene: BlockDropScene,
    render: { antialias: false, roundPixels: true },
    fps: { target: 60, forceSetTimeOut: false },
  });

  const onVisibility = () => { if (document.visibilityState === "hidden" && state.mode === "active") pause(); };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    game.destroy(true);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clearKeys);
    document.removeEventListener("visibilitychange", onVisibility);
    boardElement.replaceChildren();
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", dispose, { once: true });
  renderHud();
  return dispose;
}
