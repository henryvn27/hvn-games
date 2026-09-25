import {
  createTrainedMiniPlatformerPolicy,
  drawMiniPlatformer,
  createPlatformerState,
  miniPlatformerPolicyArtifact,
  PLATFORMER_LEVEL_NAMES,
  PLATFORMER_STEP_SECONDS,
  stepPlatformer,
} from "../../games/mini-platformer/browser.mjs";

const format = (value, digits = 1) => Number(value || 0).toFixed(digits);
const signed = (value, digits = 1) => `${value > 0 ? "+" : ""}${format(value, digits)}`;

export function renderMiniPlatformerWhitepaper({ app, base }) {
  document.body.className = "rl-page platformer-paper-page";
  const { training } = miniPlatformerPolicyArtifact;
  const baseline = training.heldOutBaseline;
  const selected = training.heldOutSelected;
  const heldOut = training.heldOutByLevel;
  const initialLevel = (training.heldOutLevels[0] || 1) - 1;

  app.innerHTML = `
    <header class="site-header page-width">
      <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
      <nav class="site-nav" aria-label="Page navigation"><a href="${base}?game=shelf&amp;play=platform">back to Mini Platformer</a></nav>
    </header>
    <main class="rl-main page-width platformer-paper-main">
      <section class="rl-hero" aria-labelledby="platformer-paper-title">
        <p class="rl-kicker">HVN Games / Mini Platformer / 2026</p>
        <h1 id="platformer-paper-title">Learning a route<br><em>one jump at a time.</em></h1>
        <p class="rl-dek">A reproducible policy-search study for the 12-course platform game. The pilot sees the same physics as the game, chooses A/D/Space, and shows its intended landing as it plays.</p>
        <p class="rl-byline">HVN Games · Technical report 01 · 25 September 2026 · Policy ${miniPlatformerPolicyArtifact.name}</p>
      </section>

      <section class="platformer-paper-summary" aria-label="Holdout evaluation summary">
        <div><span>held-out courses</span><strong>${training.heldOutLevels.length}</strong></div>
        <div><span>course completion</span><strong>${format(selected.completionRate * 100, 0)}%</strong></div>
        <div><span>mean stars / course</span><strong>${format(selected.meanStars, 1)} / 3</strong></div>
        <div><span>mean retries / course</span><strong>${format(selected.meanDeaths, 1)}</strong></div>
      </section>

      <section class="rl-demo-layout platformer-demo-layout" aria-label="Playable agent demonstration and live decision display">
        <div class="rl-demo-panel platformer-demo-panel">
          <div class="rl-demo-heading"><div><p class="rl-label">live demonstration</p><h2>See the next jump coming.</h2></div><span class="rl-status" id="platformer-demo-status" role="status">AUTOPILOT</span></div>
          <div class="platformer-demo-select"><label for="platformer-demo-course">Course</label><select id="platformer-demo-course">${PLATFORMER_LEVEL_NAMES.map((name, index) => `<option value="${index}" ${index === initialLevel ? "selected" : ""}>${String(index + 1).padStart(2, "0")} · ${training.heldOutLevels.includes(index + 1) ? "holdout · " : ""}${name}</option>`).join("")}</select></div>
          <div class="rl-demo-frame platformer-demo-frame"><canvas id="platformer-demo-canvas" width="640" height="360" aria-label="Live simulation of the trained Mini Platformer pilot"></canvas><div class="rl-demo-hud"><span>COURSE <b id="platformer-demo-level">—</b></span><span>STARS <b id="platformer-demo-stars">0 / 3</b></span><span>RETRIES <b id="platformer-demo-deaths">0</b></span></div></div>
          <div class="platformer-demo-controls"><button type="button" id="platformer-demo-pilot">Take over</button><button type="button" id="platformer-demo-restart">Restart pilot</button><button type="button" id="platformer-demo-pause">Pause</button><span>A/D · arrows · Space to jump · P to pause</span></div>
        </div>
        <aside class="platformer-decision" aria-label="Current policy decision">
          <p class="rl-label">decision display</p>
          <div><span>chosen input</span><strong id="platformer-decision-action">—</strong></div>
          <div><span>target surface</span><strong id="platformer-decision-target">Reading the course</strong></div>
          <div><span>landing exposure</span><strong id="platformer-decision-risk">—</strong></div>
          <p id="platformer-decision-reason">The pilot evaluates an intended landing before it commits to the jump.</p>
          <button type="button" id="platformer-demo-return">Return to pilot</button>
        </aside>
      </section>

      <article class="rl-paper" aria-label="Mini Platformer policy whitepaper">
        <section class="rl-paper-section rl-paper-intro">
          <p class="rl-label">abstract</p>
          <p>This paper describes ${miniPlatformerPolicyArtifact.name}, a compact policy-search controller for Mini Platformer. It observes structured state from the game rules, chooses left/right/jump inputs at 10 Hz, and acts through the same 120 Hz simulation used by manual play. CEM search tunes twelve interpretable route and movement coefficients on ${training.trainingLevels.length} fixed courses. Evaluation holds out ${training.heldOutLevels.length} different courses. On that course set, completion changes from ${format(baseline.completionRate * 100, 1)}% to ${format(selected.completionRate * 100, 1)}%; mean time changes by ${signed(selected.meanSeconds - baseline.meanSeconds)} seconds, mean stars by ${signed(selected.meanStars - baseline.meanStars)}, and mean retries by ${signed(selected.meanDeaths - baseline.meanDeaths)}. These are descriptive results from four deterministic courses, not a broad skill claim.</p>
        </section>

        <div class="rl-paper-grid">
          <section class="rl-paper-section"><p class="rl-label">01 / task and rules</p><h2>One course, one shared rules engine.</h2><p>The game has three worlds and twelve courses. Horizontal movement accelerates toward 220 px/s. Gravity is 1,100 px/s² and an ordinary jump starts at −440 px/s. Releasing Space early cuts upward speed to −180 px/s. The simulation includes a 120 ms jump buffer, a 100 ms coyote window, spring pads, sinusoidally moving platforms, crumbling ledges, three stars, a checkpoint, patrols, enemy stomps, side-hit respawns, falls, and a finish flag.</p></section>
          <section class="rl-paper-section"><p class="rl-label">02 / observation</p><h2>Read the actual state.</h2><p>The policy reads player position and velocity, supporting surface, jump timers, elapsed time, checkpoint, collected markers, platform positions and types, crumble timers, and patrol state. The deterministic rules live in <strong>games/mini-platformer/simulation.mjs</strong>, imported by both the trainer and the browser game. The policy never reads pixels or the DOM.</p></section>
          <section class="rl-paper-section"><p class="rl-label">03 / action</p><h2>Three controls, refreshed at 10 Hz.</h2><p>Each action is a held subset of A, D, and Space, applied for twelve 120 Hz simulation steps. The controller ranks reachable surfaces, chooses a landing region, times a jump near the takeoff edge, then brakes toward the target. The displayed path and key lights correspond to the current policy output. Shift has no mechanic in Mini Platformer and is not an action.</p></section>
          <section class="rl-paper-section"><p class="rl-label">04 / search</p><h2>Search the route weights with CEM.</h2><p>The learned parameter vector contains eight surface-ranking coefficients and four movement settings: look-ahead distance, jump lead, jump hold time, and braking lead. Every candidate sees the same ${training.episodesPerCandidate} training courses. The top ${training.eliteCandidatesPerGeneration} candidates update the next sampling mean and spread over ${training.iterations} generations. This is optimization over an interpretable, hand-designed controller; it is not a neural network or an imitation model.</p></section>
          <section class="rl-paper-section"><p class="rl-label">05 / objective</p><h2>Reward finish, markers, and careful movement.</h2><p>The episode return is:</p><p class="platformer-equation">150 × finish + 40 × progress + 4 × stars − 0.05 × seconds − 16 × retries − 4 × falls − 10 × enemy hits</p><p>Completion dominates the objective; distance rewards partial progress when the finish is not reached. Stars are optional route markers. Time and failure terms discourage waiting, falls, and collisions.</p></section>
          <section class="rl-paper-section"><p class="rl-label">06 / evaluation</p><h2>Keep four courses outside the search.</h2><p>The search seed is ${training.seed}. Search runs ${training.iterations} generations, ${training.population} candidates per generation, and ${training.iterations * training.population * training.episodesPerCandidate} candidate-course episodes. Courses ${training.trainingLevels.map((level) => String(level).padStart(2, "0")).join(", ")} are used for training. Courses ${training.heldOutLevels.map((level) => String(level).padStart(2, "0")).join(", ")} are held out. Both policies start from identical states. Since the simulator is deterministic, the report gives per-course paired outcomes instead of repeated-seed intervals.</p></section>
        </div>

        <section class="rl-paper-section platformer-results-section" aria-labelledby="platformer-results-title">
          <p class="rl-label">07 / results</p><h2 id="platformer-results-title">Held-out course outcomes</h2>
          <p>Mean held-out completion moves from ${format(baseline.completionRate * 100, 1)}% to ${format(selected.completionRate * 100, 1)}%. Mean time is ${format(baseline.meanSeconds)} s for the reference and ${format(selected.meanSeconds)} s for the selected policy. The per-course table keeps wins and failures visible.</p>
          <div class="platformer-results-wrap"><table class="platformer-results"><thead><tr><th scope="col">Course</th><th scope="col">Reference</th><th scope="col">Selected</th><th scope="col">Time · ref / selected</th><th scope="col">Stars · ref / selected</th><th scope="col">Retries · ref / selected</th></tr></thead><tbody>${heldOut.map((row) => `<tr><th scope="row">${row.level}. ${row.course}</th><td>${row.baseline.completed ? "Finished" : `${format(row.baseline.progress * 100, 0)}%`}</td><td>${row.selected.completed ? "Finished" : `${format(row.selected.progress * 100, 0)}%`}</td><td>${format(row.baseline.seconds)} / ${format(row.selected.seconds)} s</td><td>${row.baseline.stars} / ${row.selected.stars}</td><td>${row.baseline.deaths} / ${row.selected.deaths}</td></tr>`).join("")}</tbody></table></div>
          <p>Across the held-out courses, falls average ${format(baseline.meanFalls, 2)} for the reference and ${format(selected.meanFalls, 2)} for the selected policy; enemy hits average ${format(baseline.meanEnemyHits, 2)} and ${format(selected.meanEnemyHits, 2)}. Four deterministic courses are a small evaluation set, so these results are specific to the current map.</p>
        </section>

        <div class="rl-paper-grid platformer-paper-notes">
          <section class="rl-paper-section"><p class="rl-label">08 / human control</p><h2>The player can take over at any time.</h2><p>The live route displays the selected keys, target surface, landing marker, route value, and a concise reason. A/D, arrows, Space, or the on-screen direction buttons stop the pilot immediately. An agent-assisted run does not change saved level progress, stars, best times, achievements, daily challenges, score records, or shared playtime.</p></section>
          <section class="rl-paper-section"><p class="rl-label">09 / limitations</p><h2>Good on these courses, not a human benchmark.</h2><p>The pilot receives exact state and uses a hand-designed route-ranking policy. Only four fixed courses are held out; enemy and moving-platform phases follow the same deterministic rules as training. There are no randomized physics perturbations, pixel perception, human demonstrations, or tests on unseen mechanics. The result does not establish human-equivalent skill or generalization beyond the current game.</p></section>
          <section class="rl-paper-section"><p class="rl-label">10 / reproduction</p><h2>Regenerate the policy and report.</h2><p>Run <strong>node tools/mini_platformer_rl/train.mjs</strong> from the repository root. The command writes <strong>games/mini-platformer/policy.json</strong> and <strong>tools/mini_platformer_rl/WHITEPAPER.md</strong>. Options include --iterations, --population, --seed, and --output.</p></section>
          <section class="rl-paper-section"><p class="rl-label">references</p><h2>Search method</h2><p>R. Y. Rubinstein and D. P. Kroese, <em>The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning</em>, Springer, 2004. <a href="https://doi.org/10.1007/978-1-4757-4321-0" rel="noreferrer">doi:10.1007/978-1-4757-4321-0</a>.</p></section>
        </div>
      </article>
    </main>
  `;

  const canvas = document.querySelector("#platformer-demo-canvas");
  const context = canvas.getContext("2d");
  const courseSelect = document.querySelector("#platformer-demo-course");
  const controls = { left: false, right: false, jump: false };
  let level = initialLevel;
  let state = createPlatformerState(level);
  let policy = createTrainedMiniPlatformerPolicy();
  let decision = null;
  let policyInput = { left: false, right: false, jump: false };
  let policyClock = 0;
  let accumulator = 0;
  let previousTime = 0;
  let paused = false;
  let piloting = true;

  const status = document.querySelector("#platformer-demo-status");
  const action = document.querySelector("#platformer-decision-action");
  const target = document.querySelector("#platformer-decision-target");
  const risk = document.querySelector("#platformer-decision-risk");
  const reason = document.querySelector("#platformer-decision-reason");
  const startButton = document.querySelector("#platformer-demo-pilot");
  const setMode = (enabled) => {
    piloting = enabled;
    policy = enabled ? createTrainedMiniPlatformerPolicy() : null;
    decision = null;
    policyInput = { left: false, right: false, jump: false };
    policyClock = 0;
    status.textContent = enabled ? "AUTOPILOT" : "HUMAN CONTROL";
    startButton.textContent = enabled ? "Take over" : "Return to pilot";
    document.querySelector("#platformer-demo-return").hidden = enabled;
    updateHud();
  };
  const restart = (nextLevel = level) => {
    resetControls();
    level = nextLevel;
    state = createPlatformerState(level);
    accumulator = 0;
    previousTime = 0;
    paused = false;
    document.querySelector("#platformer-demo-pause").textContent = "Pause";
    setMode(true);
    document.querySelector("#platformer-demo-level").textContent = `${String(level + 1).padStart(2, "0")} · ${PLATFORMER_LEVEL_NAMES[level]}`;
  };
  function resetControls() {
    controls.left = false;
    controls.right = false;
    controls.jump = false;
  }
  function updateHud() {
    document.querySelector("#platformer-demo-stars").textContent = `${state.collected.size} / 3`;
    document.querySelector("#platformer-demo-deaths").textContent = String(state.deaths);
    action.textContent = piloting ? decision?.action || "Choosing a move" : Object.entries(controls).filter(([, held]) => held).map(([key]) => key === "jump" ? "SPACE" : key === "left" ? "A" : "D").join(" + ") || "HOLD";
    target.textContent = piloting ? decision?.target.label || "Reading the next landing" : "Manual steering";
    risk.textContent = piloting ? `${decision?.risk ?? 0}%` : "manual";
    reason.textContent = state.won ? "Course complete. Restart to watch the pilot again." : piloting ? decision?.reason || "Comparing reachable landing surfaces." : "Your key input controls the same deterministic simulation.";
  }
  function step(dt) {
    if (paused || state.won) return;
    if (piloting) {
      policyClock -= dt;
      if (policyClock <= 0) {
        decision = policy.decide(state);
        policyInput = decision.input;
        policyClock = 12 * PLATFORMER_STEP_SECONDS;
        updateHud();
      }
      const events = stepPlatformer(state, policyInput, dt);
      if (events.some((event) => event.type === "enemy-hit" || event.type === "fall")) policyInput = { left: false, right: false, jump: false };
    } else {
      stepPlatformer(state, controls, dt);
    }
  }
  function frame(now) {
    accumulator += previousTime ? Math.min(0.1, (now - previousTime) / 1000) : 0;
    previousTime = now;
    while (accumulator >= PLATFORMER_STEP_SECONDS) {
      step(PLATFORMER_STEP_SECONDS);
      accumulator -= PLATFORMER_STEP_SECONDS;
    }
    drawMiniPlatformer(context, state, piloting ? decision : null);
    updateHud();
    requestAnimationFrame(frame);
  }
  function stopForInput() { if (piloting) setMode(false); }
  const keyMap = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", " ": "jump", ArrowUp: "jump", w: "jump", W: "jump" };
  const keydown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof Element && event.target.closest("button, select, input"))) return;
    if (event.key.toLowerCase() === "p") { if (!event.repeat) { paused = !paused; document.querySelector("#platformer-demo-pause").textContent = paused ? "Resume" : "Pause"; } return; }
    const key = keyMap[event.key];
    if (!key) return;
    event.preventDefault();
    stopForInput();
    controls[key] = true;
  };
  const keyup = (event) => { const key = keyMap[event.key]; if (key) controls[key] = false; };
  addEventListener("keydown", keydown);
  addEventListener("keyup", keyup);
  addEventListener("blur", resetControls);
  document.addEventListener("visibilitychange", () => { if (document.hidden) resetControls(); });
  startButton.onclick = () => setMode(!piloting);
  document.querySelector("#platformer-demo-return").onclick = () => setMode(true);
  document.querySelector("#platformer-demo-restart").onclick = () => restart(level);
  document.querySelector("#platformer-demo-pause").onclick = () => { paused = !paused; document.querySelector("#platformer-demo-pause").textContent = paused ? "Resume" : "Pause"; };
  courseSelect.onchange = () => restart(Number(courseSelect.value));
  restart(level);
  requestAnimationFrame(frame);
}
