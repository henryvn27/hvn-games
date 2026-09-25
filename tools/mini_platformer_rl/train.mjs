#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PLATFORMER_WEIGHTS, createMiniPlatformerPolicy, scorePlatformerEpisode } from "../../games/mini-platformer/policy.mjs";
import { PLATFORMER_LEVEL_NAMES, PLATFORMER_STEP_SECONDS, createPlatformerState, platformerProgress, stepPlatformer } from "../../games/mini-platformer/simulation.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TRAINING_LEVELS = [0, 1, 3, 4, 6, 7, 9, 10];
const HELD_OUT_LEVELS = [2, 5, 8, 11];
const MAX_SECONDS = 32;
const DECISION_STEPS = 12;
const BOUNDS = {
  progress: [0.2, 5], star: [0, 8], safety: [0, 8], stable: [0, 4], spring: [0, 3],
  checkpoint: [0, 4], gap: [0, 4], height: [0, 4], lookAhead: [170, 360],
  jumpLead: [15, 95], jumpHold: [0.08, 0.36], brakeLead: [8, 55],
};
const INITIAL_SPREAD = {
  progress: 0.9, star: 1.5, safety: 1.25, stable: 0.7, spring: 0.6,
  checkpoint: 0.65, gap: 0.55, height: 0.55, lookAhead: 58,
  jumpLead: 22, jumpHold: 0.08, brakeLead: 13,
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function randomGenerator(seed) {
  let state = Number(seed) >>> 0 || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function gaussian(random) {
  const u = Math.max(Number.EPSILON, random());
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function runEpisode(weights, levelIndex) {
  const state = createPlatformerState(levelIndex);
  const policy = createMiniPlatformerPolicy(weights);
  const cap = Math.round(MAX_SECONDS / PLATFORMER_STEP_SECONDS);
  let heldInput = { left: false, right: true, jump: false };
  let finalDecision = null;
  let ticks = 0;
  for (; ticks < cap && !state.won; ticks += 1) {
    if (ticks % DECISION_STEPS === 0) {
      finalDecision = policy.decide(state);
      heldInput = finalDecision.input;
    }
    const events = stepPlatformer(state, heldInput);
    if (events.some((event) => event.type === "enemy-hit" || event.type === "fall")) heldInput = { left: false, right: false, jump: false };
  }
  const result = {
    level: levelIndex + 1,
    course: PLATFORMER_LEVEL_NAMES[levelIndex],
    completed: state.won,
    seconds: Number((ticks * PLATFORMER_STEP_SECONDS).toFixed(2)),
    stars: state.collected.size,
    deaths: state.deaths,
    falls: state.falls,
    enemyHits: state.enemyHits,
    progress: Number(platformerProgress(state).toFixed(4)),
    routeScore: scorePlatformerEpisode({
      completed: state.won,
      progress: platformerProgress(state),
      stars: state.collected.size,
      seconds: ticks * PLATFORMER_STEP_SECONDS,
      deaths: state.deaths,
      falls: state.falls,
      enemyHits: state.enemyHits,
    }),
    finalAction: finalDecision?.action || "HOLD",
  };
  return result;
}

function summarize(results) {
  const mean = (key) => results.reduce((sum, result) => sum + result[key], 0) / Math.max(1, results.length);
  return {
    levels: results.length,
    completionRate: Number(mean("completed").toFixed(4)),
    meanSeconds: Number(mean("seconds").toFixed(3)),
    meanStars: Number(mean("stars").toFixed(3)),
    meanDeaths: Number(mean("deaths").toFixed(3)),
    meanFalls: Number(mean("falls").toFixed(3)),
    meanEnemyHits: Number(mean("enemyHits").toFixed(3)),
    meanProgress: Number(mean("progress").toFixed(4)),
    meanReturn: Number(mean("routeScore").toFixed(3)),
  };
}

function candidate(mean, spread, random) {
  return Object.fromEntries(Object.keys(BOUNDS).map((key) => [
    key,
    clamp(mean[key] + gaussian(random) * spread[key], ...BOUNDS[key]),
  ]));
}

function train({ iterations, population, seed }) {
  const random = randomGenerator(seed);
  const mean = { ...DEFAULT_PLATFORMER_WEIGHTS };
  const spread = { ...INITIAL_SPREAD };
  let best = { score: -Infinity, weights: { ...mean } };
  const history = [];
  const episodesPerCandidate = TRAINING_LEVELS.length;

  for (let generation = 0; generation < iterations; generation += 1) {
    const evaluated = [];
    for (let index = 0; index < population; index += 1) {
      const weights = candidate(mean, spread, random);
      const results = TRAINING_LEVELS.map((level) => runEpisode(weights, level));
      const score = results.reduce((sum, result) => sum + result.routeScore, 0) / results.length;
      evaluated.push({ score, weights, results });
      if (score > best.score) best = { score, weights: { ...weights } };
    }
    evaluated.sort((a, b) => b.score - a.score);
    const elites = evaluated.slice(0, Math.max(2, Math.ceil(population * 0.2)));
    for (const key of Object.keys(BOUNDS)) {
      const values = elites.map((item) => item.weights[key]);
      const nextMean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + (value - nextMean) ** 2, 0) / values.length;
      mean[key] = nextMean;
      const floor = key === "jumpHold" ? 0.012 : key === "lookAhead" ? 12 : key === "jumpLead" ? 5 : 0.08;
      spread[key] = Math.max(floor, Math.sqrt(variance) * 0.9);
    }
    history.push({
      iteration: generation + 1,
      bestReturn: Number(evaluated[0].score.toFixed(3)),
      eliteMeanReturn: Number((elites.reduce((sum, item) => sum + item.score, 0) / elites.length).toFixed(3)),
    });
    process.stdout.write(`generation ${String(generation + 1).padStart(2, "0")}/${iterations} best=${history.at(-1).bestReturn} elite=${history.at(-1).eliteMeanReturn}\n`);
  }
  return { weights: best.weights, history, bestTrainingReturn: best.score, episodesPerCandidate };
}

function markdown(artifact) {
  const t = artifact.training;
  const base = t.heldOutBaseline;
  const trained = t.heldOutSelected;
  const delta = (key, digits = 2) => (trained[key] - base[key]).toFixed(digits);
  const perCourse = t.heldOutByLevel.map((row) => `| ${row.level}. ${row.course} | ${row.baseline.completed ? "yes" : "no"} | ${row.selected.completed ? "yes" : "no"} | ${row.baseline.seconds.toFixed(2)} | ${row.selected.seconds.toFixed(2)} | ${row.baseline.stars} | ${row.selected.stars} | ${row.baseline.deaths} | ${row.selected.deaths} |`).join("\n");
  return `# A Receding-Horizon Policy for Mini Platformer

**HVN Games · Technical report · 25 September 2026 · ${artifact.name}**

## Abstract

This paper describes ${artifact.name}, a compact policy-search controller for Mini Platformer. It observes structured state from the game rules, chooses left/right/jump inputs at 10 Hz, and acts through the same 120 Hz simulation used by manual play. Cross-entropy method (CEM) search tunes twelve interpretable route and movement coefficients on ${t.trainingLevels.length} fixed courses. Evaluation holds out ${t.heldOutLevels.length} different courses, one or more from each world. On these deterministic holdout courses, the initial policy completes ${(base.completionRate * 100).toFixed(1)}% and the selected policy completes ${(trained.completionRate * 100).toFixed(1)}%; mean completion time changes by ${delta("meanSeconds")} seconds, mean stars by ${delta("meanStars")}, and mean retries by ${delta("meanDeaths")}. The sample is four fixed courses, so these measurements are descriptive of this course set rather than a population-level claim.

## 1. Task and rules

Mini Platformer has three worlds and twelve short courses. A player moves horizontally with acceleration toward a maximum speed of 220 px/s. Gravity is 1,100 px/s², ordinary jump impulse is −440 px/s, and releasing Space early cuts upward velocity to −180 px/s. The game includes a 120 ms jump buffer, 100 ms coyote window, spring pads, sinusoidally moving platforms, ledges that crumble after 0.6 s and return after 2.5 s, three collectible stars, a checkpoint, patrolling enemies, retries, and a finish flag. A player can stomp an enemy from above; a side collision or a fall below the course respawns the player. Collected stars persist across retries within a human attempt.

Training and the in-browser pilot import the same course builder and transition function from **games/mini-platformer/simulation.mjs**. Browser rendering and human key handling remain separate from the transition rules.

## 2. Observation and action

The policy reads player position, velocity, current support, jump grace timers, elapsed time, checkpoint state, collected stars, all platform positions/types/timers, and moving-enemy state. Its action is a held subset of A, D, and Space. Decisions are refreshed every 12 fixed steps (10 Hz at 120 Hz). The policy selects a reachable next surface, then steers toward its landing region. It does not read pixels or browser DOM. Shift has no game mechanic and is therefore not an action.

## 3. Policy and objective

The controller ranks reachable surfaces using forward progress, nearby uncollected stars, patrol exposure, surface stability, springs, checkpoint value, gap distance, and elevation. It commits to a target until landing or respawn, times a jump near the edge, holds it for a searched duration, and brakes toward the target's landing area. The learned vector contains eight route utility coefficients and four movement parameters: look-ahead distance, jump lead, jump hold time, and braking lead. This is policy search over an interpretable controller; it is not a neural network, an imitation model, or a learned visual perception system.

Episode return is computed as

> G = 150 I[finish] + 40 progress + 4 stars - 0.05 seconds - 16 retries - 4 falls - 10 enemy hits

The finish term rewards completion; the remaining terms reward forward travel and route markers while charging for time and failures.

## 4. Search and evaluation protocol

The trainer runs CEM with seed ${t.seed}, ${t.iterations} generations, a population of ${t.population}, and ${t.eliteCandidatesPerGeneration} elite candidates per generation. Every candidate sees the same ${t.episodesPerCandidate} training courses. The next sampling mean and spread are updated from the elites. Search evaluates ${t.iterations * t.population * t.episodesPerCandidate} candidate-course episodes. The reference is the initial hand-set coefficient vector. Holdout courses are disjoint from search courses and are evaluated from identical initial states; the simulation is deterministic, so there are no repeated random-seed trials or confidence intervals.

## 5. Holdout results

| Course | Reference finished | Selected finished | Reference seconds | Selected seconds | Reference stars | Selected stars | Reference retries | Selected retries |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
${perCourse}

Across the ${t.heldOutLevels.length} holdout courses, completion changes from ${(base.completionRate * 100).toFixed(1)}% to ${(trained.completionRate * 100).toFixed(1)}%; mean course time changes by ${delta("meanSeconds")} seconds, stars by ${delta("meanStars")}, retries by ${delta("meanDeaths")}, falls by ${delta("meanFalls")}, and enemy hits by ${delta("meanEnemyHits")} per course. The table is the primary evidence; averages over four courses should not be generalized to arbitrary platform games.

## 6. Live decision display

The playable route shows the active key combination, selected surface, planned landing area, a connecting path marker, and the policy's concise reason. The player can take control immediately using A/D, arrows, or Space. Agent-assisted play is a research demonstration and does not update saved progression, stars, best times, achievements, daily challenges, scores, or shared playtime.

## 7. Limitations

The policy sees exact game state, not pixels, and uses a hand-designed route-ranking structure. Its learned parameters optimize a small fixed course set. Only four courses are held out; moving-platform and enemy timing still follow the same deterministic rules, and there is no independent randomized physics perturbation. The evaluation does not establish human-equivalent skill, broad generalization, or performance after the rules change.

## 8. Reproduction

From the repository root, run **node tools/mini_platformer_rl/train.mjs**. The command rewrites **games/mini-platformer/policy.json** and **tools/mini_platformer_rl/WHITEPAPER.md** with the selected coefficients, search history, course split, and paired per-course measurements. Optional arguments are **--iterations**, **--population**, **--seed**, and **--output**.

## References

Rubinstein, R. Y., and Kroese, D. P. *The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning*. Springer, 2004. <https://doi.org/10.1007/978-1-4757-4321-0>.
`;
}

function parseArgs(argv) {
  const options = { iterations: 14, population: 20, seed: 20260925, output: "games/mini-platformer/policy.json" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      process.stdout.write("Usage: node tools/mini_platformer_rl/train.mjs [--iterations N] [--population N] [--seed N] [--output PATH]\n");
      process.exit(0);
    }
    if (!["--iterations", "--population", "--seed", "--output"].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
    options[arg.slice(2)] = arg === "--output" ? argv[++index] : Number(argv[++index]);
  }
  if (!Number.isInteger(options.iterations) || options.iterations < 1 || options.iterations > 100) throw new Error("--iterations must be an integer from 1 to 100");
  if (!Number.isInteger(options.population) || options.population < 4 || options.population > 200) throw new Error("--population must be an integer from 4 to 200");
  if (!Number.isSafeInteger(options.seed) || options.seed < 0) throw new Error("--seed must be a nonnegative integer");
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const initialTrain = TRAINING_LEVELS.map((level) => runEpisode(DEFAULT_PLATFORMER_WEIGHTS, level));
  const search = train(options);
  const selectedTrain = TRAINING_LEVELS.map((level) => runEpisode(search.weights, level));
  const heldOutByLevel = HELD_OUT_LEVELS.map((level) => ({
    level: level + 1,
    course: PLATFORMER_LEVEL_NAMES[level],
    baseline: runEpisode(DEFAULT_PLATFORMER_WEIGHTS, level),
    selected: runEpisode(search.weights, level),
  }));
  const heldOutBaseline = summarize(heldOutByLevel.map((entry) => entry.baseline));
  const heldOutSelected = summarize(heldOutByLevel.map((entry) => entry.selected));
  const artifact = {
    name: "market-trail-cem-v1",
    version: 1,
    weights: Object.fromEntries(Object.entries(search.weights).map(([key, value]) => [key, Number(value.toFixed(6))])),
    training: {
      algorithm: "cross-entropy method policy search over interpretable route and movement coefficients",
      seed: options.seed,
      iterations: options.iterations,
      population: options.population,
      eliteCandidatesPerGeneration: Math.max(2, Math.ceil(options.population * 0.2)),
      episodesPerCandidate: search.episodesPerCandidate,
      candidateCourseEpisodes: options.iterations * options.population * search.episodesPerCandidate,
      maxEpisodeSeconds: MAX_SECONDS,
      decisionFrequencyHz: 1 / (DECISION_STEPS * PLATFORMER_STEP_SECONDS),
      trainingLevels: TRAINING_LEVELS.map((level) => level + 1),
      heldOutLevels: HELD_OUT_LEVELS.map((level) => level + 1),
      trainingBaseline: summarize(initialTrain),
      trainingSelected: summarize(selectedTrain),
      heldOutBaseline,
      heldOutSelected,
      heldOutByLevel,
      history: search.history,
      initialBestReturn: Number(search.bestTrainingReturn.toFixed(4)),
      reproduction: "node tools/mini_platformer_rl/train.mjs",
    },
  };
  const outputPath = resolve(ROOT, options.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  const paperPath = resolve(ROOT, "tools/mini_platformer_rl/WHITEPAPER.md");
  await mkdir(dirname(paperPath), { recursive: true });
  await writeFile(paperPath, markdown(artifact));
  process.stdout.write(`reference holdout: ${JSON.stringify(heldOutBaseline)}\nselected holdout:  ${JSON.stringify(heldOutSelected)}\npolicy: ${outputPath}\nwhitepaper: ${paperPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
