import policyArtifact from "./policy.json";
import { createSpaceDodgerPolicy } from "./policy.mjs";
import { createSeededRandom, DODGER_HEIGHT, DODGER_STEP_SECONDS, DODGER_WIDTH, SpaceDodgerSimulation } from "./simulation.mjs";

const DEFAULT_SEED = 20260925;
const KEY_CODES = Object.freeze({ ArrowUp: "w", ArrowLeft: "a", ArrowDown: "s", ArrowRight: "d" });
const SHIP_KEYS = ["w", "a", "s", "d"];

function formatScore(value) {
  return String(value).padStart(4, "0");
}

function shipPath(context, x, y, accent = "#80e0d6") {
  context.beginPath();
  context.moveTo(x, y - 19);
  context.lineTo(x + 15, y + 15);
  context.lineTo(x + 4, y + 10);
  context.lineTo(x, y + 14);
  context.lineTo(x - 4, y + 10);
  context.lineTo(x - 15, y + 15);
  context.closePath();
  context.fillStyle = accent;
  context.fill();
  context.fillStyle = "#233b57";
  context.fillRect(Math.round(x - 3), Math.round(y - 7), 6, 12);
}

function drawSimulation(context, game, decision, elapsed) {
  context.clearRect(0, 0, DODGER_WIDTH, DODGER_HEIGHT);
  context.fillStyle = "#0b1427";
  context.fillRect(0, 0, DODGER_WIDTH, DODGER_HEIGHT);
  for (let index = 0; index < 7; index += 1) {
    context.fillStyle = ["#10192e", "#141b31", "#191e34", "#202036", "#292237", "#33263a", "#3e2b3d"][index];
    context.fillRect(0, 150 + index * 48, DODGER_WIDTH, 49);
  }
  for (let index = 0; index < 90; index += 1) {
    const depth = index % 3 + 1;
    context.fillStyle = index % 4 ? "#637b99" : "#c3d6d9";
    context.fillRect((index * 137 + 29) % 640, (index * 79 + elapsed * depth * 7) % 480, depth === 3 ? 2 : 1, depth === 3 ? 2 : 1);
  }

  context.save();
  context.beginPath();
  context.arc(560, 565, 315, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = "#d28565";
  context.fillRect(190, 240, 450, 240);
  for (let row = 0; row < 58; row += 1) {
    context.fillStyle = ["#9f584e", "#aa6251", "#b96e57", "#ad5e50", "#925049"][Math.floor(row / 5) % 5];
    context.fillRect(180, 250 + row * 4, 460, 4);
  }
  context.restore();
  context.strokeStyle = "#d99271";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(560, 565, 317, Math.PI, Math.PI * 2);
  context.stroke();
  context.fillStyle = "#586274";
  context.fillRect(69, 132, 68, 3);
  context.fillRect(73, 119, 19, 27);
  context.fillRect(115, 119, 19, 27);

  if (decision?.projected) {
    context.save();
    context.setLineDash([4, 5]);
    context.strokeStyle = "rgba(223, 255, 115, .72)";
    context.beginPath();
    context.moveTo(game.ship.x, game.ship.y);
    context.lineTo(decision.projected.x, decision.projected.y);
    if (decision.target) context.lineTo(decision.target.x, decision.target.y);
    context.stroke();
    context.restore();
    context.strokeStyle = "#dfff73";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(decision.projected.x, decision.projected.y, 8, 0, Math.PI * 2);
    context.stroke();
  }

  for (const shot of game.shots) {
    context.fillStyle = "#75e4de";
    context.fillRect(shot.x - 2, shot.y - 9, 4, 15);
  }
  for (const enemy of game.enemies) {
    context.fillStyle = enemy.kind === "rock" ? "#9b7068" : "#e17f76";
    context.fillRect(enemy.x - enemy.r, enemy.y - enemy.r, enemy.r * 2, enemy.r * 2);
    context.fillStyle = enemy.kind === "rock" ? "#503a46" : "#623447";
    context.fillRect(enemy.x - enemy.r * 0.55, enemy.y - enemy.r * 0.45, enemy.r * 1.1, enemy.r * 0.9);
  }
  if (game.boss) {
    context.fillStyle = "#925268";
    context.fillRect(game.boss.x - 50, game.boss.y - 18, 100, 36);
    context.fillStyle = "#80d9d0";
    context.fillRect(game.boss.x - 10, game.boss.y - 8, 20, 14);
    context.fillStyle = "#162337";
    context.fillRect(180, 16, 280, 8);
    context.fillStyle = "#e79284";
    context.fillRect(180, 16, 280 * Math.max(0, game.boss.hp / game.boss.max), 8);
  }
  for (const bullet of game.hostile) {
    context.fillStyle = "#fa946c";
    context.fillRect(bullet.x - 4, bullet.y - 4, 8, 8);
  }
  for (const pickup of game.pickups) {
    context.fillStyle = pickup.type === "repair" ? "#c4eaa4" : "#80e0d6";
    context.fillRect(pickup.x - 12, pickup.y - 12, 24, 24);
    context.fillStyle = "#15283a";
    context.font = "bold 16px sans-serif";
    context.textAlign = "center";
    context.fillText(pickup.type === "repair" ? "+" : "U", pickup.x, pickup.y + 6);
  }
  if (game.ship.hp > 0 && !(game.ship.inv > 0 && Math.floor(elapsed * 12) % 2)) {
    shipPath(context, game.ship.x, game.ship.y);
    context.fillStyle = "#f39568";
    context.fillRect(game.ship.x - 4, game.ship.y + 15, 8, 9 + Math.floor(elapsed * 16) % 3 * 3);
  }
}

export function mountSpaceDodgerAgent(root, { seed, base = "" } = {}) {
  if (!root) throw new Error("Space Dodger pilot needs a game root");
  const runSeed = Number.isSafeInteger(seed) && seed > 0 ? seed : DEFAULT_SEED;
  root.innerHTML = `
    <section class="panel arcade-panel shooter-panel dodger-agent-panel" aria-label="Space Dodger trained pilot">
      <div class="arcade-banner"><span>MARS / ORBITAL DEFENCE</span><span>POLICY FLIGHT / SEED ${runSeed}</span></div>
      <div class="arcade-stats"><span>SCORE <b data-dodger-score>0000</b></span><span data-dodger-best>RESEARCH RUN</span><span data-dodger-state>READY</span></div>
      <div class="shooter-status"><span data-dodger-wave>WAVE 01</span><span data-dodger-hull>HULL ●●●</span><span data-dodger-weapon>SINGLE SHOT</span></div>
      <div class="dodger-agent-layout">
        <div class="dodger-agent-play">
          <div class="arcade-stage"><canvas class="canvas" width="640" height="480" tabindex="0" aria-label="Space Dodger pilot view. The policy automatically fires and steers with WASD."></canvas>
            <div class="arcade-overlay" data-dodger-overlay><span class="kicker">MARS / POLICY FLIGHT</span><h2 data-dodger-overlay-title>Watch the pilot.</h2><p data-dodger-overlay-copy>It reads the traffic, chooses a WASD move, and fires automatically. This research run is not saved to scores or playtime.</p><button class="action" data-dodger-start>start pilot</button></div>
          </div>
          <p class="shooter-message" data-dodger-message aria-live="polite">The pilot is ready. Take over any time with WASD.</p>
          <div class="controls dodger-agent-controls"><button data-dodger-key="w">W ↑</button><button data-dodger-key="a">A ←</button><button data-dodger-key="s">S ↓</button><button data-dodger-key="d">D →</button><button data-dodger-pause disabled>Pause</button><button data-dodger-restart>Restart</button></div>
        </div>
        <aside class="dodger-pilot" aria-label="Pilot decision visualizer">
          <div class="dodger-pilot-header"><span>POLICY / 6 HZ</span><b data-dodger-mode>AUTOPILOT</b></div>
          <div class="dodger-pilot-choice"><span>CHOSEN MOVE</span><strong data-dodger-action>HOLD</strong></div>
          <div class="dodger-pilot-keys" aria-label="Selected movement keys">${SHIP_KEYS.map((key) => `<span data-dodger-key-light="${key}">${key.toUpperCase()}</span>`).join("")}</div>
          <div class="dodger-pilot-target"><span>CURRENT INTENT</span><strong data-dodger-target>Find a firing lane</strong><p data-dodger-reason>Automatic weapons are online.</p></div>
          <div class="dodger-pilot-threat"><span>NEAR-TERM DANGER</span><b data-dodger-threat-label>0%</b><progress data-dodger-threat max="100" value="0" aria-label="Estimated near-term collision danger"></progress></div>
          <p class="dodger-pilot-seed">Seed ${runSeed}. Human keys or direction buttons take control immediately. Return to pilot restores the policy.</p>
          <button class="button button-secondary" data-dodger-takeover>Take over</button>
          <a class="dodger-pilot-paper" href="${base}?game=space-dodger-rl">Read the policy paper →</a>
        </aside>
      </div>
      <p class="arcade-footnote">Pilot: WASD · Human takeover: WASD / arrows · P to pause · auto-fire</p>
    </section>`;

  const canvas = root.querySelector("canvas");
  const context = canvas.getContext("2d");
  const elements = {
    score: root.querySelector("[data-dodger-score]"),
    best: root.querySelector("[data-dodger-best]"),
    state: root.querySelector("[data-dodger-state]"),
    wave: root.querySelector("[data-dodger-wave]"),
    hull: root.querySelector("[data-dodger-hull]"),
    weapon: root.querySelector("[data-dodger-weapon]"),
    overlay: root.querySelector("[data-dodger-overlay]"),
    overlayTitle: root.querySelector("[data-dodger-overlay-title]"),
    overlayCopy: root.querySelector("[data-dodger-overlay-copy]"),
    start: root.querySelector("[data-dodger-start]"),
    pause: root.querySelector("[data-dodger-pause]"),
    message: root.querySelector("[data-dodger-message]"),
    mode: root.querySelector("[data-dodger-mode]"),
    action: root.querySelector("[data-dodger-action]"),
    target: root.querySelector("[data-dodger-target]"),
    reason: root.querySelector("[data-dodger-reason]"),
    threat: root.querySelector("[data-dodger-threat]"),
    threatLabel: root.querySelector("[data-dodger-threat-label]"),
    takeover: root.querySelector("[data-dodger-takeover]"),
    keyLights: [...root.querySelectorAll("[data-dodger-key-light]")],
  };
  const game = new SpaceDodgerSimulation({ random: createSeededRandom(runSeed) });
  const policy = createSpaceDodgerPolicy(policyArtifact);
  const manualKeys = new Set();
  let policyKeys = new Set();
  let decision = { keys: [], action: "HOLD", target: { label: "Find a firing lane", x: 320, y: 388 }, reason: "Automatic weapons are online.", threat: 0, projected: { x: 320, y: 400 } };
  let agentEnabled = true;
  let controlledByHuman = false;
  let dragTarget = null;
  let actionSteps = 0;
  let frame = 0;
  let lastTime = 0;
  let accumulator = 0;
  let destroyed = false;
  let previousState = game.state;

  function setOverlay(title, copy, buttonText, visible = true) {
    elements.overlayTitle.textContent = title;
    elements.overlayCopy.textContent = copy;
    elements.start.textContent = buttonText;
    elements.overlay.hidden = !visible;
  }

  function updateView() {
    elements.score.textContent = formatScore(game.score);
    elements.state.textContent = game.state.toUpperCase();
    elements.wave.textContent = `WAVE ${String(game.wave).padStart(2, "0")}${game.wave % 5 === 0 ? " / BOSS" : ""}`;
    elements.hull.textContent = `HULL ${"●".repeat(game.ship.hp)}${"○".repeat(3 - game.ship.hp)}`;
    elements.weapon.textContent = ["SINGLE SHOT", "TWIN SHOT", "TRIPLE SHOT"][game.ship.weapon - 1];
    elements.pause.disabled = game.state === "ready" || game.state === "over";
    elements.pause.textContent = game.state === "paused" ? "Resume" : "Pause";
    elements.mode.textContent = controlledByHuman ? "HUMAN CONTROL" : agentEnabled ? "AUTOPILOT" : "PILOT PAUSED";
    elements.action.textContent = controlledByHuman ? [...manualKeys].map((key) => key.toUpperCase()).join(" + ") || "HOLD" : decision.action;
    elements.target.textContent = controlledByHuman ? "Manual steering" : decision.target.label;
    elements.reason.textContent = controlledByHuman ? "Your input is driving this research-only run." : decision.reason;
    elements.threat.value = controlledByHuman ? 0 : decision.threat;
    elements.threatLabel.textContent = controlledByHuman ? "manual" : `${decision.threat}%`;
    elements.takeover.textContent = controlledByHuman ? "Return to pilot" : "Take over";
    elements.takeover.setAttribute("aria-pressed", String(controlledByHuman));
    for (const key of elements.keyLights) {
      key.classList.toggle("is-selected", (controlledByHuman ? manualKeys : policyKeys).has(key.dataset.dodgerKeyLight));
    }
    if (game.state !== previousState) {
      if (game.state === "over") setOverlay("Mars was hit.", `Score ${game.score} · wave ${game.wave}. This research run was not recorded.`, "fly again");
      else if (game.state === "paused") setOverlay("Paused.", "The starfield is waiting. Resume when you’re ready.", "resume flight");
      else if (game.state === "running") setOverlay("", "", "", false);
      previousState = game.state;
    }
  }

  function start() {
    if (game.state === "over") {
      game.reset();
      manualKeys.clear();
      dragTarget = null;
      policyKeys.clear();
      actionSteps = 0;
      controlledByHuman = false;
      agentEnabled = true;
      decision = policy.act(game.observe());
    }
    if (game.state === "paused") game.resume();
    else game.start();
    previousState = "ready";
    setOverlay("", "", "", false);
    updateView();
  }

  function restart() {
    manualKeys.clear();
    game.reset();
    policyKeys = new Set();
    decision = policy.act(game.observe());
    actionSteps = 0;
    controlledByHuman = false;
    agentEnabled = true;
    previousState = "over";
    start();
  }

  function takeControl() {
    if (game.state === "ready") start();
    if (game.state !== "running") return;
    controlledByHuman = true;
    agentEnabled = false;
    elements.message.textContent = "Human control / the game keeps firing automatically.";
    updateView();
  }

  function returnToPilot() {
    if (game.state !== "running") return;
    controlledByHuman = false;
    agentEnabled = true;
    manualKeys.clear();
    dragTarget = null;
    policyKeys = new Set();
    actionSteps = 0;
    decision = policy.act(game.observe());
    elements.message.textContent = "Pilot control / choosing its next move.";
    updateView();
  }

  function handleKeyDown(event) {
    if (destroyed || (event.target instanceof Element && event.target.closest("button, select, input, textarea, a"))) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = KEY_CODES[event.key] || event.key.toLowerCase();
    if (key === "p") {
      event.preventDefault();
      togglePause();
      return;
    }
    if (key === "r") {
      event.preventDefault();
      restart();
      return;
    }
    if (!SHIP_KEYS.includes(key)) return;
    event.preventDefault();
    if (game.state === "ready") start();
    if (game.state !== "running") return;
    takeControl();
    manualKeys.add(key);
    updateView();
  }

  function handleKeyUp(event) {
    const key = KEY_CODES[event.key] || event.key.toLowerCase();
    if (SHIP_KEYS.includes(key)) {
      manualKeys.delete(key);
      updateView();
    }
  }

  function togglePause() {
    if (game.state === "running") {
      manualKeys.clear();
      dragTarget = null;
      game.pause();
    }
    else if (game.state === "paused") game.resume();
    updateView();
  }

  function tick(now) {
    if (destroyed) return;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
    lastTime = now;
    if (game.state === "running") {
      accumulator = Math.min(accumulator + delta, DODGER_STEP_SECONDS * 3);
      while (accumulator >= DODGER_STEP_SECONDS && game.state === "running") {
        if (agentEnabled && !controlledByHuman && actionSteps <= 0) {
          decision = policy.act(game.observe());
          policyKeys = new Set(decision.keys);
          actionSteps = 5;
        }
        const keys = controlledByHuman ? manualKeys : agentEnabled ? policyKeys : new Set();
        game.step(DODGER_STEP_SECONDS, { keys, drag: dragTarget });
        actionSteps = Math.max(0, actionSteps - 1);
        accumulator -= DODGER_STEP_SECONDS;
      }
      updateView();
    }
    drawSimulation(context, game, controlledByHuman ? null : decision, game.elapsed);
    frame = requestAnimationFrame(tick);
  }

  const blur = () => {
    manualKeys.clear();
    dragTarget = null;
    if (controlledByHuman) {
      controlledByHuman = false;
      agentEnabled = true;
      actionSteps = 0;
    }
    if (game.state === "running") game.pause();
    updateView();
  };
  const visibility = () => { if (document.hidden) blur(); };
  const onStart = () => { start(); canvas.focus({ preventScroll: true }); };
  const onRestart = () => { restart(); canvas.focus({ preventScroll: true }); };
  const onTakeover = () => {
    if (controlledByHuman) returnToPilot();
    else takeControl();
    canvas.focus({ preventScroll: true });
  };
  const onKeyButton = (event) => {
    const button = event.target.closest("[data-dodger-key]");
    if (!button) return;
    button.setPointerCapture?.(event.pointerId);
    const key = button.dataset.dodgerKey;
    if (game.state === "ready") start();
    takeControl();
    canvas.focus({ preventScroll: true });
    manualKeys.add(key);
    updateView();
  };
  const onKeyButtonRelease = (event) => {
    const button = event.target.closest("[data-dodger-key]");
    if (button) manualKeys.delete(button.dataset.dodgerKey);
    updateView();
  };
  const onCanvasPointerDown = (event) => {
    if (game.state === "ready") start();
    if (game.state !== "running") return;
    takeControl();
    canvas.focus({ preventScroll: true });
    const rect = canvas.getBoundingClientRect();
    manualKeys.clear();
    dragTarget = {
      x: Math.max(20, Math.min(620, (event.clientX - rect.left) * 640 / rect.width)),
      y: Math.max(28, Math.min(452, (event.clientY - rect.top) * 480 / rect.height)),
    };
    canvas.setPointerCapture(event.pointerId);
  };
  const onCanvasPointerMove = (event) => {
    if (!dragTarget) return;
    const rect = canvas.getBoundingClientRect();
    dragTarget = {
      x: Math.max(20, Math.min(620, (event.clientX - rect.left) * 640 / rect.width)),
      y: Math.max(28, Math.min(452, (event.clientY - rect.top) * 480 / rect.height)),
    };
  };
  const onCanvasPointerEnd = () => { dragTarget = null; };

  elements.start.addEventListener("click", onStart);
  elements.pause.addEventListener("click", togglePause);
  elements.takeover.addEventListener("click", onTakeover);
  root.querySelector("[data-dodger-restart]").addEventListener("click", onRestart);
  root.querySelector(".dodger-agent-controls").addEventListener("pointerdown", onKeyButton);
  root.querySelector(".dodger-agent-controls").addEventListener("pointerup", onKeyButtonRelease);
  root.querySelector(".dodger-agent-controls").addEventListener("pointercancel", onKeyButtonRelease);
  canvas.addEventListener("pointerdown", onCanvasPointerDown);
  canvas.addEventListener("pointermove", onCanvasPointerMove);
  canvas.addEventListener("pointerup", onCanvasPointerEnd);
  canvas.addEventListener("pointercancel", onCanvasPointerEnd);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", blur);
  document.addEventListener("visibilitychange", visibility);
  updateView();
  drawSimulation(context, game, decision, 0);
  frame = requestAnimationFrame(tick);

  return () => {
    destroyed = true;
    cancelAnimationFrame(frame);
    elements.start.removeEventListener("click", onStart);
    elements.pause.removeEventListener("click", togglePause);
    elements.takeover.removeEventListener("click", onTakeover);
    root.querySelector("[data-dodger-restart]").removeEventListener("click", onRestart);
    root.querySelector(".dodger-agent-controls").removeEventListener("pointerdown", onKeyButton);
    root.querySelector(".dodger-agent-controls").removeEventListener("pointerup", onKeyButtonRelease);
    root.querySelector(".dodger-agent-controls").removeEventListener("pointercancel", onKeyButtonRelease);
    canvas.removeEventListener("pointerdown", onCanvasPointerDown);
    canvas.removeEventListener("pointermove", onCanvasPointerMove);
    canvas.removeEventListener("pointerup", onCanvasPointerEnd);
    canvas.removeEventListener("pointercancel", onCanvasPointerEnd);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", blur);
    document.removeEventListener("visibilitychange", visibility);
  };
}
