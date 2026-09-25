import policyArtifact from "../../games/space-dodger/policy.json";

const number = (value, digits = 1) => Number(value || 0).toFixed(digits);
const signed = (value, digits = 1) => `${value > 0 ? "+" : ""}${number(value, digits)}`;

export function renderSpaceDodgerWhitepaper({ app, base }) {
  document.body.className = "rl-page dodger-paper-page";
  const results = policyArtifact.training;
  const baseline = results.baseline;
  const trained = results.trained;
  const survivalInterval = results.pairedComparison.survivalSeconds.confidence95;
  const comparison = [
    ["Mean survival", baseline.meanSurvivalSeconds, trained.meanSurvivalSeconds, "s", 1],
    ["Mean score", baseline.meanScore, trained.meanScore, "", 0],
    ["Mean wave reached", baseline.meanWaveReached, trained.meanWaveReached, "", 1],
    ["Effective repairs / run", baseline.meanRepairPickups, trained.meanRepairPickups, "", 2],
    ["Weapon upgrades / run", baseline.meanUpgradePickups, trained.meanUpgradePickups, "", 2],
    ["Hull hits / run", baseline.meanDamageTaken, trained.meanDamageTaken, "", 2],
    ["Episode return", baseline.meanReturn, trained.meanReturn, "", 1],
    ["Runs reaching time limit", baseline.timeLimitRate * 100, trained.timeLimitRate * 100, "%", 1],
  ];
  const weightRows = Object.entries(policyArtifact.weights);
  const pilotUrl = `${base}?game=shelf&amp;play=dodger&amp;agent=1`;
  const humanUrl = `${base}?game=shelf&amp;play=dodger`;

  app.innerHTML = `
    <header class="site-header page-width">
      <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
      <nav class="site-nav" aria-label="Page navigation"><a href="${humanUrl}">back to Space Dodger</a></nav>
    </header>
    <main class="rl-main page-width dodger-paper-main">
      <section class="rl-hero" aria-labelledby="dodger-paper-title">
        <p class="rl-kicker">HVN Games / Space Dodger / 2026</p>
        <h1 id="dodger-paper-title">Learning a survival policy<br><em>for Space Dodger.</em></h1>
        <p class="rl-dek">A reproducible study of a tactical policy-search agent for the Mars orbital-defence game. It steers with WASD, fires automatically, and exposes its current decision during play.</p>
        <div class="dodger-paper-actions"><a class="button button-primary" href="${pilotUrl}">Watch the pilot fly →</a><a class="button button-secondary" href="${humanUrl}">Play Space Dodger</a></div>
        <p class="rl-byline">HVN Games · Technical report 01 · 25 September 2026 · Policy ${policyArtifact.version}</p>
      </section>

      <section class="dodger-paper-summary" aria-label="Evaluation summary">
        <div><span>held-out runs</span><strong>${results.heldOutEpisodes}</strong></div>
        <div><span>mean survival</span><strong>${number(trained.meanSurvivalSeconds)}s</strong></div>
        <div><span>policy</span><strong>${policyArtifact.name}</strong></div>
      </section>

      <article class="rl-paper" aria-label="Space Dodger control policy paper">
        <section class="rl-paper-section rl-paper-intro">
          <p class="rl-label">abstract</p>
          <p>This report evaluates ${policyArtifact.name}, a cross-entropy method (CEM) policy-search agent for Space Dodger. The controller selects one of nine WASD actions every five steps while the game fires automatically. Its objective values survival, combat progress, effective hull repairs, and weapon upgrades while penalizing hull damage. On ${results.heldOutEpisodes} paired held-out seeds, the learned policy averaged ${number(trained.meanSurvivalSeconds)} seconds alive and ${number(trained.meanScore, 0)} points; the initial tactical policy averaged ${number(baseline.meanSurvivalSeconds)} seconds and ${number(baseline.meanScore, 0)} points. The paired mean survival difference was ${signed(results.pairedComparison.survivalSeconds.meanDifference)} s (95% bootstrap interval ${signed(survivalInterval[0])} to ${signed(survivalInterval[1])} s). These estimates describe the seeded simulator and are not a human benchmark.</p>
        </section>

        <div class="rl-paper-grid">
          <section class="rl-paper-section"><p class="rl-label">01 / task</p><h2>Survive the waves and keep a firing line.</h2><p>The starfighter begins with three hull points and a single weapon. Fighters and debris descend in waves; a dreadnought arrives every fifth wave. Enemy fire and contact remove hull. Repair cells restore one hull point, and upgrades improve the automatic weapon. The agent must balance collection, shot alignment, and evasion.</p></section>
          <section class="rl-paper-section"><p class="rl-label">02 / observation</p><h2>Read the world state directly.</h2><p>At each decision, the policy receives ship position, hull and weapon level; enemy and boss positions and velocities; hostile projectile trajectories; pickup positions; wave; score; and elapsed time. It does not classify screenshots or inspect the browser DOM. The same deterministic simulation module drives training and the playable run.</p></section>
          <section class="rl-paper-section"><p class="rl-label">03 / action</p><h2>Nine choices, held briefly.</h2><p>The action set is hold, W, A, S, D, or one of four diagonals. A selected direction is held for five 30 Hz steps, then reconsidered. Space Dodger already auto-fires, so the agent does not synthesize a fire button. A short look-ahead scores pickup progress, likely shot alignment, edge clearance, and predicted collision risk.</p></section>
          <section class="rl-paper-section"><p class="rl-label">04 / optimization</p><h2>Search tactical weights with CEM.</h2><p>We tune eight interpretable coefficients for repair and upgrade pursuit, projectile avoidance, hull-dependent risk, firing alignment, lane position, edge clearance, and smooth directional changes. Each candidate is scored on the same ${results.episodesPerCandidate} training seeds per generation to reduce variance from different enemy spawns. The top floor of 20% (${results.eliteCandidatesPerGeneration} of ${results.population} candidates here) defines the next sampling distribution. This is optimization-based policy learning over a hand-designed controller, not a neural network or imitation model.</p></section>
          <section class="rl-paper-section"><p class="rl-label">05 / objective</p><h2>Reward survival and useful progress.</h2><p>For each episode the return is:</p><pre class="dodger-equation">G = T + S/360 + 7R + 1.4U + 11W + 18B - 6D - 14I<sub>death</sub></pre><p>Here <em>T</em> is seconds survived, <em>S</em> score, <em>R</em> repairs collected, <em>U</em> upgrades, <em>W</em> cleared waves, <em>B</em> defeated bosses, and <em>D</em> hull hits. The policy’s separate short-horizon score increases collision aversion as hull is depleted.</p></section>
          <section class="rl-paper-section"><p class="rl-label">06 / evaluation</p><h2>Hold the seeds out of training.</h2><p>Training uses seed ${results.seed}, ${results.iterations} iterations, population ${results.population}, and ${results.episodesPerCandidate} shared episodes per candidate (up to ${results.iterations * results.population * results.episodesPerCandidate.toLocaleString()} candidate-episodes). Evaluation uses ${results.heldOutEpisodes} different seeds beginning at ${results.heldOutSeedStart}, with a ${results.maxEpisodeSeconds}-second cap. Both policies see each identical holdout seed. We report paired means and a percentile 95% paired-bootstrap interval from ${results.pairedBootstrapReplicates.toLocaleString()} resamples.</p></section>
        </div>

        <section class="rl-paper-section dodger-results-section" aria-labelledby="dodger-results-title">
          <p class="rl-label">07 / results</p>
          <h2 id="dodger-results-title">Held-out performance</h2>
          <p>On the training seeds, mean return changed from ${number(results.trainingBaseline.meanReturn)} for the reference to ${number(results.trainingSelected.meanReturn)} for the selected policy. On the untouched holdout, it changed from ${number(baseline.meanReturn)} to ${number(trained.meanReturn)}. This separation matters: search fitness alone is not evidence of generalization.</p>
          <p>Means are reported per episode. “Reference” is the initial tactical-weight policy evaluated on the same seed; it is not a human-play benchmark. Survival changed by ${signed(results.pairedComparison.survivalSeconds.meanDifference)} s (95% interval ${signed(survivalInterval[0])} to ${signed(survivalInterval[1])}); hull hits changed by ${signed(results.pairedComparison.damageTaken.meanDifference, 2)} (95% interval ${signed(results.pairedComparison.damageTaken.confidence95[0], 2)} to ${signed(results.pairedComparison.damageTaken.confidence95[1], 2)}); score changed by ${signed(results.pairedComparison.score.meanDifference, 1)} (95% interval ${signed(results.pairedComparison.score.confidence95[0], 1)} to ${signed(results.pairedComparison.score.confidence95[1], 1)}). Fewer repair cells restore hull because the trained policy is hit less often.</p>
          <div class="dodger-results-wrap"><table class="dodger-results-table"><thead><tr><th scope="col">Metric</th><th scope="col">Reference</th><th scope="col">Trained</th><th scope="col">Change</th></tr></thead><tbody>${comparison.map(([label, before, after, unit, digits]) => `<tr><th scope="row">${label}</th><td>${number(before, digits)}${unit}</td><td>${number(after, digits)}${unit}</td><td>${signed(after - before, digits)}${unit}</td></tr>`).join("")}</tbody></table></div>
        </section>

        <section class="rl-paper-section dodger-results-section" aria-labelledby="dodger-weights-title">
          <p class="rl-label">selected policy</p><h2 id="dodger-weights-title">Tactical coefficients</h2>
          <p>These are the final CEM-selected weights used by the browser pilot and included in the reproducibility artifact.</p>
          <div class="dodger-results-wrap"><table class="dodger-results-table"><thead><tr><th scope="col">Coefficient</th><th scope="col">Value</th></tr></thead><tbody>${weightRows.map(([name, value]) => `<tr><th scope="row">${name}</th><td>${number(value, 6)}</td></tr>`).join("")}</tbody></table></div>
        </section>

        <div class="rl-paper-grid dodger-paper-notes">
          <section class="rl-paper-section"><p class="rl-label">08 / live interpretation</p><h2>See each decision as it happens.</h2><p>The playable pilot view shows the selected WASD command, the current objective, projected ship position, and estimated threat level. A path marker is drawn on the game field. Keyboard input or the takeover button returns control to the player immediately.</p></section>
          <section class="rl-paper-section"><p class="rl-label">09 / limitations</p><h2>Interpret results within the model.</h2><p>Training and evaluation use the deterministic rules module, not the rendered manual game loop. Both advance at fixed 30 Hz; browser input and rendering run on a variable frame cadence. The policy sees structured state rather than pixels, has a short local action horizon, and receives no human demonstrations. Held-out seeds sample the same mechanics and difficulty distribution as training. They do not establish robustness to changed rules, human-equivalent skill, or leaderboard performance.</p></section>
          <section class="rl-paper-section"><p class="rl-label">10 / reproduction</p><h2>Recreate the policy artifact.</h2><p>Run <code>node tools/space_dodger_rl/train.mjs</code> from the repository root. The seeded trainer writes <code>games/space-dodger/policy.json</code>, recording policy weights, search history, train and holdout seed ranges, paired metrics, and bootstrap intervals. Default settings use ${results.iterations} generations and ${results.heldOutEpisodes} held-out episodes; options can override the seed, search budget, horizon, and output path.</p></section>
          <section class="rl-paper-section"><p class="rl-label">references</p><h2>Method</h2><p>R. Y. Rubinstein and D. P. Kroese, <em>The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning</em>, Springer, 2004. <a href="https://doi.org/10.1007/978-1-4757-4321-0" rel="noreferrer">doi:10.1007/978-1-4757-4321-0</a>.</p></section>
          <section class="rl-paper-section"><p class="rl-label">artifacts</p><h2>Policy and simulator</h2><p>Policy version ${policyArtifact.version}; ${results.algorithm}. The browser and trainer import the same simulation and policy code. Agent-only runs are excluded from shared playtime, daily challenges, achievements, and score records.</p></section>
        </div>
      </article>
    </main>
  `;
}
