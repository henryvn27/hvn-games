import artifact from "./policy.json" with { type: "json" };
import { SNAKE_DIRECTIONS, SNAKE_SIZE, legalSnakeDirections, snakeDistance } from "./simulation.mjs";

export const DEFAULT_SNAKE_WEIGHTS = Object.freeze({ food: 2.4, exits: 0.75, runway: 0.22, straight: 0.08, apple: 3.5, path: 0.55 });

const same = (a, b) => a[0] === b[0] && a[1] === b[1];

function runway(head, direction, bodyAfterMove) {
  const blocked = bodyAfterMove.slice(1, -1);
  let count = 0;
  for (let distance = 1; distance <= 8; distance += 1) {
    const point = [head[0] + direction[0] * distance, head[1] + direction[1] * distance];
    if (point[0] < 0 || point[0] >= SNAKE_SIZE || point[1] < 0 || point[1] >= SNAKE_SIZE || blocked.some((part) => same(part, point))) break;
    count += 1;
  }
  return count;
}

function shortestFoodPath(start, food, bodyAfterMove) {
  if (!food) return 0;
  const blocked = new Set(bodyAfterMove.slice(1, -1).map(([x, y]) => y * SNAKE_SIZE + x));
  const startIndex = start[1] * SNAKE_SIZE + start[0];
  const goalIndex = food[1] * SNAKE_SIZE + food[0];
  const distances = new Int16Array(SNAKE_SIZE * SNAKE_SIZE);
  distances.fill(-1);
  const queue = new Uint16Array(SNAKE_SIZE * SNAKE_SIZE);
  let read = 0;
  let write = 0;
  queue[write++] = startIndex;
  distances[startIndex] = 0;
  while (read < write) {
    const index = queue[read++];
    if (index === goalIndex) return distances[index];
    const x = index % SNAKE_SIZE;
    const y = Math.floor(index / SNAKE_SIZE);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= SNAKE_SIZE || ny < 0 || ny >= SNAKE_SIZE) continue;
      const next = ny * SNAKE_SIZE + nx;
      if (distances[next] >= 0 || blocked.has(next)) continue;
      distances[next] = distances[index] + 1;
      queue[write++] = next;
    }
  }
  return SNAKE_SIZE * SNAKE_SIZE;
}

export function createSnakePolicy(weights = DEFAULT_SNAKE_WEIGHTS) {
  return {
    name: artifact.name,
    decide(observation) {
      const options = legalSnakeDirections(observation.direction);
      const food = observation.food;
      const scored = options.map((direction) => {
        const head = [observation.body[0][0] + direction[0], observation.body[0][1] + direction[1]];
        const eating = food && same(head, food);
        const collisionBody = eating ? observation.body : observation.body.slice(0, -1);
        const collision = head[0] < 0 || head[0] >= SNAKE_SIZE || head[1] < 0 || head[1] >= SNAKE_SIZE || collisionBody.some((part) => same(part, head));
        if (collision) return { direction, score: -Infinity, runway: 0, exits: 0, progress: -2, eating: false, path: SNAKE_SIZE * SNAKE_SIZE };
        const bodyAfterMove = [head, ...(eating ? observation.body : observation.body.slice(0, -1))];
        const currentDistance = food ? snakeDistance(observation.body[0], food) : 0;
        const nextDistance = food ? snakeDistance(head, food) : 0;
        const progress = currentDistance - nextDistance;
        const exits = legalSnakeDirections(direction).filter((next) => {
          const cell = [head[0] + next[0], head[1] + next[1]];
          return cell[0] >= 0 && cell[0] < SNAKE_SIZE && cell[1] >= 0 && cell[1] < SNAKE_SIZE && !bodyAfterMove.slice(1, -1).some((part) => same(part, cell));
        }).length;
        const clearRunway = runway(head, direction, bodyAfterMove);
        const path = shortestFoodPath(head, food, bodyAfterMove);
        const score = progress * weights.food + exits * weights.exits + clearRunway * weights.runway + Number(same(direction, observation.direction)) * weights.straight + Number(Boolean(eating)) * weights.apple - path * weights.path;
        return { direction, score, runway: clearRunway, exits, progress, eating: Boolean(eating), path };
      });
      scored.sort((a, b) => b.score - a.score);
      const selected = scored[0];
      const label = Object.entries(SNAKE_DIRECTIONS).find(([, vector]) => same(vector, selected.direction))?.[0] || "straight";
      return {
        direction: [...selected.direction],
        keys: label.toUpperCase(),
        target: food ? `Apple at ${food[0] + 1}, ${food[1] + 1}` : "Board complete",
        reason: selected.eating ? "Take the apple and grow by one segment." : selected.path >= SNAKE_SIZE * SNAKE_SIZE ? "Keep the tail reachable, then reopen a path to the apple." : selected.exits <= 1 ? "Choose the open lane with the longest clear runway." : "Follow the shortest collision-free path while preserving room to turn.",
        features: { foodProgress: selected.progress, pathCells: selected.path, exits: selected.exits, runway: selected.runway },
      };
    },
  };
}

export function chooseSnakeAction(observation, weights) {
  return createSnakePolicy(weights).decide(observation);
}
