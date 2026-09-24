export const MAZE = Object.freeze([
  "#################",
  "#...............#",
  "#.###.###.###.#.#",
  "#...............#",
  "#.###.###.###.#.#",
  "#...............#",
  "#.###.###.###.#.#",
  "#...............#",
  "#.###.###.###.#.#",
  "#...............#",
  "#.###.###.###.#.#",
  "#...............#",
  "#################",
]);

export const DIRECTIONS = Object.freeze({
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
});

const START = [1, 1];
const GHOST_STARTS = [[15, 11]];
const POWER_SPOTS = new Set(["1,5", "15,7", "9,3", "5,9"]);
const key = ([x, y]) => `${x},${y}`;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];

function makePellets() {
  return MAZE.map((row, y) => Array.from(row, (cell, x) => {
    if (cell === "#" || same([x, y], START) || GHOST_STARTS.some((ghost) => same(ghost, [x, y]))) return 0;
    return POWER_SPOTS.has(key([x, y])) ? 2 : 1;
  }));
}

function openAt(position) {
  const [x, y] = position;
  return MAZE[y]?.[x] === ".";
}

function neighbors(position) {
  return Object.values(DIRECTIONS).map(([dx, dy]) => [position[0] + dx, position[1] + dy]).filter(openAt);
}

function distanceMap(target) {
  const distances = new Map([[key(target), 0]]);
  const queue = [target];
  while (queue.length) {
    const current = queue.shift();
    for (const next of neighbors(current)) {
      if (distances.has(key(next))) continue;
      distances.set(key(next), distances.get(key(current)) + 1);
      queue.push(next);
    }
  }
  return distances;
}

export function createMazeRun() {
  const pellets = makePellets();
  return {
    mode: "ready", player: [...START], direction: "right", queuedDirection: "right",
    ghosts: GHOST_STARTS.map((position) => ({ position: [...position] })),
    pellets, remaining: pellets.flat().filter(Boolean).length, score: 0, lives: 3,
    powerSeconds: 0, playerClock: 0, ghostClock: 0, elapsed: 0,
  };
}

export function startMazeRun() {
  const run = createMazeRun();
  run.mode = "playing";
  return run;
}

function collect(run) {
  const [x, y] = run.player;
  const pellet = run.pellets[y][x];
  if (!pellet) return;
  run.pellets[y][x] = 0;
  run.remaining -= 1;
  run.score += pellet === 2 ? 50 : 10;
  if (pellet === 2) run.powerSeconds = 6;
  if (run.remaining === 0) run.mode = "won";
}

function stepGhost(ghost, target, fleeing) {
  const options = neighbors(ghost.position);
  if (!options.length) return;
  const distances = distanceMap(target);
  options.sort((a, b) => {
    const aDistance = distances.get(key(a)) ?? 0;
    const bDistance = distances.get(key(b)) ?? 0;
    return fleeing ? bDistance - aDistance : aDistance - bDistance;
  });
  ghost.position = options[0];
}

function checkCollision(run) {
  const ghost = run.ghosts.find((candidate) => same(candidate.position, run.player));
  if (!ghost) return;
  if (run.powerSeconds > 0) {
    run.score += 200;
    ghost.position = [...GHOST_STARTS[run.ghosts.indexOf(ghost)]];
    return;
  }
  run.lives -= 1;
  if (run.lives === 0) {
    run.mode = "over";
    return;
  }
  run.player = [...START];
  run.direction = "right";
  run.queuedDirection = "right";
  run.ghosts.forEach((candidate, index) => { candidate.position = [...GHOST_STARTS[index]]; });
}

export function stepMaze(run, input = {}, seconds = 0.16) {
  if (run.mode !== "playing") return run;
  const delta = Math.max(0, Math.min(0.5, Number(seconds) || 0));
  run.elapsed += delta;
  run.powerSeconds = Math.max(0, run.powerSeconds - delta);
  if (DIRECTIONS[input.direction]) run.queuedDirection = input.direction;
  run.playerClock += delta;
  run.ghostClock += delta;

  if (run.playerClock >= 0.16) {
    run.playerClock %= 0.16;
    const [turnX, turnY] = DIRECTIONS[run.queuedDirection];
    const turned = [run.player[0] + turnX, run.player[1] + turnY];
    if (openAt(turned)) run.direction = run.queuedDirection;
    const [dx, dy] = DIRECTIONS[run.direction];
    const next = [run.player[0] + dx, run.player[1] + dy];
    if (openAt(next)) run.player = next;
    collect(run);
    checkCollision(run);
  }

  if (run.mode === "playing" && run.ghostClock >= 0.52) {
    run.ghostClock %= 0.52;
    for (const ghost of run.ghosts) stepGhost(ghost, run.player, run.powerSeconds > 0);
    checkCollision(run);
  }
  return run;
}
