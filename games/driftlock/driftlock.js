import Phaser from "phaser";
import { createRun, EXIT, GRAVITY, pulseGravity, SECTORS, stepRun, WORLD } from "./simulation.js";

const BEST_KEY = "hvn-games:driftlock:best";
const KEY_MAP = Object.freeze({
  left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"],
  up: ["ArrowUp", "KeyW"], down: ["ArrowDown", "KeyS"],
});
const COLORS = ["#1e3934", "#2b3535", "#203d42", "#393834", "#202c37", "#314037"];

function readBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch { return null; }
}
function saveBest(seconds) {
  try {
    const old = readBest();
    if (old === null || seconds < old) localStorage.setItem(BEST_KEY, String(seconds));
    return old === null || seconds < old ? seconds : old;
  } catch { return readBest(); }
}
const formatTime = (seconds) => {
  const n = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};

export function mountDriftlock(host) {
  host.innerHTML = `
    <section class="driftlock" aria-label="Driftlock game">
      <div class="driftlock-top">
        <div class="driftlock-stats" aria-label="Run status">
          <div><span>sector</span><strong id="drift-sector">0 / 6</strong></div>
          <div><span>cells</span><strong id="drift-cells">0 / 3</strong></div>
          <div><span>pulse</span><strong id="drift-charge">1</strong></div>
          <div><span>time</span><strong id="drift-time">0:00</strong></div>
        </div>
        <button class="driftlock-pause" id="drift-pause" type="button" aria-label="Pause" disabled>Ⅱ</button>
      </div>
      <p class="driftlock-status" id="drift-status" role="status">The chamber is awake. Collect three signal cells, then reach the amber hatch.</p>
      <div class="driftlock-stage" id="drift-stage" aria-label="Game playfield">
        <div class="driftlock-overlay" id="drift-overlay">
          <p class="driftlock-overline" id="drift-overline">Flight log 01</p>
          <h2 id="drift-title">Gravity went loose.</h2>
          <p id="drift-copy">Gather all three signal cells. The hatch opens when the chamber is repaired. Space spends a pulse to turn gravity.</p>
          <button class="driftlock-start" id="drift-action" type="button">Start the repair run</button>
          <p class="driftlock-best" id="drift-best"></p>
        </div>
      </div>
      <div class="driftlock-controls" aria-label="Touch controls">
        <button data-drift-key="left" aria-label="Thrust left">←</button>
        <button data-drift-key="right" aria-label="Thrust right">→</button>
        <button data-drift-key="up" aria-label="Thrust up">↑</button>
        <button data-drift-key="down" aria-label="Thrust down">↓</button>
        <button class="drift-pulse" id="drift-pulse" aria-label="Rotate gravity">↻ Pulse</button>
      </div>
      <div class="driftlock-actions">
        <button class="driftlock-secondary" id="drift-home" type="button">All games</button>
        <p>Arrows or WASD thrust · Space rotates gravity · P pauses · R restarts</p>
      </div>
    </section>`;
  const $ = (id) => host.querySelector(id);
  const stage = $("#drift-stage");
  const status = $("#drift-status");
  const overlay = $("#drift-overlay");
  const action = $("#drift-action");
  const pauseButton = $("#drift-pause");
  const keys = new Set();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let state = null, finished = false, previousMode = "ready";
  const best = readBest();
  $("#drift-best").textContent = best === null ? "Best time stays in this browser." : `Local best · ${formatTime(best)}`;
  $("#drift-home").addEventListener("click", () => { window.location.href = import.meta.env.BASE_URL; });
  let nextAction = () => start();
  const setOverlay = (title, copy, label, callback = start) => {
    $("#drift-title").textContent = title;
    $("#drift-copy").textContent = copy;
    action.textContent = label;
    nextAction = callback;
    overlay.hidden = false;
  };
  const start = () => {
    state = createRun();
    finished = false;
    previousMode = "active";
    overlay.hidden = true;
    pauseButton.disabled = false;
    status.textContent = "Dock: collect three cells, then steer into the amber hatch.";
  };
  action.addEventListener("click", () => nextAction());
  pauseButton.addEventListener("click", () => {
    if (!state || state.mode !== "active") return;
    state = { ...state, mode: "paused" };
    pauseButton.textContent = "▶";
    pauseButton.setAttribute("aria-label", "Resume");
    setOverlay("Paused.", "The station holds still while you take a breath.", "Resume run", () => {
      state = { ...state, mode: "active" };
      overlay.hidden = true;
      pauseButton.textContent = "Ⅱ";
      pauseButton.setAttribute("aria-label", "Pause");
    });
  });
  $("#drift-pulse").addEventListener("click", () => { if (state) state = pulseGravity(state); });
  for (const button of host.querySelectorAll("[data-drift-key]")) {
    const name = button.dataset.driftKey;
    const down = (event) => { event.preventDefault(); keys.add(name); button.setPointerCapture?.(event.pointerId); };
    const up = (event) => { event.preventDefault(); keys.delete(name); };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
  }
  const keyboardDown = (event) => {
    for (const [name, codes] of Object.entries(KEY_MAP)) if (codes.includes(event.code)) { keys.add(name); event.preventDefault(); }
    if (event.code === "Space") { if (!event.repeat && state) state = pulseGravity(state); event.preventDefault(); }
    if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat && state?.mode === "active") pauseButton.click();
    if (event.code === "KeyR" && !event.repeat) start();
  };
  const keyboardUp = (event) => {
    for (const [name, codes] of Object.entries(KEY_MAP)) if (codes.includes(event.code)) keys.delete(name);
  };
  window.addEventListener("keydown", keyboardDown);
  window.addEventListener("keyup", keyboardUp);

  class DriftScene extends Phaser.Scene {
    create() { this.ink = this.add.graphics(); }
    update(_time, delta) {
      if (!state) { this.draw(null); return; }
      if (state.mode === "active") state = stepRun(state, {
        left: keys.has("left"), right: keys.has("right"), up: keys.has("up"), down: keys.has("down"), reducedMotion,
      }, delta / 1000);
      this.syncHud();
      this.draw(state);
      if ((state.mode === "won" || state.mode === "lost") && !finished) {
        finished = true;
        pauseButton.disabled = true;
        if (state.mode === "won") {
          const record = saveBest(state.result.seconds);
          $("#drift-overline").textContent = state.result.perfect ? "Clean orbit" : "Flight complete";
          status.textContent = "All six sectors repaired. You made it home.";
          setOverlay("You brought the station back.", `${formatTime(state.result.seconds)} run · ${state.result.perfect ? "no hits" : `${state.result.hits} hit`}`, "Fly again");
          $("#drift-best").textContent = `Local best · ${formatTime(record)} · saved only here`;
        } else {
          $("#drift-overline").textContent = "Flight log closed";
          status.textContent = state.result.reason;
          setOverlay("The signal went quiet.", `${state.result.reason} Run time ${formatTime(state.result.seconds)}.`, "Try again");
        }
      }
      if (state.mode === "active" && previousMode !== "active") {
        pauseButton.textContent = "Ⅱ";
        pauseButton.setAttribute("aria-label", "Pause");
      }
      previousMode = state.mode;
    }
    syncHud() {
      const sector = SECTORS[state.sector];
      $("#drift-sector").textContent = `${String(state.sector + 1).padStart(2, "0")} / 06`;
      $("#drift-cells").textContent = `${state.collected.length} / 3`;
      $("#drift-charge").textContent = String(state.charge);
      $("#drift-charge").setAttribute("aria-label", `${state.charge} gravity pulses`);
      $("#drift-time").textContent = formatTime(state.elapsed);
      $("#drift-time").setAttribute("aria-label", `${sector.name}, ${formatTime(state.elapsed)} elapsed`);
      if (state.collected.length === 3) status.textContent = `${sector.name}: cells secured. Steer into the amber hatch.`;
      else status.textContent = `${sector.name}: follow gravity ${GRAVITY[(state.sector + state.gravityTurn) % 4].label}. ${3 - state.collected.length} cells to go.`;
    }
    draw(run) {
      const g = this.ink, sectorIndex = run?.sector ?? 0;
      g.clear();
      g.fillStyle(COLORS[sectorIndex], 1); g.fillRect(0, 0, WORLD.width, WORLD.height);
      g.lineStyle(2, 0x7e988b, 0.42); g.strokeRoundedRect(18, 18, WORLD.width - 36, WORLD.height - 36, 24);
      g.lineStyle(1, 0x91a99a, 0.13);
      for (let x = 72; x < WORLD.width; x += 72) g.lineBetween(x, 28, x, WORLD.height - 28);
      for (let y = 70; y < WORLD.height; y += 70) g.lineBetween(28, y, WORLD.width - 28, y);
      const gravity = GRAVITY[((run?.sector ?? 0) + (run?.gravityTurn ?? 0)) % 4];
      g.lineStyle(2, 0xf0be66, 0.72);
      g.lineBetween(450, 260, 450 + gravity.x * 34, 260 + gravity.y * 34);
      g.fillStyle(0xf0be66, 0.9); g.fillCircle(450 + gravity.x * 34, 260 + gravity.y * 34, 4);
      const cells = SECTORS[sectorIndex].cells;
      cells.forEach(([x, y], i) => {
        if (run?.collected.includes(i)) return;
        g.lineStyle(2, 0xc5dcaa, 0.72); g.strokeCircle(x, y, 17);
        g.fillStyle(0xc5dcaa, 0.95); g.fillCircle(x, y, 6);
      });
      const elapsed = run?.elapsed ?? 0;
      const angle = reducedMotion ? 0 : elapsed * SECTORS[sectorIndex].rate;
      const [hx, hy] = SECTORS[sectorIndex].hazard;
      const hazardX = hx + Math.cos(angle) * (95 + sectorIndex * 7);
      const hazardY = hy + Math.sin(angle * 1.37) * 88;
      g.lineStyle(2, 0xe0785d, 0.25); g.strokeCircle(hx, hy, 96 + sectorIndex * 7);
      g.fillStyle(0xe0785d, 0.18); g.fillCircle(hazardX, hazardY, 31);
      g.fillStyle(0xe0785d, 1); g.fillCircle(hazardX, hazardY, 13);
      g.lineStyle(2, 0xf0be66, run?.collected.length === 3 ? 1 : 0.35); g.strokeCircle(EXIT.x, EXIT.y, EXIT.radius);
      g.fillStyle(0xf0be66, run?.collected.length === 3 ? 0.95 : 0.3); g.fillRoundedRect(EXIT.x - 8, EXIT.y - 23, 16, 46, 4);
      if (run) {
        g.fillStyle(0xf1ebd9, 1); g.fillCircle(run.x, run.y, WORLD.radius);
        const heading = Math.atan2(run.vy, run.vx);
        const speed = Math.hypot(run.vx, run.vy);
        if (speed > 22) {
          g.lineStyle(2, 0x98b59c, 0.9);
          g.lineBetween(run.x - Math.cos(heading) * 18, run.y - Math.sin(heading) * 18, run.x - Math.cos(heading) * (27 + Math.min(12, speed / 30)), run.y - Math.sin(heading) * (27 + Math.min(12, speed / 30)));
        }
      } else {
        g.lineStyle(2, 0x98b59c, 0.85); g.strokeCircle(88, 260, WORLD.radius);
      }
    }
  }
  const game = new Phaser.Game({ type: Phaser.AUTO, parent: stage, width: WORLD.width, height: WORLD.height, transparent: false,
    backgroundColor: "#1e3934", antialias: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { pixelArt: false, antialias: true, roundPixels: true }, scene: DriftScene,
  });
  return () => { window.removeEventListener("keydown", keyboardDown); window.removeEventListener("keyup", keyboardUp); game.destroy(true); };
}
