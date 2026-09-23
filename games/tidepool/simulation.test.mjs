import assert from "node:assert/strict";
import { getPlantCounts, MATERIAL, newGame, nextTrial, placeMaterial, startGame, stepGame, TIDEPOOL, togglePause } from "./simulation.js";

const at = (x, y) => y * TIDEPOOL.columns + x;
let state = newGame();
assert.equal(state.mode, "ready");
assert.equal(state.cells.length, TIDEPOOL.columns * TIDEPOOL.rows);
assert.equal(state.cells[at(20, TIDEPOOL.rows - 1)], MATERIAL.ROCK);
state = startGame(state);
assert.equal(state.mode, "active");

let placement = placeMaterial(state, 35, TIDEPOOL.rows - 6, MATERIAL.KELP);
assert.equal(placement.placed, true, "kelp can root on the starter sand shelf");
state = placement.state;
for (let i = 0; i < 30; i += 1) state = stepGame(state, 0.1);
assert.equal(state.cells[at(35, TIDEPOOL.rows - 3)], MATERIAL.ROCK, "bedrock anchors the starter shelf through the tide simulation");
assert.equal(state.cells[at(35, TIDEPOOL.rows - 4)], MATERIAL.SAND, "the top shelf stays in place so kelp remains rooted");
assert.equal(state.cells[at(35, TIDEPOOL.rows - 6)], MATERIAL.KELP, "rooted kelp stays planted as loose sand settles around it");
placement = placeMaterial(state, 50, 10, MATERIAL.KELP);
assert.equal(placement.placed, false, "kelp cannot float without a solid base");
placement = placeMaterial(state, 48, 30, MATERIAL.WATER);
assert.equal(placement.placed, true);
state = placement.state;
assert.equal(state.cells[at(48, 30)], MATERIAL.WATER);

const paused = togglePause(state);
assert.equal(paused.mode, "paused");
assert.equal(stepGame(paused, 4), paused, "paused simulation freezes completely");
assert.equal(togglePause(paused).mode, "active");

const initialWater = state.cells.filter((cell) => cell === MATERIAL.WATER).length;
const initialTick = state.tick;
for (let i = 0; i < 10; i += 1) state = stepGame(state, 0.1);
assert.ok(state.tick - initialTick >= 9 && state.tick - initialTick <= 10, "fixed-step simulation advances consistently");
assert.ok(state.cells.filter((cell) => cell === MATERIAL.WATER).length > initialWater, "a rising tide feeds water through the inlet");
assert.equal(getPlantCounts(state).living, 1);

// A watered rooted plant matures; a plant left dry eventually withers.
let watered = newGame();
watered.mode = "active";
const plantIndex = at(35, TIDEPOOL.rows - 6);
watered.cells[plantIndex] = MATERIAL.KELP;
watered.cells[at(34, TIDEPOOL.rows - 6)] = MATERIAL.WATER;
watered.cells[at(33, TIDEPOOL.rows - 6)] = MATERIAL.ROCK;
watered.cells[at(34, TIDEPOOL.rows - 5)] = MATERIAL.ROCK;
watered.cells[at(33, TIDEPOOL.rows - 5)] = MATERIAL.ROCK;
for (let i = 0; i < 60; i += 1) {
  watered.cells[at(34, TIDEPOOL.rows - 6)] = MATERIAL.WATER;
  watered = stepGame(watered, 0.1);
}
assert.ok(watered.plantWet[plantIndex] >= 50);
assert.equal(getPlantCounts(watered).mature, 1);

let dry = newGame();
dry.mode = "active";
dry.cells[plantIndex] = MATERIAL.KELP;
for (let i = 0; i < 100; i += 1) dry = stepGame(dry, 0.1);
assert.equal(getPlantCounts(dry).living, 0, "an unwatered plant withers during the trial");

// Clear a trial after meeting its target, then carry the score into the next site.
let passed = newGame();
passed.mode = "active";
passed.trialElapsed = TIDEPOOL.trials[0].seconds - 0.1;
passed.cells[at(31, TIDEPOOL.rows - 6)] = MATERIAL.KELP;
passed.cells[at(32, TIDEPOOL.rows - 6)] = MATERIAL.WATER;
passed.cells[at(35, TIDEPOOL.rows - 6)] = MATERIAL.KELP;
passed.cells[at(36, TIDEPOOL.rows - 6)] = MATERIAL.WATER;
passed.plantWet[at(31, TIDEPOOL.rows - 6)] = 65;
passed.plantWet[at(35, TIDEPOOL.rows - 6)] = 65;
passed = stepGame(passed, 0.1);
assert.equal(passed.mode, "between");
assert.equal(passed.lastResult, "passed");
assert.ok(passed.score > 0);
const second = nextTrial(passed);
assert.equal(second.trial, 1);
assert.equal(second.mode, "active");
assert.equal(second.score, passed.score);
assert.equal(second.trialElapsed, 0);

let missed = newGame();
missed.mode = "active";
missed.trialElapsed = TIDEPOOL.trials[0].seconds - 0.1;
missed = stepGame(missed, 0.1);
assert.equal(missed.mode, "over", "missing the target ends the round");
assert.equal(nextTrial(missed), missed, "a failed trial cannot advance");

console.log("Tidepool simulation checks passed.");
