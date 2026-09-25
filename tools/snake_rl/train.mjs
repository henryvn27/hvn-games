#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSnakePolicy, DEFAULT_SNAKE_WEIGHTS } from "../../games/snake/policy.mjs";
import { createSnakeRun, SNAKE_SIZE, stepSnakeRun } from "../../games/snake/simulation.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = resolve(ROOT, "games/snake/policy.json");
const BOUNDS = { food: [0.2, 8], exits: [0, 4], runway: [0, 1.5], straight: [-0.5, 1], apple: [0, 8], path: [0.05, 2] };
const clamp = (value, [low, high]) => Math.max(low, Math.min(high, value));

function rng(seed) {
  let state = Number(seed) >>> 0 || 1;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
function gaussian(random) {
  return Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(2 * Math.PI * random());
}

export function runSnakeEpisode(weights, seed, maxSteps = 900) {
  const run = createSnakeRun(seed);
  const policy = createSnakePolicy(weights);
  while (run.mode === "playing" && run.steps < maxSteps) {
    const decision = policy.decide({ body: run.body, direction: run.direction, food: run.food, score: run.score, steps: run.steps });
    stepSnakeRun(run, decision.direction);
  }
  return {
    seed,
    score: run.score,
    survivalSteps: run.steps,
    bodyLength: run.body.length,
    clearedBoard: run.won,
    collision: run.mode === "over",
    return: Number((run.score * 2 + Math.min(run.steps, maxSteps) * 0.02 + Number(run.won) * 25).toFixed(3)),
  };
}

function mean(rows, key) { return rows.reduce((sum, row) => sum + row[key], 0) / Math.max(1, rows.length); }
function summarize(rows) {
  return {
    episodes: rows.length,
    meanScore: Number(mean(rows, "score").toFixed(3)),
    meanSurvivalSteps: Number(mean(rows, "survivalSteps").toFixed(2)),
    meanBodyLength: Number(mean(rows, "bodyLength").toFixed(3)),
    boardClearRate: Number(mean(rows, "clearedBoard").toFixed(4)),
    collisionRate: Number(mean(rows, "collision").toFixed(4)),
    meanReturn: Number(mean(rows, "return").toFixed(3)),
  };
}

function pairedInterval(reference, trained, field, seed, repetitions = 3000) {
  const differences = reference.map((row, index) => Number(trained[index][field]) - Number(row[field]));
  const random = rng(seed);
  const samples = Array.from({ length: repetitions }, () => {
    let total = 0;
    for (let index = 0; index < differences.length; index += 1) total += differences[Math.floor(random() * differences.length)];
    return total / differences.length;
  }).sort((a, b) => a - b);
  return { meanDifference: Number(mean(differences.map((value) => ({ value })), "value").toFixed(3)), confidence95: [Number(samples[Math.floor(repetitions * 0.025)].toFixed(3)), Number(samples[Math.floor(repetitions * 0.975)].toFixed(3))] };
}

export function train({ iterations = 18, population = 22, episodes = 6, holdoutEpisodes = 48, maxSteps = 900, seed = 20260925 } = {}) {
  const random = rng(seed);
  const names = Object.keys(BOUNDS);
  const trainSeeds = Array.from({ length: episodes }, (_, index) => seed + 101 + index * 7919);
  let center = { ...DEFAULT_SNAKE_WEIGHTS };
  let spread = { food: 1.2, exits: 0.6, runway: 0.22, straight: 0.3, apple: 1.2, path: 0.35 };
  let best = { score: -Infinity, weights: center };
  const history = [];
  for (let generation = 0; generation < iterations; generation += 1) {
    const candidates = [];
    for (let index = 0; index < population; index += 1) {
      const weights = Object.fromEntries(names.map((name) => [name, clamp(center[name] + gaussian(random) * spread[name], BOUNDS[name])]));
      const episodesResult = trainSeeds.map((episodeSeed) => runSnakeEpisode(weights, episodeSeed, maxSteps));
      const score = mean(episodesResult, "return");
      candidates.push({ score, weights });
      if (score > best.score) best = { score, weights };
    }
    candidates.sort((a, b) => b.score - a.score);
    const elite = candidates.slice(0, Math.max(2, Math.ceil(population * 0.2)));
    for (const name of names) {
      center[name] = mean(elite.map(({ weights }) => ({ value: weights[name] })), "value");
      const variance = elite.reduce((sum, row) => sum + (row.weights[name] - center[name]) ** 2, 0) / elite.length;
      spread[name] = Math.max(0.035, Math.sqrt(variance) * 0.82);
    }
    history.push({ generation: generation + 1, bestReturn: Number(best.score.toFixed(3)), generationBest: Number(candidates[0].score.toFixed(3)) });
    process.stdout.write(`generation ${generation + 1}/${iterations}: best ${best.score.toFixed(2)}\n`);
  }
  const holdoutSeeds = Array.from({ length: holdoutEpisodes }, (_, index) => seed + 1_000_003 + index * 7919);
  const baselineRows = holdoutSeeds.map((episodeSeed) => runSnakeEpisode(DEFAULT_SNAKE_WEIGHTS, episodeSeed, maxSteps));
  const trainedRows = holdoutSeeds.map((episodeSeed) => runSnakeEpisode(best.weights, episodeSeed, maxSteps));
  return {
    weights: Object.fromEntries(names.map((name) => [name, Number(best.weights[name].toFixed(6))])),
    artifact: {
      name: "snake-route-cem-v1",
      version: 1,
      weights: Object.fromEntries(names.map((name) => [name, Number(best.weights[name].toFixed(6))])),
      training: {
        algorithm: "cross-entropy method policy search over a local route-scoring controller",
        seed, iterations, population, episodesPerCandidate: episodes, maxSteps, heldOutEpisodes: holdoutEpisodes,
        board: `${SNAKE_SIZE} × ${SNAKE_SIZE} classic grid`,
        observation: "ordered body cells, current heading, and apple cell",
        action: "one of the three non-reversing cardinal turns per grid step",
        objective: "food collected, survival duration, and complete-board bonus; collision ends the episode",
        baseline: summarize(baselineRows), trained: summarize(trainedRows),
        pairedScore: pairedInterval(baselineRows, trainedRows, "score", seed + 77), history,
      },
    },
  };
}

async function main() {
  const options = Object.fromEntries(process.argv.slice(2).map((arg, index, args) => arg.startsWith("--") ? [arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), Number(args[index + 1])] : null).filter(Boolean));
  const result = train(options);
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(result.artifact, null, 2)}\n`);
  process.stdout.write(`wrote ${OUTPUT}\n${JSON.stringify(result.artifact.training.trained, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) void main();
