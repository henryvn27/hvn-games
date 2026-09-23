import assert from "node:assert/strict";
import { advanceSector, createRun, EXIT, GRAVITY, pulseGravity, SECTORS, stepRun } from "./simulation.js";

const initial = createRun();
assert.equal(initial.mode, "active");
assert.equal(initial.sector, 0);
assert.equal(SECTORS.length, 6);
assert.equal(GRAVITY.length, 4);
assert.equal(pulseGravity(initial).gravityTurn, 1);
assert.equal(pulseGravity(initial).charge, 0);
assert.equal(pulseGravity(pulseGravity(initial)).charge, 0);
assert.equal(advanceSector(initial), initial, "cannot advance before all cells are collected");

const moved = stepRun(initial, { right: true }, 1 / 30);
assert.ok(moved.x > initial.x, "right input accelerates the probe");
assert.ok(Number.isFinite(moved.vx));
let bounded = stepRun({ ...initial, x: 899, vx: 500 }, {}, 1 / 30);
assert.ok(bounded.x <= 900 - 14, "probe stays inside chamber");
assert.ok(bounded.vx < 0, "wall contact reflects momentum");

const collected = stepRun({ ...initial, x: 250, y: 160 }, { reducedMotion: true }, 1 / 60);
assert.ok(collected.collected.includes(0), "touching a cell collects it");
assert.equal(collected.charge, 2, "cell restores one gravity pulse");

const hazardSector = SECTORS[0].hazard;
const hazard = stepRun({ ...initial, x: hazardSector[0] + 95, y: hazardSector[1] }, {}, 1 / 60);
assert.equal(hazard.mode, "lost", "core collision ends the run");

let final = { ...initial, sector: 5, collected: [0, 1, 2], elapsed: 83, x: EXIT.x - 18, y: EXIT.y, vx: 350 };
final = stepRun(final, {}, 1 / 60);
assert.equal(final.mode, "won", "docking after the last sector wins");
assert.equal(final.result.seconds, Math.ceil(final.elapsed));
assert.equal(final.result.perfect, true);

const timeout = stepRun({ ...initial, elapsed: 239.99 }, {}, 0.05);
assert.equal(timeout.mode, "lost");
assert.equal(timeout.result.reason, "The station sealed its airlock.");
console.log("Driftlock simulation checks passed.");
