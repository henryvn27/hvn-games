import assert from "node:assert/strict";
import { cameraOffsetForRound, createRound, DOCKSIDE, dropCrate, pauseRound, resumeRound, speedForRound, startRound, stepRound } from "./simulation.js";

const tickUntilLanded = (state) => {
  for (let i = 0; i < 240 && state.mode === "dropping"; i += 1) state = stepRound(state, 1 / 60);
  return state;
};

assert.equal(createRound().mode, "ready");
let run = startRound();
assert.equal(run.mode, "active");
const stillActive = stepRound(run, 0.04);
assert.notEqual(stillActive.block.x, run.block.x, "the hanging crate swings");

const centered = startRound();
centered.block.x = centered.floors[0].x + (centered.floors[0].width - centered.block.width) / 2;
run = tickUntilLanded(dropCrate(centered));
assert.equal(run.floors.length, 2);
assert.equal(run.score, 50);
assert.equal(run.combo, 1);
assert.equal(run.lastPlacement, "perfect");

const partial = startRound();
partial.block.x = partial.floors[0].x + partial.floors[0].width - 90;
run = tickUntilLanded(dropCrate(partial));
assert.equal(run.floors.length, 2);
assert.equal(run.floors.at(-1).width, 90);
assert.equal(run.score, 25);
assert.equal(run.combo, 0);

const miss = startRound();
miss.block.x = 0;
run = tickUntilLanded(dropCrate(miss));
assert.equal(run.floors.length, 1, "misses do not add a floor");
assert.equal(run.misses, 1);
assert.equal(run.mode, "active", "two spare drops remain");

run = startRound();
for (let i = 0; i < DOCKSIDE.maxMisses; i += 1) {
  run.block.x = 0;
  run = tickUntilLanded(dropCrate(run));
}
assert.equal(run.mode, "result", "the third missed crate ends the round");

const paused = pauseRound(startRound());
assert.equal(stepRound(paused, 0.05).elapsed, paused.elapsed, "pause freezes the simulation clock");
assert.equal(resumeRound(paused).mode, "active");
assert.equal(speedForRound(startRound()), DOCKSIDE.startingSpeed);
assert.ok(cameraOffsetForRound(startRound()) >= 0);

console.log("Dockside simulation checks passed.");
