import assert from "node:assert/strict";
import { createMazeRun, MAZE, startMazeRun, stepMaze } from "./simulation.mjs";

assert.equal(MAZE.every((row) => row.length === 17), true, "maze rows have one consistent width");
assert.equal(MAZE.every((row) => row.startsWith("#") && row.endsWith("#")), true, "maze is enclosed");

const ready = createMazeRun();
assert.equal(ready.mode, "ready");
assert.equal(ready.lives, 3);

const run = startMazeRun();
run.direction = "left";
run.queuedDirection = "left";
stepMaze(run, { direction: "left" }, 0.16);
assert.deepEqual(run.player, [1, 1], "a wall blocks movement");
stepMaze(run, { direction: "right" }, 0.16);
assert.deepEqual(run.player, [2, 1]);
assert.equal(run.score, 10, "collecting a dot adds points");

const power = startMazeRun();
power.player = [1, 4];
power.direction = "right";
power.queuedDirection = "down";
stepMaze(power, { direction: "down" }, 0.16);
assert.equal(power.powerSeconds, 6, "a power orb starts a six-second window");
assert.equal(power.score, 50);

const collision = startMazeRun();
collision.lives = 1;
collision.ghosts[0].position = [2, 1];
stepMaze(collision, { direction: "right" }, 0.16);
assert.equal(collision.mode, "over", "a final ghost collision ends the run");

const finish = startMazeRun();
finish.pellets = finish.pellets.map((row) => row.map(() => 0));
finish.pellets[1][2] = 1;
finish.remaining = 1;
stepMaze(finish, { direction: "right" }, 0.16);
assert.equal(finish.mode, "won", "clearing the last dot wins the maze");

console.log("Maze Chase movement, walls, scoring, power, collision, and win checks passed.");
