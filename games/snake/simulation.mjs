export const SNAKE_SIZE = 20;
export const SNAKE_STEP_SECONDS = 0.125;
export const SNAKE_DIRECTIONS = Object.freeze({
  up: Object.freeze([0, -1]), right: Object.freeze([1, 0]), down: Object.freeze([0, 1]), left: Object.freeze([-1, 0]),
});

const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const equalsDirection = (a, b) => same(a, b);

export function createSnakeRun(seed = 20260925) {
  const run = {
    seed: (Number(seed) >>> 0) || 1,
    mode: "playing",
    body: [[8, 10], [7, 10], [6, 10]],
    direction: [1, 0],
    food: null,
    score: 0,
    steps: 0,
    collisions: 0,
    won: false,
  };
  spawnSnakeFood(run);
  return run;
}

export function cloneSnakeRun(run) {
  return structuredClone(run);
}

export function spawnSnakeFood(run) {
  const occupied = new Set(run.body.map(([x, y]) => `${x}:${y}`));
  const free = [];
  for (let y = 0; y < SNAKE_SIZE; y += 1) {
    for (let x = 0; x < SNAKE_SIZE; x += 1) if (!occupied.has(`${x}:${y}`)) free.push([x, y]);
  }
  if (!free.length) {
    run.food = null;
    run.mode = "won";
    run.won = true;
    return;
  }
  run.seed = (Math.imul(run.seed, 1664525) + 1013904223) >>> 0;
  run.food = free[Math.floor((run.seed / 4294967296) * free.length)];
}

export function legalSnakeDirections(direction) {
  const options = [direction, [-direction[1], direction[0]], [direction[1], -direction[0]]];
  return options.filter((candidate, index) => options.findIndex((other) => equalsDirection(candidate, other)) === index);
}

export function stepSnakeRun(run, nextDirection) {
  if (run.mode !== "playing") return { run, event: null };
  if (!nextDirection || nextDirection[0] === -run.direction[0] && nextDirection[1] === -run.direction[1]) nextDirection = run.direction;
  const direction = [Math.sign(nextDirection[0]), Math.sign(nextDirection[1])];
  if (Math.abs(direction[0]) + Math.abs(direction[1]) !== 1) nextDirection = run.direction;
  else nextDirection = direction;
  const head = [run.body[0][0] + nextDirection[0], run.body[0][1] + nextDirection[1]];
  const eating = run.food && same(head, run.food);
  const collisionBody = eating ? run.body : run.body.slice(0, -1);
  if (head.some((value) => value < 0 || value >= SNAKE_SIZE) || collisionBody.some((part) => same(part, head))) {
    run.mode = "over";
    run.collisions += 1;
    return { run, event: { type: "collision", score: run.score } };
  }
  run.direction = [...nextDirection];
  run.body.unshift(head);
  run.steps += 1;
  if (eating) {
    run.score += 1;
    spawnSnakeFood(run);
    return { run, event: { type: "food", score: run.score } };
  }
  run.body.pop();
  return { run, event: null };
}

export function snakeObservation(run) {
  return {
    body: run.body.map((part) => [...part]),
    direction: [...run.direction],
    food: run.food ? [...run.food] : null,
    score: run.score,
    steps: run.steps,
  };
}

export function snakeDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

export function countSnakeExits(head, direction, body) {
  const occupied = body.slice(0, -1);
  const cells = [[head[0] + direction[0], head[1] + direction[1]], [head[0] - direction[1], head[1] + direction[0]], [head[0] + direction[1], head[1] - direction[0]]];
  return cells.reduce((total, cell) => total + Number(
    cell[0] >= 0 && cell[0] < SNAKE_SIZE && cell[1] >= 0 && cell[1] < SNAKE_SIZE && !occupied.some((part) => same(part, cell)),
  ), 0);
}
