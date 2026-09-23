export const TIDEPOOL = Object.freeze({
  columns: 96,
  rows: 56,
  ticksPerSecond: 10,
  trials: Object.freeze([
    Object.freeze({ seconds: 60, target: 2, tidePeriod: 16, startingPlants: 3 }),
    Object.freeze({ seconds: 70, target: 3, tidePeriod: 14, startingPlants: 4 }),
    Object.freeze({ seconds: 80, target: 4, tidePeriod: 12, startingPlants: 5 }),
  ]),
});

export const MATERIAL = Object.freeze({
  EMPTY: 0,
  SAND: 1,
  WATER: 2,
  ROCK: 3,
  KELP: 4,
});

const SIZE = TIDEPOOL.columns * TIDEPOOL.rows;
const indexOf = (x, y) => y * TIDEPOOL.columns + x;
const inBounds = (x, y) => x >= 0 && x < TIDEPOOL.columns && y >= 0 && y < TIDEPOOL.rows;
const isSolid = (material) => material === MATERIAL.SAND || material === MATERIAL.ROCK || material === MATERIAL.KELP;

function setCell(state, x, y, material) {
  if (!inBounds(x, y)) return false;
  const index = indexOf(x, y);
  if (state.cells[index] !== MATERIAL.EMPTY && state.cells[index] !== MATERIAL.WATER) return false;
  if (material === MATERIAL.KELP) {
    const below = y + 1 < TIDEPOOL.rows ? state.cells[indexOf(x, y + 1)] : MATERIAL.ROCK;
    if (!isSolid(below)) return false;
  }
  state.cells[index] = material;
  state.plantWet[index] = 0;
  state.plantDry[index] = 0;
  return true;
}

export function newGame() {
  const cells = new Uint8Array(SIZE);
  const plantWet = new Uint8Array(SIZE);
  const plantDry = new Uint8Array(SIZE);
  for (let x = 0; x < TIDEPOOL.columns; x += 1) {
    cells[indexOf(x, TIDEPOOL.rows - 1)] = MATERIAL.ROCK;
    cells[indexOf(x, 0)] = MATERIAL.ROCK;
  }
  for (let y = 0; y < TIDEPOOL.rows; y += 1) {
    cells[indexOf(0, y)] = MATERIAL.ROCK;
    cells[indexOf(TIDEPOOL.columns - 1, y)] = MATERIAL.ROCK;
  }
  // Bedrock keeps the starter shelf from slumping before the player can plant.
  for (let x = 29; x <= 40; x += 1) {
    const y = TIDEPOOL.rows - 4 - Math.floor((x - 29) / 6);
    cells[indexOf(x, y + 2)] = MATERIAL.ROCK;
    cells[indexOf(x, y)] = MATERIAL.SAND;
    cells[indexOf(x, y + 1)] = MATERIAL.SAND;
  }
  return {
    mode: "ready",
    trial: 0,
    elapsed: 0,
    trialElapsed: 0,
    score: 0,
    highTides: 0,
    cells,
    plantWet,
    plantDry,
    tick: 0,
    tickCarry: 0,
    sourceColumn: 2,
    lastTideHigh: false,
    lastResult: null,
  };
}

export function startGame(state = newGame()) {
  if (state.mode !== "ready" && state.mode !== "over" && state.mode !== "won") return state;
  const next = newGame();
  next.mode = "active";
  return next;
}

export function togglePause(state) {
  if (state.mode === "active") return { ...state, mode: "paused" };
  if (state.mode === "paused") return { ...state, mode: "active" };
  return state;
}

export function placeMaterial(state, x, y, material) {
  if (state.mode !== "active" || !inBounds(x, y)) return { state, placed: false };
  if (![MATERIAL.SAND, MATERIAL.WATER, MATERIAL.ROCK, MATERIAL.KELP, MATERIAL.EMPTY].includes(material)) return { state, placed: false };
  const next = { ...state, cells: state.cells.slice(), plantWet: state.plantWet.slice(), plantDry: state.plantDry.slice() };
  const placed = material === MATERIAL.EMPTY
    ? clearMaterial(next, x, y)
    : setCell(next, x, y, material);
  return { state: placed ? next : state, placed };
}

function clearMaterial(state, x, y) {
  const index = indexOf(x, y);
  if (state.cells[index] === MATERIAL.EMPTY || state.cells[index] === MATERIAL.ROCK) return false;
  state.cells[index] = MATERIAL.EMPTY;
  state.plantWet[index] = 0;
  state.plantDry[index] = 0;
  return true;
}

function moveCell(state, from, to) {
  const moving = state.cells[from];
  const displaced = state.cells[to];
  state.cells[to] = moving;
  state.cells[from] = displaced === MATERIAL.WATER && moving === MATERIAL.SAND ? MATERIAL.WATER : MATERIAL.EMPTY;
  if (moving === MATERIAL.WATER && displaced === MATERIAL.EMPTY) {
    state.plantWet[to] = 0;
    state.plantDry[to] = 0;
  }
}

function canMoveInto(state, x, y, material) {
  if (!inBounds(x, y)) return false;
  const target = state.cells[indexOf(x, y)];
  return target === MATERIAL.EMPTY || (material === MATERIAL.SAND && target === MATERIAL.WATER);
}

function flow(state, x, y, material, direction) {
  const from = indexOf(x, y);
  const down = [[x, y + 1], [x + direction, y + 1], [x - direction, y + 1]];
  const sideways = [[x + direction, y], [x - direction, y]];
  const candidates = material === MATERIAL.SAND ? down : [...down, ...sideways];
  for (const [nextX, nextY] of candidates) {
    if (!canMoveInto(state, nextX, nextY, material)) continue;
    moveCell(state, from, indexOf(nextX, nextY));
    return true;
  }
  return false;
}

function wetNearby(state, x, y) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (!inBounds(x + dx, y + dy)) continue;
      if (state.cells[indexOf(x + dx, y + dy)] === MATERIAL.WATER) return true;
    }
  }
  return false;
}

function injectTide(state, trial) {
  const phase = (state.trialElapsed % trial.tidePeriod) / trial.tidePeriod;
  const high = phase < 0.62;
  const surface = Math.floor(TIDEPOOL.rows - 8 - (high ? 7 * Math.sin((phase / 0.62) * Math.PI) : 0));
  if (high && !state.lastTideHigh) state.highTides += 1;
  state.lastTideHigh = high;
  if (high) {
    for (let offset = 0; offset < 2; offset += 1) {
      const y = Math.min(TIDEPOOL.rows - 3, surface + offset + (state.tick % 3));
      const index = indexOf(state.sourceColumn, y);
      if (state.cells[index] === MATERIAL.EMPTY) state.cells[index] = MATERIAL.WATER;
    }
  } else if (state.tick % 3 === 0) {
    // The ebb pulls water back through the inlet. Only cells touching the inlet drain.
    const drainY = TIDEPOOL.rows - 2;
    for (let x = 1; x <= 3; x += 1) {
      const index = indexOf(x, drainY);
      if (state.cells[index] === MATERIAL.WATER) {
        state.cells[index] = MATERIAL.EMPTY;
        break;
      }
    }
  }
}

function countPlants(state) {
  let living = 0;
  let mature = 0;
  for (let i = 0; i < SIZE; i += 1) {
    if (state.cells[i] !== MATERIAL.KELP) continue;
    living += 1;
    if (state.plantWet[i] >= 50) mature += 1;
  }
  return { living, mature };
}

function completeTrial(state) {
  const config = TIDEPOOL.trials[state.trial];
  const { mature } = countPlants(state);
  const passed = mature >= config.target;
  const score = state.score + (passed ? config.target * 250 + mature * 40 + Math.max(0, Math.ceil(config.seconds - state.trialElapsed)) * 5 : mature * 25);
  const last = state.trial === TIDEPOOL.trials.length - 1;
  return {
    ...state,
    mode: passed ? (last ? "won" : "between") : "over",
    score,
    lastResult: passed ? "passed" : "missed",
  };
}

function tick(state, config) {
  state.tick += 1;
  injectTide(state, config);
  const direction = state.tick % 2 === 0 ? 1 : -1;
  const { columns, rows } = TIDEPOOL;
  for (let y = rows - 2; y >= 1; y -= 1) {
    const start = direction > 0 ? 1 : columns - 2;
    const end = direction > 0 ? columns - 1 : 0;
    for (let x = start; x !== end; x += direction) {
      const material = state.cells[indexOf(x, y)];
      if (material === MATERIAL.SAND || material === MATERIAL.WATER) flow(state, x, y, material, direction);
    }
  }
  for (let i = 0; i < SIZE; i += 1) {
    if (state.cells[i] !== MATERIAL.KELP) continue;
    const x = i % columns;
    const y = Math.floor(i / columns);
    if (wetNearby(state, x, y)) {
      state.plantWet[i] = Math.min(100, state.plantWet[i] + 1);
      state.plantDry[i] = 0;
    } else {
      state.plantDry[i] = Math.min(100, state.plantDry[i] + 1);
      if (state.plantDry[i] >= 90) {
        state.cells[i] = MATERIAL.EMPTY;
        state.plantWet[i] = 0;
        state.plantDry[i] = 0;
      }
    }
  }
}

export function stepGame(state, dt = 1 / 60) {
  if (state.mode !== "active") return state;
  const step = Math.max(0, Math.min(0.1, Number(dt) || 0));
  const next = {
    ...state,
    cells: state.cells.slice(),
    plantWet: state.plantWet.slice(),
    plantDry: state.plantDry.slice(),
    elapsed: state.elapsed + step,
    trialElapsed: state.trialElapsed + step,
    tickCarry: state.tickCarry + step * TIDEPOOL.ticksPerSecond,
  };
  const config = TIDEPOOL.trials[next.trial];
  while (next.tickCarry >= 1) {
    next.tickCarry -= 1;
    tick(next, config);
  }
  return next.trialElapsed >= config.seconds ? completeTrial(next) : next;
}

export function nextTrial(state) {
  if (state.mode !== "between" || state.trial >= TIDEPOOL.trials.length - 1) return state;
  const next = newGame();
  next.mode = "active";
  next.trial = state.trial + 1;
  next.elapsed = state.elapsed;
  next.score = state.score;
  next.highTides = state.highTides;
  return next;
}

export function getPlantCounts(state) {
  return countPlants(state);
}
