import assert from "node:assert/strict";
import { createBreakoutRun, startBreakoutRun, stepBreakout } from "./simulation.js";

const fresh = createBreakoutRun();
assert.equal(fresh.bricks.length, 50);
assert.equal(fresh.mode, "ready");
const run = startBreakoutRun();
stepBreakout(run, { paddleX: -100 }, 0.01);
assert.ok(run.paddleX >= 47);
run.ballX = 300; run.ballY = 50; run.vx = 0; run.vy = -100;
stepBreakout(run, {}, 0.05);
assert.equal(run.bricks.filter((brick) => brick.alive).length, 49);
assert.ok(run.score > 0);
run.ballY = 450; run.vy = 100;
stepBreakout(run, {}, 0.05);
assert.equal(run.lives, 2);
assert.equal(run.mode, "ready");
console.log("Breakout simulation tests passed");
