import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidsRun, startAsteroidsRun, stepAsteroidsRun } from "./simulation.mjs";

test("turning and thrust change the ship's heading and velocity", () => {
  const run = startAsteroidsRun(createAsteroidsRun(4));
  const heading = run.ship.angle;
  stepAsteroidsRun(run, { right: true, thrust: true }, 0.05);
  assert.ok(run.ship.angle > heading);
  assert.ok(Math.hypot(run.ship.vx, run.ship.vy) > 0);
});

test("shots break large asteroids into smaller targets and award points", () => {
  const run = startAsteroidsRun(createAsteroidsRun(7));
  run.ship.x = 380;
  run.ship.y = 240;
  run.ship.angle = -Math.PI / 2;
  run.asteroids = [{ x: 380, y: 200, vx: 0, vy: 0, size: 3, angle: 0, spin: 0, shape: 9 }];
  stepAsteroidsRun(run, { fire: true }, 0.05);
  assert.equal(run.score, 20);
  assert.deepEqual(run.asteroids.map((rock) => rock.size), [2, 2]);
  assert.equal(run.bullets.length, 0);
});

test("clearing waves advances the run and the third wave wins", () => {
  const run = startAsteroidsRun(createAsteroidsRun(8));
  assert.equal(run.wave, 1);
  run.asteroids = [];
  stepAsteroidsRun(run, {}, 0.016);
  assert.equal(run.wave, 2);
  assert.ok(run.asteroids.length > 0);
  run.wave = 3;
  run.asteroids = [];
  stepAsteroidsRun(run, {}, 0.016);
  assert.equal(run.mode, "won");
});

test("the ship wraps at the field edge", () => {
  const run = startAsteroidsRun(createAsteroidsRun(9));
  run.ship.x = 758;
  run.ship.vx = 100;
  stepAsteroidsRun(run, {}, 0.05);
  assert.ok(run.ship.x < 10);
});

test("a hit costs a life, resets the ship, and ends the last ship", () => {
  const run = startAsteroidsRun(createAsteroidsRun(10));
  run.lives = 1;
  run.ship.x = 120;
  run.ship.y = 120;
  run.ship.invulnerable = 0;
  run.asteroids = [{ x: 120, y: 120, vx: 0, vy: 0, size: 1, angle: 0, spin: 0, shape: 4 }];
  stepAsteroidsRun(run, {}, 0.016);
  assert.equal(run.lives, 0);
  assert.equal(run.mode, "over");
  assert.equal(run.ship.x, 380);
});
