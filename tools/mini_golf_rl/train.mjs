#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGolfPolicy, DEFAULT_GOLF_WEIGHTS } from "../../games/mini-golf/policy.mjs";
import { GOLF_COURSES, applyGolfShot, createGolfRun } from "../../games/mini-golf/simulation.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = resolve(ROOT, "games/mini-golf/policy.json");
const TRAIN_HOLES = [0, 1, 2, 3];
const HOLDOUT_HOLES = [4, 5];
const TRAIN_SETS = [[0, 1, 2], [1, 2, 3], [0, 2, 3], [0, 1, 3]];
const BOUNDS = { sink: [4, 45], progress: [0.2, 8], stroke: [0.1, 5], water: [0, 35], overshoot: [0, 6], sand: [0, 4] };
const clamp = (value, [low, high]) => Math.max(low, Math.min(high, value));
function rng(seed) { let state = Number(seed) >>> 0 || 1; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
function gaussian(random) { return Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(Math.PI * 2 * random()); }
function mean(rows, key) { return rows.reduce((sum, row) => sum + Number(row[key]), 0) / Math.max(1, rows.length); }

export function runGolfEpisode(weights, courseIndexes = TRAIN_HOLES) {
  const run = createGolfRun(courseIndexes);
  const policy = createGolfPolicy(weights);
  let shots = 0;
  while (!run.completed && shots < courseIndexes.length * 10) {
    const decision = policy.decide(run);
    applyGolfShot(run, decision);
    shots += 1;
  }
  const holesSunk = run.holed.filter(Boolean).length;
  return {
    strokes: run.totalStrokes,
    holes: courseIndexes.length,
    holesSunk,
    waterPenalties: run.waterPenalties,
    completed: run.completed,
    meanStrokesPerHole: Number((run.totalStrokes / Math.max(1, courseIndexes.length)).toFixed(3)),
    courseResults: courseIndexes.map((courseIndex, index) => ({ course: GOLF_COURSES[courseIndex].name, strokes: run.scores[index] ?? null, sunk: Boolean(run.holed[index]) })),
    return: Number((holesSunk * 25 - run.totalStrokes + Number(run.completed) * 10).toFixed(3)),
  };
}
function summarize(rows) {
  return {
    episodes: rows.length,
    holesEvaluated: rows.reduce((sum, row) => sum + row.holes, 0),
    meanStrokesPerHole: Number(mean(rows, "meanStrokesPerHole").toFixed(3)),
    meanHolesSunk: Number(mean(rows, "holesSunk").toFixed(3)),
    meanWaterPenalties: Number(mean(rows, "waterPenalties").toFixed(3)),
    courseCompletionRate: Number(mean(rows, "completed").toFixed(4)),
    meanReturn: Number(mean(rows, "return").toFixed(3)),
  };
}
function pairedInterval(reference, trained, key, seed, repetitions = 3000) {
  const differences = reference.map((row, index) => Number(trained[index][key]) - Number(row[key]));
  const random = rng(seed);
  const samples = Array.from({ length: repetitions }, () => {
    let total = 0;
    for (let i = 0; i < differences.length; i += 1) total += differences[Math.floor(random() * differences.length)];
    return total / differences.length;
  }).sort((a, b) => a - b);
  return { meanDifference: Number(mean(differences.map((value) => ({ value })), "value").toFixed(3)), confidence95: [Number(samples[Math.floor(repetitions * 0.025)].toFixed(3)), Number(samples[Math.floor(repetitions * 0.975)].toFixed(3))] };
}

export function train({ iterations = 14, population = 20, episodes = 4, seed = 20260925 } = {}) {
  const random = rng(seed);
  const names = Object.keys(BOUNDS);
  let center = { ...DEFAULT_GOLF_WEIGHTS };
  let spread = { sink: 5, progress: 1, stroke: 0.8, water: 5, overshoot: 1, sand: 0.7 };
  let best = { score: -Infinity, weights: center };
  const history = [];
  for (let generation = 0; generation < iterations; generation += 1) {
    const candidates = [];
    for (let index = 0; index < population; index += 1) {
      const weights = Object.fromEntries(names.map((name) => [name, clamp(center[name] + gaussian(random) * spread[name], BOUNDS[name])]));
      const score = mean(Array.from({ length: episodes }, (_, episode) => runGolfEpisode(weights, TRAIN_SETS[episode % TRAIN_SETS.length])), "return");
      candidates.push({ score, weights });
      if (score > best.score) best = { score, weights };
    }
    candidates.sort((a, b) => b.score - a.score);
    const elite = candidates.slice(0, Math.max(2, Math.ceil(population * 0.2)));
    for (const name of names) {
      center[name] = mean(elite.map(({ weights }) => ({ value: weights[name] })), "value");
      const variance = elite.reduce((sum, row) => sum + (row.weights[name] - center[name]) ** 2, 0) / elite.length;
      spread[name] = Math.max(0.025, Math.sqrt(variance) * 0.82);
    }
    history.push({ generation: generation + 1, bestReturn: Number(best.score.toFixed(3)), generationBest: Number(candidates[0].score.toFixed(3)) });
    process.stdout.write(`generation ${generation + 1}/${iterations}: best ${best.score.toFixed(2)}\n`);
  }
  const baselineRows = [runGolfEpisode(DEFAULT_GOLF_WEIGHTS, HOLDOUT_HOLES)];
  const trainedRows = [runGolfEpisode(best.weights, HOLDOUT_HOLES)];
  const weights = Object.fromEntries(names.map((name) => [name, Number(best.weights[name].toFixed(6))]));
  return {
    weights,
    artifact: {
      name: "pocket-greens-shot-cem-v1", version: 1, weights,
      training: {
        algorithm: "cross-entropy method search over a short-horizon shot-evaluation controller",
        seed, iterations, population, episodesPerCandidate: episodes, heldOutCourses: HOLDOUT_HOLES.length,
        trainingHoles: TRAIN_HOLES.map((index) => GOLF_COURSES[index].name), heldOutHoles: HOLDOUT_HOLES.map((index) => GOLF_COURSES[index].name),
        observation: "current ball lie, cup position, course walls, sand, and water geometry",
        action: "angle and launch power for one putt; reconsider after the ball settles",
        objective: "sink holes in fewer strokes while penalizing water returns and excess distance",
        baseline: summarize(baselineRows), trained: summarize(trainedRows),
        heldOutCourseResults: trainedRows[0].courseResults.map((result, index) => ({ ...result, referenceStrokes: baselineRows[0].courseResults[index].strokes, strokeDifference: result.strokes - baselineRows[0].courseResults[index].strokes })), history,
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
