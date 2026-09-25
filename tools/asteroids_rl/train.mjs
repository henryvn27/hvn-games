#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAsteroidsPolicy, DEFAULT_ASTEROIDS_WEIGHTS } from "../../games/asteroids/policy.mjs";
import { createAsteroidsRun, startAsteroidsRun, stepAsteroidsRun } from "../../games/asteroids/simulation.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = resolve(ROOT, "games/asteroids/policy.json");
const BOUNDS = { aim: [0.2, 5], avoid: [0.2, 7], cruise: [45, 210], turnDeadband: [0.02, 0.75], panic: [0.15, 2], lead: [0.1, 1.8] };
const ACTION_HOLD_TICKS = 6;
const clamp = (value, [low, high]) => Math.max(low, Math.min(high, value));
function rng(seed) { let state = Number(seed) >>> 0 || 1; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
function gaussian(random) { return Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(Math.PI * 2 * random()); }
function mean(rows, key) { return rows.reduce((sum, row) => sum + Number(row[key]), 0) / Math.max(1, rows.length); }

export function runAsteroidsEpisode(weights, seed, maxTicks = 3600) {
  const run = createAsteroidsRun(seed);
  startAsteroidsRun(run);
  const policy = createAsteroidsPolicy(weights);
  let action = policy.decide(run);
  let ticks = 0;
  for (; ticks < maxTicks && run.mode === "playing"; ticks += 1) {
    if (ticks % ACTION_HOLD_TICKS === 0) action = policy.decide(run);
    stepAsteroidsRun(run, action, 1 / 60);
  }
  return {
    seed, score: run.score, waveReached: run.wave, livesRemaining: run.lives,
    survivalSeconds: Number(run.elapsed.toFixed(2)), wavesCleared: run.mode === "won" ? 3 : Math.max(0, run.wave - 1),
    collisionEnd: run.mode === "over", reachedTimeLimit: run.mode === "playing", threeWaveClear: run.mode === "won",
    return: Number((run.score / 10 + run.wave * 22 + run.elapsed * 1.2 + run.lives * 18 + (run.mode === "won" ? 80 : 0)).toFixed(3)),
  };
}
function summarize(rows) {
  return {
    episodes: rows.length,
    meanScore: Number(mean(rows, "score").toFixed(2)),
    meanWaveReached: Number(mean(rows, "waveReached").toFixed(3)),
    meanWavesCleared: Number(mean(rows, "wavesCleared").toFixed(3)),
    meanSurvivalSeconds: Number(mean(rows, "survivalSeconds").toFixed(2)),
    meanLivesRemaining: Number(mean(rows, "livesRemaining").toFixed(3)),
    collisionEndRate: Number(mean(rows, "collisionEnd").toFixed(4)),
    threeWaveClearRate: Number(mean(rows, "threeWaveClear").toFixed(4)),
    timeLimitRate: Number(mean(rows, "reachedTimeLimit").toFixed(4)),
    meanReturn: Number(mean(rows, "return").toFixed(3)),
  };
}
function interval(a, b, key, seed, repetitions = 3000) {
  const changes = a.map((row, index) => Number(b[index][key]) - Number(row[key]));
  const random = rng(seed);
  const samples = Array.from({ length: repetitions }, () => {
    let total = 0;
    for (let i = 0; i < changes.length; i += 1) total += changes[Math.floor(random() * changes.length)];
    return total / changes.length;
  }).sort((x, y) => x - y);
  return { meanDifference: Number(mean(changes.map((value) => ({ value })), "value").toFixed(3)), confidence95: [Number(samples[Math.floor(repetitions * 0.025)].toFixed(3)), Number(samples[Math.floor(repetitions * 0.975)].toFixed(3))] };
}

export function train({ iterations = 16, population = 20, episodes = 8, holdoutEpisodes = 48, maxTicks = 3600, seed = 20260925 } = {}) {
  const random = rng(seed);
  const names = Object.keys(BOUNDS);
  const trainSeeds = Array.from({ length: episodes }, (_, index) => seed + 101 + index * 7919);
  let center = { ...DEFAULT_ASTEROIDS_WEIGHTS };
  let spread = { aim: 0.65, avoid: 0.7, cruise: 32, turnDeadband: 0.14, panic: 0.4, lead: 0.3 };
  let best = { score: -Infinity, weights: center };
  const history = [];
  for (let generation = 0; generation < iterations; generation += 1) {
    const candidates = [];
    for (let index = 0; index < population; index += 1) {
      const weights = Object.fromEntries(names.map((name) => [name, clamp(center[name] + gaussian(random) * spread[name], BOUNDS[name])]));
      const score = mean(trainSeeds.map((episodeSeed) => runAsteroidsEpisode(weights, episodeSeed, maxTicks)), "return");
      candidates.push({ score, weights });
      if (score > best.score) best = { score, weights };
    }
    candidates.sort((a, b) => b.score - a.score);
    const elite = candidates.slice(0, Math.max(2, Math.ceil(population * 0.2)));
    for (const name of names) {
      center[name] = mean(elite.map(({ weights }) => ({ value: weights[name] })), "value");
      const variance = elite.reduce((sum, row) => sum + (row.weights[name] - center[name]) ** 2, 0) / elite.length;
      spread[name] = Math.max(name === "cruise" ? 2 : 0.025, Math.sqrt(variance) * 0.82);
    }
    history.push({ generation: generation + 1, bestReturn: Number(best.score.toFixed(3)), generationBest: Number(candidates[0].score.toFixed(3)) });
    process.stdout.write(`generation ${generation + 1}/${iterations}: best ${best.score.toFixed(2)}\n`);
  }
  const heldOutSeeds = Array.from({ length: holdoutEpisodes }, (_, index) => seed + 1_000_003 + index * 7919);
  const baselineRows = heldOutSeeds.map((episodeSeed) => runAsteroidsEpisode(DEFAULT_ASTEROIDS_WEIGHTS, episodeSeed, maxTicks));
  const trainedRows = heldOutSeeds.map((episodeSeed) => runAsteroidsEpisode(best.weights, episodeSeed, maxTicks));
  const weights = Object.fromEntries(names.map((name) => [name, Number(best.weights[name].toFixed(6))]));
  return {
    weights,
    artifact: {
      name: "asteroids-intercept-cem-v1", version: 1, weights,
      training: {
        algorithm: "cross-entropy method search over an interpretable pursuit-and-evasion controller",
        seed, iterations, population, episodesPerCandidate: episodes, maxTicks, actionHoldTicks: ACTION_HOLD_TICKS, heldOutEpisodes: holdoutEpisodes,
        observation: "ship pose and velocity, asteroid positions, sizes and velocities, current wave, bullets, and remaining lives",
        action: "left/right turn, thrust, and continuous Space fire",
        objective: "score, wave progress, survival, and remaining ships",
        baseline: summarize(baselineRows), trained: summarize(trainedRows),
        pairedSurvival: interval(baselineRows, trainedRows, "survivalSeconds", seed + 83),
        pairedScore: interval(baselineRows, trainedRows, "score", seed + 89), history,
      },
    },
  };
}

async function main() {
  const args = {};
  for (let index = 2; index < process.argv.length; index += 1) if (process.argv[index].startsWith("--")) args[process.argv[index].slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = Number(process.argv[index + 1]);
  const result = train(args);
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(result.artifact, null, 2)}\n`);
  process.stdout.write(`wrote ${OUTPUT}\n${JSON.stringify(result.artifact.training.trained, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) void main();
