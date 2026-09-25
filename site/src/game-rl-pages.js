import snakeArtifact from "../../games/snake/policy.json" with { type: "json" };
import asteroidsArtifact from "../../games/asteroids/policy.json" with { type: "json" };
import golfArtifact from "../../games/mini-golf/policy.json" with { type: "json" };
import { createSnakePolicy } from "../../games/snake/policy.mjs";
import { createSnakeRun, SNAKE_DIRECTIONS, SNAKE_SIZE, SNAKE_STEP_SECONDS, stepSnakeRun } from "../../games/snake/simulation.mjs";
import { createAsteroidsPolicy } from "../../games/asteroids/policy.mjs";
import { ASTEROIDS_FIELD, createAsteroidsRun, startAsteroidsRun, stepAsteroidsRun } from "../../games/asteroids/simulation.mjs";
import { createGolfPolicy } from "../../games/mini-golf/policy.mjs";
import { GOLF_BOUNDS, GOLF_COURSES, GOLF_RADIUS, applyGolfShot, createGolfRun, rollGolfShot } from "../../games/mini-golf/simulation.mjs";

const percent = (value) => `${Math.round(Number(value || 0) * 100)}%`;
const number = (value, digits = 2) => Number(value || 0).toFixed(digits);
const signed = (value, digits = 2) => `${value > 0 ? "+" : ""}${number(value, digits)}`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

const PAGE = {
  snake: {
    name: "Snake", route: "snake-rl", native: "snake", artifact: snakeArtifact,
    title: "Learning a safe route<br><em>for Snake.</em>",
    dek: "A compact policy-search agent that steers one grid cell at a time, grows the tail, and keeps a visible escape lane open.",
    canvas: "snake-agent-canvas", aspect: "1 / 1", stat: (t) => [
      ["held-out episodes", t.heldOutEpisodes], ["mean apples", number(t.trained?.meanScore, 2)], ["board clears", percent(t.trained?.boardClearRate)],
    ],
    sections: (t) => [
      ["01 / task", "Grow without closing the exit.", "Snake runs on the native 20 × 20 classic board. An apple adds one segment; hitting a wall or the body ends the episode. The objective combines apples collected with survival and a small full-board completion bonus."],
      ["02 / observation and action", "A grid state and three legal turns.", "At each 125 ms grid tick, the controller observes the ordered body cells, heading, and apple coordinate. It chooses straight, left, or right; reverse moves are excluded. The action is applied by the deterministic Snake simulation also used by the browser pilot."],
      ["03 / learning method", "Search a readable route score.", `The controller scores legal moves using shortest collision-free path distance to the apple, immediate progress, follow-up exits, clear forward runway, straight-line stability, and an apple capture bonus. CEM searches these six coefficients over ${t.iterations} generations, ${t.population} candidates per generation, and ${t.episodesPerCandidate} shared training seeds per candidate. This is policy search over an interpretable controller, not a neural network.`],
      ["04 / evaluation", "Keep seeds out of the search loop.", `The selected policy was compared with the initial coefficient set on ${t.heldOutEpisodes} independently generated seeds. On those runs, mean score changed from ${number(t.baseline?.meanScore, 2)} to ${number(t.trained?.meanScore, 2)} apples; mean survival changed from ${number(t.baseline?.meanSurvivalSteps, 1)} to ${number(t.trained?.meanSurvivalSteps, 1)} grid steps. The paired score difference was ${signed(t.pairedScore?.meanDifference, 2)} apples (95% bootstrap interval ${signed(t.pairedScore?.confidence95?.[0], 2)} to ${signed(t.pairedScore?.confidence95?.[1], 2)}).`],
      ["05 / limitations", "Read the result as a simulator result.", "The reported episodes use the classic board and one apple at a time. They do not measure the alternate wrap, maze, or feast presets, human-equivalent play, or performance under input and rendering delays. The live canvas is a fresh seeded episode; manual takeover uses the same state transition rules."],
    ],
    reproduce: "node tools/snake_rl/train.mjs --iterations 18 --population 22 --episodes 6 --holdout-episodes 48",
  },
  asteroids: {
    name: "Asteroids", route: "asteroids-rl", native: "asteroids", artifact: asteroidsArtifact,
    title: "A pursuit policy<br><em>for Asteroids.</em>",
    dek: "A trained pilot estimates a firing line, watches projected collisions, and chooses when to turn or thrust through three waves.",
    canvas: "asteroids-agent-canvas", aspect: "19 / 13", stat: (t) => [
      ["held-out episodes", t.heldOutEpisodes], ["mean score", number(t.trained?.meanScore, 1)], ["mean waves cleared", number(t.trained?.meanWavesCleared, 2)],
    ],
    sections: (t) => [
      ["01 / task", "Break up the field and preserve ships.", "The policy controls the native three-wave Asteroids simulation. Ship inertia, screen wrapping, projectile lifetime, rock splitting, collision invulnerability, and the three-ship limit are part of the transition model."],
      ["02 / observation and action", "Aim, evade, and keep firing.", "The observation includes ship position, heading and velocity; every asteroid’s position, size and velocity; and current lives and wave. The action is left or right rotation, thrust, and continuous Space fire. Decisions are held for six 60 Hz simulation ticks."],
      ["03 / learning method", "Search tactical coefficients with CEM.", `A short-horizon controller leads high-value rocks and estimates each asteroid’s closest projected approach. CEM tunes aim strength, collision aversion, cruise speed, turning tolerance, panic threshold, and lead time over ${t.iterations} generations. This is seeded policy search over a structured controller.`],
      ["04 / evaluation", "Paired unseen fields.", `The selected policy and initial reference policy were evaluated on the same ${t.heldOutEpisodes} unseen seeds. Mean score changed from ${number(t.baseline?.meanScore, 1)} to ${number(t.trained?.meanScore, 1)}; mean survival changed from ${number(t.baseline?.meanSurvivalSeconds, 2)} s to ${number(t.trained?.meanSurvivalSeconds, 2)} s; mean waves cleared changed from ${number(t.baseline?.meanWavesCleared, 2)} to ${number(t.trained?.meanWavesCleared, 2)}. The paired survival difference was ${signed(t.pairedSurvival?.meanDifference, 2)} s (95% bootstrap interval ${signed(t.pairedSurvival?.confidence95?.[0], 2)} to ${signed(t.pairedSurvival?.confidence95?.[1], 2)}).`],
      ["05 / limitations", "The aim is structured and state-based.", "The policy reads simulator state rather than pixels, and it does not learn a neural visual representation. Evaluation is limited to the current three-wave rules and fixed field geometry. The live pilot runs the same deterministic simulation module used in training; the browser renderer is not part of the learned model."],
    ],
    reproduce: "node tools/asteroids_rl/train.mjs --iterations 16 --population 20 --episodes 8 --holdout-episodes 48",
  },
  golf: {
    name: "Mini Golf", route: "mini-golf-rl", native: "golf", artifact: golfArtifact,
    title: "Learning the pace<br><em>of a putt.</em>",
    dek: "A shot-selection policy weighs cup progress, banks, sand, and water before choosing an angle and power for each lie.",
    canvas: "golf-agent-canvas", aspect: "32 / 21", stat: (t) => [
      ["held-out courses", t.heldOutHoles?.length || 2], ["strokes / hole", number(t.trained?.meanStrokesPerHole, 2)], ["water penalties", number(t.trained?.meanWaterPenalties, 2)],
    ],
    sections: (t) => [
      ["01 / task", "Sink the cup within the stroke limit.", "The policy plays Pocket Greens’ fixed six-course layout. Each putt launches from the current lie; walls reflect the ball, sand increases drag, water returns the ball to its lie with a penalty stroke, and a ball that slows inside the cup is sunk. A hole ends at a sink or the ten-stroke pickup limit."],
      ["02 / observation and action", "A lie, course geometry, angle, and power.", "At each settled lie, the policy reads the ball and cup coordinates plus wall, sand, and water rectangles. It evaluates candidate shots across a local set of angles and powers, then selects the best predicted outcome. Each browser putt is animated from the same fixed-step physics used by the trainer."],
      ["03 / learning method", "Tune the value of a safer shot.", `The short-horizon evaluator scores predicted sink, distance gained, water return, overshoot, sand time, and stroke cost. CEM searches six coefficients over ${t.iterations} generations and ${t.population} candidates. Holes 1–4 are used for search; The Garden Gates and The Clubhouse are held out for evaluation. Repeated deterministic runs do not create additional independent courses, so course-level outcomes remain the main evidence.`],
      ["04 / evaluation", "Report the two unseen course layouts directly.", `On the two held-out courses, the reference averaged ${number(t.baseline?.meanStrokesPerHole, 2)} strokes per hole and ${number(t.baseline?.meanHolesSunk, 2)} holes sunk per episode. The trained policy averaged ${number(t.trained?.meanStrokesPerHole, 2)} strokes per hole and ${number(t.trained?.meanHolesSunk, 2)} holes sunk. Water penalties changed from ${number(t.baseline?.meanWaterPenalties, 2)} to ${number(t.trained?.meanWaterPenalties, 2)}. ${t.trained?.meanStrokesPerHole === t.baseline?.meanStrokesPerHole ? "No mean performance lift was observed on these held-out layouts." : "The change is descriptive and applies only to these layouts."} The evaluation contains two fixed course layouts; no population-level confidence interval is claimed.`],
      ["05 / limitations", "A planning policy for a small fixed course.", "The policy uses exact course geometry and deterministic physics. Its results do not establish performance on randomly generated courses, hidden obstacles, changing turf, or a human benchmark. A real putt still animates in the browser, and the player can take control before the next shot."],
    ],
    reproduce: "node tools/mini_golf_rl/train.mjs --iterations 14 --population 20 --episodes 3",
  },
};

function renderPaper({ app, base }, config) {
  const training = config.artifact.training || {};
  document.body.className = `rl-page rl-agent-paper rl-agent-${config.native}`;
  const gameHref = `${base}?game=shelf&amp;play=${config.native}`;
  const pilotHref = `${base}?game=${config.route}`;
  const stats = config.stat(training).map(([label, value]) => `<div><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join("");
  const sections = config.sections(training).map(([label, title, body]) => `<section class="rl-paper-section"><p class="rl-label">${label}</p><h2>${title}</h2><p>${body}</p></section>`).join("");
  const weightRows = Object.entries(config.artifact.weights || {}).map(([key, value]) => `<tr><th scope="row">${escapeHTML(key)}</th><td>${number(value, 4)}</td></tr>`).join("");
  const courseRows = (training.heldOutCourseResults || []).map((row) => `<tr><th scope="row">${escapeHTML(row.course)}</th><td>${row.referenceStrokes ?? "—"}</td><td>${row.strokes ?? "—"}</td><td>${row.strokeDifference > 0 ? "+" : ""}${row.strokeDifference ?? "—"}</td><td>${row.sunk ? "Sunk" : "Picked up"}</td></tr>`).join("");
  app.innerHTML = `
    <header class="site-header page-width"><a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a><nav class="site-nav" aria-label="Page navigation"><a href="${gameHref}">back to ${config.name}</a><a href="${base}">home</a></nav></header>
    <main class="rl-main page-width rl-agent-main">
      <section class="rl-hero" aria-labelledby="agent-title"><p class="rl-kicker">HVN Games / ${config.name} / research note</p><h1 id="agent-title">${config.title}</h1><p class="rl-dek">${config.dek}</p><p class="rl-byline">HVN Games · Reproducible policy study · ${config.artifact.name} · version ${config.artifact.version}</p><div class="rl-paper-actions"><a class="button button-primary" href="${pilotHref}">Open live policy lab →</a><a class="button button-secondary" href="${gameHref}">Play ${config.name}</a></div></section>
      <section class="rl-demo-layout rl-agent-demo" aria-labelledby="agent-demo-title">
        <div class="rl-demo-panel"><div class="rl-demo-heading"><div><p class="rl-label">live simulation</p><h2 id="agent-demo-title">The pilot is choosing.</h2></div><span class="rl-status" id="agent-status">AUTOPILOT</span></div><div class="rl-agent-field" style="--agent-aspect:${config.aspect}"><canvas id="${config.canvas}" aria-label="Live ${config.name} policy simulation"></canvas><div class="rl-demo-hud"><span id="agent-metric-label">episode</span><b id="agent-metric">running</b></div></div><div class="rl-demo-footer"><p id="agent-footer">Current observation and selected action update during play.</p><div class="rl-agent-controls"><button id="agent-mode" class="button button-secondary" type="button">Take control</button><button id="agent-restart" class="button button-secondary" type="button">Restart</button></div></div></div>
        <aside class="rl-facts rl-agent-decision" aria-label="Current policy decision"><p class="rl-label">decision trace</p><dl><div><dt>action</dt><dd id="agent-action">Choosing</dd></div><div><dt>target</dt><dd id="agent-target">Reading the board</dd></div><div><dt>reason</dt><dd id="agent-reason">Evaluating the current state.</dd></div></dl><div class="rl-agent-metrics">${stats}</div></aside>
      </section>
      <article class="rl-paper" aria-label="${config.name} policy whitepaper"><section class="rl-paper-section rl-paper-intro"><p class="rl-label">abstract</p><p>This report describes ${config.artifact.name}, an interpretable policy-search controller for ${config.name}. The agent receives structured simulation state, selects game-native actions, and is evaluated on held-out seeds or course layouts. Reported values compare the trained artifact with its initial reference policy; they are not a human benchmark.</p></section><div class="rl-paper-grid">${sections}</div>
        ${courseRows ? `<section class="rl-paper-section rl-agent-weight-section"><p class="rl-label">course-level holdout</p><h2>Each unseen layout</h2><div class="rl-agent-table-wrap"><table class="rl-agent-table"><thead><tr><th scope="col">Course</th><th scope="col">Reference</th><th scope="col">Trained</th><th scope="col">Difference</th><th scope="col">Outcome</th></tr></thead><tbody>${courseRows}</tbody></table></div></section>` : ""}
        <section class="rl-paper-section rl-agent-weight-section"><p class="rl-label">selected policy</p><h2>Coefficients in the shipped artifact</h2><p>The browser imports these values from the versioned policy JSON used by the trainer.</p><div class="rl-agent-table-wrap"><table class="rl-agent-table"><thead><tr><th scope="col">Coefficient</th><th scope="col">Value</th></tr></thead><tbody>${weightRows}</tbody></table></div></section>
        <div class="rl-paper-grid rl-agent-notes"><section class="rl-paper-section"><p class="rl-label">reproduction</p><h2>Recreate the search.</h2><p>From the repository root, run <code>${config.reproduce}</code>. The trainer writes the selected weights and records its seed, search budget, objective, and evaluation summary in the game’s policy JSON.</p></section><section class="rl-paper-section"><p class="rl-label">method reference</p><h2>Cross-entropy policy search.</h2><p>R. Y. Rubinstein and D. P. Kroese, <em>The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning</em>, Springer, 2004. <a href="https://doi.org/10.1007/978-1-4757-4321-0" rel="noreferrer">doi:10.1007/978-1-4757-4321-0</a>.</p></section></div>
      </article>
    </main>`;
  if (config.native === "snake") mountSnakeLab();
  if (config.native === "asteroids") mountAsteroidsLab();
  if (config.native === "golf") mountGolfLab();
}

export const renderSnakeWhitepaper = (context) => renderPaper(context, PAGE.snake);
export const renderAsteroidsWhitepaper = (context) => renderPaper(context, PAGE.asteroids);
export const renderGolfWhitepaper = (context) => renderPaper(context, PAGE.golf);

function bindSharedLab({ canvasId, policyName, metricLabel }) {
  const canvas = document.getElementById(canvasId);
  const context = canvas.getContext("2d");
  const nodes = {
    status: document.querySelector("#agent-status"), metric: document.querySelector("#agent-metric"),
    label: document.querySelector("#agent-metric-label"), footer: document.querySelector("#agent-footer"),
    action: document.querySelector("#agent-action"), target: document.querySelector("#agent-target"), reason: document.querySelector("#agent-reason"),
    mode: document.querySelector("#agent-mode"), restart: document.querySelector("#agent-restart"),
  };
  nodes.label.textContent = metricLabel;
  return { canvas, context, nodes, policyName };
}

function mountSnakeLab() {
  const { canvas, context: ctx, nodes } = bindSharedLab({ canvasId: "snake-agent-canvas", metricLabel: "apples" });
  canvas.width = canvas.height = 480;
  const policy = createSnakePolicy();
  let run;
  let piloting = true;
  let manual = null;
  let decision = null;
  let accumulator = 0;
  let lastTime = 0;
  let frame = 0;
  let disposed = false;
  const seed = () => (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const setMode = (enabled) => { piloting = enabled; nodes.status.textContent = enabled ? "AUTOPILOT" : "HUMAN CONTROL"; nodes.mode.textContent = enabled ? "Take control" : "Return to pilot"; if (enabled) manual = null; };
  const restart = () => { run = createSnakeRun(seed()); decision = null; manual = null; accumulator = 0; lastTime = 0; setMode(true); };
  const decide = () => {
    if (run.mode !== "playing") return;
    decision = piloting ? policy.decide({ body: run.body, direction: run.direction, food: run.food, score: run.score, steps: run.steps }) : null;
    const direction = piloting ? decision.direction : manual || run.direction;
    stepSnakeRun(run, direction);
    if (run.mode === "over") nodes.footer.textContent = `Run ended after ${run.score} apples when the snake hit ${run.body.length ? "the wall or its own tail" : "an obstacle"}. Restart to watch another episode.`;
    updateTrace();
  };
  const updateTrace = () => {
    nodes.status.textContent = run.mode === "playing" ? (piloting ? "AUTOPILOT" : "HUMAN CONTROL") : run.mode.toUpperCase();
    nodes.metric.textContent = String(run.score).padStart(2, "0");
    nodes.action.textContent = piloting ? decision?.keys || "Choosing" : manual ? Object.keys(SNAKE_DIRECTIONS).find((key) => SNAKE_DIRECTIONS[key].join() === manual.join())?.toUpperCase() || "STEER" : "HOLD COURSE";
    nodes.target.textContent = run.food ? `Apple at ${run.food[0] + 1}, ${run.food[1] + 1}` : "Board complete";
    nodes.reason.textContent = run.mode === "over" ? "The run stops when the head reaches a wall or occupied body cell." : decision?.reason || "Use WASD or arrows to choose the next turn.";
  };
  const draw = () => {
    ctx.fillStyle = "#f3eedc"; ctx.fillRect(0, 0, 480, 480);
    for (let row = 0; row < SNAKE_SIZE; row += 1) for (let col = 0; col < SNAKE_SIZE; col += 1) {
      ctx.fillStyle = (row + col) % 2 ? "#c8dea2" : "#d1e5af"; ctx.fillRect(col * 24, row * 24, 24, 24);
    }
    if (run.food) { ctx.fillStyle = "#d95348"; ctx.beginPath(); ctx.arc(run.food[0] * 24 + 12, run.food[1] * 24 + 13, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#456a42"; ctx.fillRect(run.food[0] * 24 + 12, run.food[1] * 24 + 3, 3, 6); }
    run.body.forEach(([x, y], index) => { ctx.fillStyle = index === 0 ? "#e5c860" : "#34715a"; ctx.beginPath(); ctx.roundRect(x * 24 + 1, y * 24 + 1, 22, 22, 6); ctx.fill(); });
    if (decision && run.mode === "playing") { const [x, y] = run.body[0]; ctx.strokeStyle = "#f07856"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x * 24 + 12, y * 24 + 12); ctx.lineTo(x * 24 + 12 + decision.direction[0] * 30, y * 24 + 12 + decision.direction[1] * 30); ctx.stroke(); }
  };
  const tick = (now) => {
    if (disposed) return;
    accumulator += lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
    lastTime = now;
    while (accumulator >= SNAKE_STEP_SECONDS && run.mode === "playing") { decide(); accumulator -= SNAKE_STEP_SECONDS; }
    updateTrace(); draw(); frame = requestAnimationFrame(tick);
  };
  const manualKeys = { w: "up", ArrowUp: "up", a: "left", ArrowLeft: "left", s: "down", ArrowDown: "down", d: "right", ArrowRight: "right" };
  const onKey = (event) => {
    if (event.target instanceof Element && event.target.closest("button, input, select, textarea")) return;
    const direction = manualKeys[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (!direction) return;
    event.preventDefault(); setMode(false); manual = [...SNAKE_DIRECTIONS[direction]];
  };
  nodes.mode.addEventListener("click", () => setMode(!piloting)); nodes.restart.addEventListener("click", restart);
  addEventListener("keydown", onKey);
  restart(); updateTrace(); draw(); frame = requestAnimationFrame(tick);
  return () => { disposed = true; cancelAnimationFrame(frame); removeEventListener("keydown", onKey); };
}

function mountAsteroidsLab() {
  const { canvas, context: ctx, nodes } = bindSharedLab({ canvasId: "asteroids-agent-canvas", metricLabel: "score" });
  canvas.width = ASTEROIDS_FIELD.width; canvas.height = ASTEROIDS_FIELD.height;
  const policy = createAsteroidsPolicy();
  let run; let piloting = true; let held = new Set(); let decision = null; let nextDecision = 0; let accumulator = 0; let lastTime = 0; let frame = 0; let disposed = false;
  const seed = () => (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const start = () => { run = createAsteroidsRun(seed()); startAsteroidsRun(run); held = new Set(); decision = null; nextDecision = 0; accumulator = 0; lastTime = 0; setMode(true); };
  const setMode = (enabled) => { piloting = enabled; nodes.status.textContent = enabled ? "AUTOPILOT" : "HUMAN CONTROL"; nodes.mode.textContent = enabled ? "Take control" : "Return to pilot"; held.clear(); };
  const act = () => {
    if (piloting) { decision = policy.decide(run); return decision; }
    return { left: held.has("left"), right: held.has("right"), thrust: held.has("thrust"), fire: held.has("fire"), label: [...held].join(" + ").toUpperCase() || "HOLD", target: "Manual input", reason: "Your held keys control the same deterministic Asteroids simulation.", threat: null };
  };
  const tickSimulation = () => {
    if (run.mode !== "playing") return;
    if (nextDecision <= 0) { decision = act(); nextDecision = 6; }
    const input = piloting ? decision : act();
    stepAsteroidsRun(run, input, 1 / 60); nextDecision -= 1;
    if (run.mode === "over" || run.mode === "won") nodes.footer.textContent = run.mode === "won" ? `All three waves cleared in ${run.elapsed.toFixed(1)} seconds.` : `The final ship was lost in wave ${run.wave} at ${run.score} points.`;
    nodes.status.textContent = run.mode === "playing" ? (piloting ? "AUTOPILOT" : "HUMAN CONTROL") : run.mode.toUpperCase();
    nodes.metric.textContent = String(run.score).padStart(4, "0");
    nodes.action.textContent = decision?.label || "Choosing";
    nodes.target.textContent = decision?.target || "Reading the field";
    nodes.reason.textContent = decision?.reason || "Select a firing line.";
  };
  const draw = () => {
    ctx.fillStyle = "#111b23"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 76; i += 1) { ctx.fillStyle = `rgba(240,245,233,${0.2 + (i % 4) * 0.1})`; ctx.fillRect((i * 193 + 47) % canvas.width, (i * 317 + 83) % canvas.height, 2, 2); }
    for (const rock of run.asteroids) { const radius = ASTEROIDS_FIELD.rockRadius[rock.size]; ctx.beginPath(); ctx.arc(rock.x, rock.y, radius, 0, Math.PI * 2); ctx.fillStyle = ["", "#465761", "#3b4d59", "#344552"][rock.size]; ctx.strokeStyle = "#b4c4c6"; ctx.lineWidth = 2; ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "#ffd675"; for (const bullet of run.bullets) { ctx.beginPath(); ctx.arc(bullet.x, bullet.y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    if (run.mode === "playing") { ctx.save(); ctx.translate(run.ship.x, run.ship.y); ctx.rotate(run.ship.angle); ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-12, -11); ctx.lineTo(-7, 0); ctx.lineTo(-12, 11); ctx.closePath(); ctx.fillStyle = "#dff5e9"; ctx.strokeStyle = "#70d9bc"; ctx.fill(); ctx.stroke(); if ((piloting && decision?.thrust) || held.has("thrust")) { ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-20, 0); ctx.lineTo(-8, 5); ctx.strokeStyle = "#ffb35c"; ctx.lineWidth = 3; ctx.stroke(); } ctx.restore(); }
  };
  const tick = (now) => { if (disposed) return; accumulator += lastTime ? Math.min(0.08, (now - lastTime) / 1000) : 0; lastTime = now; while (accumulator >= 1 / 60) { tickSimulation(); accumulator -= 1 / 60; } draw(); frame = requestAnimationFrame(tick); };
  const keyMap = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "thrust", w: "thrust", " ": "fire" };
  const keydown = (event) => { if (event.target instanceof Element && event.target.closest("button, input, select, textarea")) return; const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; const control = keyMap[key] || keyMap[event.key]; if (!control) return; event.preventDefault(); if (piloting) setMode(false); held.add(control); };
  const keyup = (event) => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; held.delete(keyMap[key] || keyMap[event.key]); };
  nodes.mode.addEventListener("click", () => setMode(!piloting)); nodes.restart.addEventListener("click", start); addEventListener("keydown", keydown); addEventListener("keyup", keyup); addEventListener("blur", () => held.clear());
  start(); frame = requestAnimationFrame(tick);
  return () => { disposed = true; cancelAnimationFrame(frame); removeEventListener("keydown", keydown); removeEventListener("keyup", keyup); };
}

function mountGolfLab() {
  const { canvas, context: ctx, nodes } = bindSharedLab({ canvasId: "golf-agent-canvas", metricLabel: "strokes" });
  canvas.width = 640; canvas.height = 430;
  const policy = createGolfPolicy();
  let run; let piloting = true; let decision = null; let angle = 0; let power = 50; let motion = null; let nextShotTimer = 0; let animationFrame = 0; let disposed = false; let visualBall = null;
  const start = () => { run = createGolfRun(); angle = 0; power = 50; decision = null; motion = null; visualBall = null; nextShotTimer = 0; setMode(true); updateTrace(); };
  const setMode = (enabled) => { piloting = enabled; nodes.status.textContent = enabled ? "AUTOPILOT" : "HUMAN CONTROL"; nodes.mode.textContent = enabled ? "Take control" : "Return to pilot"; if (enabled) nextShotTimer = performance.now() + 450; else nextShotTimer = 0; };
  const activeCourse = () => GOLF_COURSES[run.holeIndex];
  const shoot = (shot, startedAt = performance.now()) => {
    if (motion || run.completed) return;
    const courseIndex = run.holeIndex;
    const startBall = { ...run.ball };
    const result = rollGolfShot(courseIndex, startBall, shot.angle, shot.power);
    visualBall = { ...startBall };
    const path = result.path?.length ? result.path : [[result.x, result.y]];
    motion = { path, index: 0, shot, startedAt };
    decision = piloting ? shot : { angle: shot.angle, power: shot.power, target: `${activeCourse().name} · cup`, reason: "The player selected the angle and power." };
  };
  const updateTrace = () => {
    const course = activeCourse();
    nodes.status.textContent = run.completed ? "ROUND COMPLETE" : (piloting ? "AUTOPILOT" : "HUMAN CONTROL");
    nodes.metric.textContent = String(run.totalStrokes).padStart(2, "0");
    nodes.action.textContent = motion ? `${Math.round(motion.shot.power)}% power · ${Math.round(motion.shot.angle)}°` : decision ? `${Math.round(decision.power)}% power · ${Math.round(decision.angle)}°` : "Choosing a shot";
    nodes.target.textContent = decision?.target || `${course.name} · ${Math.round(Math.hypot(course.cup[0] - run.ball.x, course.cup[1] - run.ball.y))} px to cup`;
    nodes.reason.textContent = decision?.reason || "Compare pace, line, and nearby course hazards.";
    if (run.completed) nodes.footer.textContent = `Round complete: ${run.totalStrokes} strokes; ${run.holed.filter(Boolean).length} of ${run.holeIndexes?.length || run.holed.length} holes sunk.`;
    else if (motion) nodes.footer.textContent = "The selected putt is rolling through the course simulation.";
    else nodes.footer.textContent = piloting ? `Hole ${run.holePosition + 1} · ${run.strokes} strokes · next policy decision in the live simulation.` : "Arrow keys adjust aim and power. Space putts; Shift gives fine adjustment.";
  };
  const draw = () => {
    const course = activeCourse(); ctx.fillStyle = "#234f43"; ctx.fillRect(0, 0, 640, 430); ctx.fillStyle = "#a5c67c"; ctx.fillRect(24, 30, 592, 376);
    for (let i = 0; i < 12; i += 1) { ctx.fillStyle = i % 2 ? "#aecf85" : "#a5c67c"; ctx.fillRect(24 + i * 52, 30, 52, 376); }
    for (const sand of course.sand) { ctx.fillStyle = "#e7ca84"; ctx.fillRect(sand.x, sand.y, sand.w, sand.h); }
    for (const water of course.water) { ctx.fillStyle = "#4c91a0"; ctx.fillRect(water.x, water.y, water.w, water.h); }
    for (const wall of course.walls) { ctx.fillStyle = "#305e45"; ctx.fillRect(wall.x, wall.y, wall.w, wall.h); }
    ctx.fillStyle = "#173f37"; ctx.beginPath(); ctx.arc(course.cup[0], course.cup[1], 11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff3cd"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(course.cup[0] + 4, course.cup[1]); ctx.lineTo(course.cup[0] + 4, course.cup[1] - 47); ctx.stroke();
    ctx.fillStyle = "#d8794b"; ctx.beginPath(); ctx.moveTo(course.cup[0] + 5, course.cup[1] - 48); ctx.lineTo(course.cup[0] + 30, course.cup[1] - 40); ctx.lineTo(course.cup[0] + 5, course.cup[1] - 32); ctx.fill();
    ctx.strokeStyle = "rgba(30,54,47,.8)"; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); const shot = motion?.shot || decision || { angle, power }; const a = shot.angle * Math.PI / 180; const ball = visualBall || run.ball; ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x + Math.cos(a) * (32 + shot.power * 0.78), ball.y + Math.sin(a) * (32 + shot.power * 0.78)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fff8de"; ctx.beginPath(); ctx.arc(ball.x, ball.y, GOLF_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#234f43"; ctx.stroke();
    ctx.fillStyle = "#f4f0dc"; ctx.font = "600 13px sans-serif"; ctx.fillText(`${String(run.holePosition + 1).padStart(2, "0")} / ${run.courseIndexes.length}  ·  ${course.name}`, 28, 22); ctx.textAlign = "right"; ctx.fillText(`${run.strokes} strokes`, 612, 22); ctx.textAlign = "left";
  };
  const tick = (now) => {
    if (disposed) return;
    if (!run.completed && piloting && !motion && now >= nextShotTimer) { decision = policy.decide(run); angle = decision.angle; power = decision.power; shoot(decision, now); }
    if (motion) {
      const index = Math.max(0, Math.min(motion.path.length - 1, Math.floor((now - motion.startedAt) / 28)));
      motion.index = index; visualBall = { x: motion.path[index][0], y: motion.path[index][1] };
      if (index >= motion.path.length - 1) {
        applyGolfShot(run, motion.shot);
        motion = null; visualBall = null;
        if (run.completed) nextShotTimer = 0;
        else if (piloting) nextShotTimer = now + 520;
        updateTrace();
      }
    }
    updateTrace(); draw(); animationFrame = requestAnimationFrame(tick);
  };
  const keydown = (event) => {
    if (event.target instanceof Element && event.target.closest("button, input, select, textarea")) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(key)) return;
    event.preventDefault(); if (piloting) setMode(false); if (motion || run.completed) return;
    if (key === " " || key === "Enter") { if (!event.repeat) { decision = { angle, power, target: `${activeCourse().name} · manual putt`, reason: "Choose pace, then release the shot toward the cup." }; shoot(decision); } return; }
    const step = event.shiftKey ? 1 : 5;
    if (key === "ArrowLeft") angle -= step; if (key === "ArrowRight") angle += step; if (key === "ArrowUp") power += step; if (key === "ArrowDown") power -= step;
    angle = ((angle + 540) % 360) - 180; power = Math.max(10, Math.min(100, power));
    decision = { angle, power, target: `${activeCourse().name} · manual line`, reason: "Adjust the launch angle or power before putting." };
  };
  nodes.mode.addEventListener("click", () => setMode(!piloting)); nodes.restart.addEventListener("click", start); addEventListener("keydown", keydown);
  start(); animationFrame = requestAnimationFrame(tick);
  return () => { disposed = true; cancelAnimationFrame(animationFrame); removeEventListener("keydown", keydown); };
}
