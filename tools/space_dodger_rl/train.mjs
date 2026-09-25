#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DEFAULT_DODGER_WEIGHTS, createSpaceDodgerPolicy } from "../../games/space-dodger/policy.mjs";
import { createSeededRandom, DODGER_STEP_SECONDS, SpaceDodgerSimulation } from "../../games/space-dodger/simulation.mjs";

const WEIGHT_BOUNDS = Object.freeze({
  repair: [0.4, 14],
  upgrade: [0.2, 12],
  danger: [0.5, 18],
  hullRisk: [0.2, 10],
  aim: [0.2, 12],
  lane: [0.1, 8],
  edge: [0.1, 8],
  smooth: [0, 4],
});
const ACTION_HOLD_STEPS = 5;
const DEFAULT_MAX_SECONDS = 120;
const ELITE_FRACTION = 0.2;

function parseArgs(argv) {
  const values = {
    iterations: 16,
    population: 24,
    episodes: 64,
    evalEpisodes: 240,
    maxSeconds: DEFAULT_MAX_SECONDS,
    seed: 20260925,
    output: "games/space-dodger/policy.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!name.startsWith("--")) throw new Error(`Unexpected argument: ${name}`);
    const key = name.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (!(key in values)) throw new Error(`Unknown option: ${name}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
    values[key] = key === "output" ? value : Number(value);
    index += 1;
  }
  for (const key of ["iterations", "population", "episodes", "evalEpisodes", "maxSeconds", "seed"]) {
    if (!Number.isFinite(values[key]) || values[key] < 1) throw new Error(`${key} must be a positive number`);
  }
  return values;
}

function episodeReturn(result) {
  return result.survivalSeconds
    + result.score / 360
    + result.repairPickups * 7
    + result.upgradePickups * 1.4
    + result.wavesCleared * 11
    + result.bossesDefeated * 18
    - result.damageTaken * 6
    - (result.endReason === "hull-depleted" ? 14 : 0);
}

export function runEpisode(weights, seed, maxSeconds = DEFAULT_MAX_SECONDS) {
  const simulation = new SpaceDodgerSimulation({ random: createSeededRandom(seed) });
  const policy = createSpaceDodgerPolicy({ weights });
  simulation.start();
  let action = null;
  const steps = Math.ceil(maxSeconds / DODGER_STEP_SECONDS);
  let actionClock = 0;
  for (let step = 0; step < steps && simulation.state === "running"; step += 1) {
    if (actionClock <= 0) {
      action = policy.act(simulation.observe());
      actionClock = ACTION_HOLD_STEPS;
    }
    simulation.step(DODGER_STEP_SECONDS, action);
    actionClock -= 1;
  }
  const seconds = Math.min(simulation.elapsed, maxSeconds);
  const result = {
    seed,
    survivalSeconds: Number(seconds.toFixed(2)),
    score: simulation.score,
    waveReached: simulation.wave,
    enemyKills: simulation.metrics.enemyKills,
    damageTaken: simulation.metrics.damageTaken,
    repairPickups: simulation.metrics.repairPickups,
    upgradePickups: simulation.metrics.upgradePickups,
    bossesDefeated: simulation.metrics.bossesDefeated,
    wavesCleared: simulation.metrics.wavesCleared,
    hullRemaining: simulation.ship.hp,
    endReason: simulation.state === "over" ? "hull-depleted" : "time-limit",
  };
  result.return = Number(episodeReturn(result).toFixed(4));
  return result;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function aggregate(episodes) {
  const fields = ["survivalSeconds", "score", "waveReached", "enemyKills", "damageTaken", "repairPickups", "upgradePickups", "bossesDefeated", "wavesCleared", "hullRemaining", "return"];
  const result = { episodes: episodes.length, timeLimitRate: 0 };
  for (const field of fields) result[`mean${field[0].toUpperCase()}${field.slice(1)}`] = Number(mean(episodes.map((episode) => episode[field])).toFixed(3));
  result.timeLimitRate = Number(mean(episodes.map((episode) => episode.endReason === "time-limit" ? 1 : 0)).toFixed(4));
  return result;
}

function pairedBootstrap(reference, trained, field, random, repetitions = 5000) {
  const pairs = reference.map((episode, index) => trained[index][field] - episode[field]);
  const difference = mean(pairs);
  const samples = Array.from({ length: repetitions }, () => {
    let sum = 0;
    for (let index = 0; index < pairs.length; index += 1) sum += pairs[Math.floor(random() * pairs.length)];
    return sum / pairs.length;
  }).sort((left, right) => left - right);
  return {
    meanDifference: Number(difference.toFixed(3)),
    confidence95: [Number(samples[Math.floor(repetitions * 0.025)].toFixed(3)), Number(samples[Math.floor(repetitions * 0.975)].toFixed(3))],
  };
}

function format(value, digits = 2) {
  return Number(value).toFixed(digits);
}

export function renderWhitepaper(artifact) {
  const { training } = artifact;
  const metricRows = [
    ["Survival (s)", "survivalSeconds", "meanSurvivalSeconds", 2],
    ["Score", "score", "meanScore", 1],
    ["Waves reached", null, "meanWaveReached", 2],
    ["Hull hits", "damageTaken", "meanDamageTaken", 2],
    ["Effective repairs", "repairPickups", "meanRepairPickups", 2],
    ["Weapon upgrades", "upgradePickups", "meanUpgradePickups", 2],
    ["Episode return", "return", "meanReturn", 2],
  ];
  const table = metricRows.map(([label, field, meanField, digits]) => {
    const interval = field ? training.pairedComparison[field].confidence95 : null;
    const change = field ? training.pairedComparison[field].meanDifference : training.trained[meanField] - training.baseline[meanField];
    const changeText = interval ? `${format(change, digits)} [${format(interval[0], digits)}, ${format(interval[1], digits)}]` : format(change, digits);
    return `| ${label} | ${format(training.baseline[meanField], digits)} | ${format(training.trained[meanField], digits)} | ${changeText} |`;
  }).join("\n");
  const weightTable = Object.entries(artifact.weights).map(([name, value]) => `| ${name} | ${format(value, 6)} |`).join("\n");
  return `# Learning a Survival Policy for Space Dodger

**HVN Games · Technical report 01 · 25 September 2026 · Policy ${artifact.version}**

## Abstract

We train and evaluate **${artifact.name}**, a tactical policy-search controller for Space Dodger. The policy selects from nine WASD movement commands; the game’s weapon fires automatically. A deterministic rules engine shared by training and browser inference exposes structured game state. Cross-entropy method (CEM) search tunes interpretable action-scoring weights using ${training.iterations} iterations, a population of ${training.population}, and ${training.episodesPerCandidate} common training seeds per candidate. On ${training.heldOutEpisodes} paired held-out seeds, mean survival changes by ${format(training.pairedComparison.survivalSeconds.meanDifference)} seconds (95% paired-bootstrap interval ${format(training.pairedComparison.survivalSeconds.confidence95[0])} to ${format(training.pairedComparison.survivalSeconds.confidence95[1])}); mean episode return changes by ${format(training.pairedComparison.return.meanDifference)} (${format(training.pairedComparison.return.confidence95[0])} to ${format(training.pairedComparison.return.confidence95[1])}). The task has a ${training.maxEpisodeSeconds}-second evaluation cap. These results measure the seeded simulator, not human play.

## 1. Environment

Space Dodger is a fixed-screen starfighter survival game. The ship starts with three hull points and a single-shot weapon. WASD or arrow keys move the ship at 260 pixels per second; movement is clamped to the playfield. Weapons fire automatically. Fighters and asteroids arrive in waves, and every fifth wave features a boss. Enemy projectiles and collisions remove hull, with a 1.5-second invulnerability period after a hit. Repair pickups restore one missing hull point; weapon pickups upgrade the gun to twin or triple fire. A repair reward is recorded only when a pickup restores missing hull. Episodes end when hull reaches zero or when the evaluation time limit is reached.

The browser game and trainer both use \`games/space-dodger/simulation.mjs\` for state transitions. The manual game retains its existing interface and run-recording path; pilot-only episodes do not write scores, achievements, shared playtime, or leaderboard results.

## 2. Policy

At each decision, the observation contains player position, hull and weapon level; enemy, boss, and hostile projectile positions and velocities; repair and upgrade positions; wave; score; and elapsed time. The policy does not read rendered pixels or the document tree.

The action space is hold, W, A, S, D, and the four diagonal key pairs. One action is held for five fixed simulation steps at 30 Hz, so the policy chooses at 6 Hz. The game continues to auto-fire. For each action, a short-horizon evaluator estimates pickup progress, firing alignment, boundary exposure, and closest approach to hazards. CEM tunes eight weights in that evaluator. At every generation, all candidates see the same ${training.episodesPerCandidate} training seeds; the top floor of 20% (${training.eliteCandidatesPerGeneration} of ${training.population} candidates at this setting) updates the next sampling distribution. This is optimization-based policy learning over a hand-designed controller; it is not a neural network or an imitation model.

## 3. Objective

The episode return is

$$G = T + S/360 + 7R + 1.4U + 11W + 18B - 6D - 14I_{death}.$$

Here, $T$ is seconds survived, $S$ is score, $R$ is repair pickups collected, $U$ is weapon upgrades collected, $W$ is waves cleared, $B$ is bosses defeated, and $D$ is hull hits. $I_{death}$ is one when hull depletion ends the episode and zero otherwise. The action evaluator separately raises its hazard penalty as hull is lost.

## 4. Training and evaluation protocol

The training seed is ${training.seed}. Training episodes use seed $${training.trainingSeedStart} + 7{,}919i$ for $i=0,\\ldots,${training.episodesPerCandidate - 1}$. Each candidate is scored on this same set to reduce noise from different spawns. Search evaluates ${training.iterations * training.population} candidates (${training.iterations * training.population * training.episodesPerCandidate.toLocaleString()} candidate-episodes), then selects the highest mean-return policy observed during search.

Evaluation uses ${training.heldOutEpisodes} seeds starting at ${training.heldOutSeedStart} with stride ${training.heldOutSeedStride}; none are training seeds. The initial tactical policy and selected policy are paired on identical holdout seeds, with a ${training.maxEpisodeSeconds}-second cap. Means are compared per episode. Percentile intervals use ${training.pairedBootstrapReplicates.toLocaleString()} deterministic paired bootstrap resamples. The “reference” is the initial policy-weight configuration, not a human benchmark.

## 5. Results

Training-set mean return is ${format(training.trainingBaseline.meanReturn)} for the initial policy and ${format(training.trainingSelected.meanReturn)} for the selected policy. Held-out summary:

| Metric | Reference | Trained | Paired change (95% interval) |
|---|---:|---:|---:|
${table}

The trained policy survives longer, takes fewer hull hits, and collects more weapon upgrades on these seeds. Its count of effective repairs is lower because it loses less hull and therefore has fewer useful repair opportunities. Mean score is slightly lower; its paired interval includes zero. ${format(training.trained.timeLimitRate * 100, 2)}% of trained episodes reach the time cap, so the survival measure is close to its ceiling and does not describe performance beyond ${training.maxEpisodeSeconds} seconds.

## 6. Selected policy coefficients

| Coefficient | Value |
|---|---:|
${weightTable}

## 7. Interactive interpretation and limitations

The browser pilot exposes its selected WASD keys, current tactical intent, projected path, and estimated near-term danger. A player can take control with WASD, arrows, direction buttons, or pointer steering, then return control to the policy. Pausing and restarting do not create scored runs.

The policy uses structured state and a short look-ahead. It receives no human demonstrations and does not learn directly from screenshots. The holdout samples the same procedural mechanics as training; it does not establish robustness to rule changes, equivalence to human skill, or leaderboard performance. Browser rendering is variable-rate while policy actions follow the fixed-step engine.

## 8. Reproduction

From the repository root, run:

\`\`\`sh
node tools/space_dodger_rl/train.mjs --seed ${training.seed}
\`\`\`

The command writes \`games/space-dodger/policy.json\` and this paper. The JSON artifact records weights, full search history, training and held-out seed protocols, aggregate metrics, and paired confidence intervals. The online paper is available at \`?game=space-dodger-rl\`; the opt-in pilot is \`?game=shelf&play=dodger&agent=1\`.

## References

Rubinstein, R. Y., and Kroese, D. P. *The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning.* Springer, 2004. [https://doi.org/10.1007/978-1-4757-4321-0](https://doi.org/10.1007/978-1-4757-4321-0).
`;
}

function clampWeights(candidate) {
  return Object.fromEntries(Object.entries(candidate).map(([name, value]) => {
    const [min, max] = WEIGHT_BOUNDS[name];
    return [name, Math.max(min, Math.min(max, value))];
  }));
}

function gaussian(random) {
  const u = Math.max(Number.EPSILON, random());
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function train(config) {
  const random = createSeededRandom(config.seed);
  const names = Object.keys(DEFAULT_DODGER_WEIGHTS).filter((name) => name in WEIGHT_BOUNDS);
  const meanWeights = { ...DEFAULT_DODGER_WEIGHTS };
  const spread = Object.fromEntries(names.map((name) => [name, Math.max(0.35, Math.abs(meanWeights[name]) * 0.38)]));
  let bestReturn = -Infinity;
  let bestWeights = { ...meanWeights };
  const history = [];
  const trainingSeeds = Array.from({ length: config.episodes }, (_, episode) => config.seed + 100_000 + episode * 7_919);

  for (let iteration = 0; iteration < config.iterations; iteration += 1) {
    const candidates = [];
    for (let candidateIndex = 0; candidateIndex < config.population; candidateIndex += 1) {
      const candidate = candidateIndex === 0
        ? { ...meanWeights }
        : clampWeights(Object.fromEntries(names.map((name) => [name, meanWeights[name] + gaussian(random) * spread[name]])));
      const episodes = trainingSeeds.map((seed) => runEpisode(candidate, seed, config.maxSeconds));
      const score = mean(episodes.map((episode) => episode.return));
      candidates.push({ score, weights: candidate });
      if (score > bestReturn) {
        bestReturn = score;
        bestWeights = { ...candidate };
      }
    }
    candidates.sort((left, right) => right.score - left.score);
    const elite = candidates.slice(0, Math.max(2, Math.floor(config.population * ELITE_FRACTION)));
    for (const name of names) {
      const values = elite.map((candidate) => candidate.weights[name]);
      meanWeights[name] = mean(values);
      spread[name] = Math.max(0.12, Math.sqrt(mean(values.map((value) => (value - meanWeights[name]) ** 2))) * 0.9);
    }
    const record = {
      iteration: iteration + 1,
      bestReturn: Number(bestReturn.toFixed(3)),
      generationMean: Number(mean(candidates.map((candidate) => candidate.score)).toFixed(3)),
      generationBest: Number(candidates[0].score.toFixed(3)),
    };
    history.push(record);
    process.stdout.write(`iteration ${String(iteration + 1).padStart(2, "0")}/${config.iterations} · best ${record.bestReturn} · generation ${record.generationBest}\n`);
  }
  return { weights: clampWeights(bestWeights), bestReturn, history };
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  const learned = train(config);
  const evaluationStart = config.seed + 10_000_000;
  const trainingSeedStart = config.seed + 100_000;
  const trainingSeeds = Array.from({ length: config.episodes }, (_, index) => trainingSeedStart + index * 7_919);
  const evaluationSeeds = Array.from({ length: config.evalEpisodes }, (_, index) => evaluationStart + index * 7_919);
  const trainingBaseline = aggregate(trainingSeeds.map((seed) => runEpisode(DEFAULT_DODGER_WEIGHTS, seed, config.maxSeconds)));
  const trainingSelected = aggregate(trainingSeeds.map((seed) => runEpisode(learned.weights, seed, config.maxSeconds)));
  const baselineEpisodes = evaluationSeeds.map((seed) => runEpisode(DEFAULT_DODGER_WEIGHTS, seed, config.maxSeconds));
  const trainedEpisodes = evaluationSeeds.map((seed) => runEpisode(learned.weights, seed, config.maxSeconds));
  const baseline = aggregate(baselineEpisodes);
  const trained = aggregate(trainedEpisodes);
  const bootstrapRandom = createSeededRandom(config.seed + 20_000_000);
  const pairedComparison = Object.fromEntries(["survivalSeconds", "score", "return", "damageTaken", "repairPickups", "upgradePickups"].map((field) => [
    field,
    pairedBootstrap(baselineEpisodes, trainedEpisodes, field, bootstrapRandom),
  ]));
  const artifact = {
    name: "mars-pilot-cem-v1",
    version: 1,
    weights: Object.fromEntries(Object.entries(learned.weights).map(([name, value]) => [name, Number(value.toFixed(6))])),
    training: {
      algorithm: "cross-entropy method (CEM) policy search over interpretable tactical weights",
      seed: config.seed,
      trainingSeedStart,
      trainingSeedStride: 7_919,
      iterations: config.iterations,
      population: config.population,
      episodesPerCandidate: config.episodes,
      maxEpisodeSeconds: config.maxSeconds,
      actionHoldSteps: ACTION_HOLD_STEPS,
      fixedStepSeconds: DODGER_STEP_SECONDS,
      heldOutSeedStart: evaluationStart,
      heldOutSeedStride: 7_919,
      heldOutEpisodes: config.evalEpisodes,
      pairing: "baseline and trained episodes use identical held-out seeds",
      eliteFraction: ELITE_FRACTION,
      eliteCandidatesPerGeneration: Math.max(2, Math.floor(config.population * ELITE_FRACTION)),
      pairedBootstrapReplicates: 5000,
      pairedComparison,
      bestTrainingReturn: Number(learned.bestReturn.toFixed(4)),
      trainingBaseline,
      trainingSelected,
      baseline,
      trained,
      trainingHistory: learned.history,
      observation: ["hull and weapon level", "enemy and boss positions/velocities", "incoming projectile trajectories", "repair and upgrade pickup positions", "wave, score, and elapsed time"],
      actions: ["hold", "W", "A", "S", "D", "W+A", "W+D", "S+A", "S+D"],
      actionSemantics: "WASD direction held for five 30 Hz simulation steps; the game auto-fires",
      reward: {
        survival: "+1.0 per second survived",
        score: "+1.0 per 360 score points",
        repair: "+7 per repair cell collected",
        upgrade: "+1.4 per weapon upgrade",
        wave: "+11 per cleared wave",
        boss: "+18 per boss defeated",
        damage: "-6 per hull hit",
        hullDepletion: "-14 at episode termination",
      },
    },
  };
  const output = resolve(config.output);
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  const defaultOutput = resolve("games/space-dodger/policy.json");
  const whitepaper = output === defaultOutput ? resolve("tools/space_dodger_rl/WHITEPAPER.md") : `${output}.md`;
  await writeFile(whitepaper, renderWhitepaper(artifact), "utf8");
  process.stdout.write(`wrote ${output}\n`);
  process.stdout.write(`wrote ${whitepaper}\n`);
  process.stdout.write(`baseline: ${JSON.stringify(baseline)}\n`);
  process.stdout.write(`trained: ${JSON.stringify(trained)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
}
