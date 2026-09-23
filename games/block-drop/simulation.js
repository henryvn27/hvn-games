export const BLOCK_DROP = Object.freeze({ columns: 10, rows: 20, linesPerLevel: 10, lockDelay: 0.42 });
export const PIECE_TYPES = Object.freeze(["I", "J", "L", "O", "S", "T", "Z"]);

const SHAPES = Object.freeze({
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
});

const LINE_POINTS = Object.freeze([0, 100, 300, 500, 800]);
const copyBoard = (board) => board.map((row) => [...row]);

export function rotateMatrix(matrix) {
  const height = matrix.length;
  const width = matrix[0].length;
  const rotated = Array.from({ length: width }, () => Array(height).fill(0));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) rotated[x][height - 1 - y] = matrix[y][x];
  }
  return rotated;
}

export function matrixFor(piece) {
  let matrix = SHAPES[piece?.type];
  if (!matrix) return [];
  for (let turn = 0; turn < (piece.rotation + 4) % 4; turn += 1) matrix = rotateMatrix(matrix);
  return matrix;
}

function shuffledBag(random) {
  const bag = [...PIECE_TYPES];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swap = Math.min(index, Math.floor(Math.max(0, Math.min(.999999, random())) * (index + 1)));
    [bag[index], bag[swap]] = [bag[swap], bag[index]];
  }
  return bag;
}

function fillQueue(queue, random) {
  const next = [...queue];
  while (next.length < 7) next.push(...shuffledBag(random));
  return next;
}

function spawn(type) {
  const piece = { type, rotation: 0, x: 0, y: 0 };
  const shape = matrixFor(piece);
  piece.x = Math.floor((BLOCK_DROP.columns - shape[0].length) / 2);
  return piece;
}

function pullPiece(queue, random) {
  const filled = fillQueue(queue, random);
  return { type: filled[0], queue: fillQueue(filled.slice(1), random) };
}

export function newRun(random = Math.random) {
  return {
    mode: "ready",
    board: Array.from({ length: BLOCK_DROP.rows }, () => Array(BLOCK_DROP.columns).fill(null)),
    current: null,
    queue: fillQueue([], random),
    held: null,
    holdUsed: false,
    score: 0,
    lines: 0,
    level: 1,
    elapsed: 0,
    dropClock: 0,
    groundedTime: 0,
    lockResets: 0,
    lastClear: 0,
    clearCount: 0,
  };
}

export function startRun(random = Math.random) {
  const ready = newRun(random);
  const next = pullPiece(ready.queue, random);
  return { ...ready, mode: "active", queue: next.queue, current: spawn(next.type) };
}

export function fallInterval(level) {
  return Math.max(.075, .78 * (0.82 ** Math.max(0, level - 1)));
}

export function collides(board, piece, dx = 0, dy = 0, rotation = piece?.rotation ?? 0) {
  if (!piece) return true;
  const shape = matrixFor({ ...piece, rotation });
  for (let row = 0; row < shape.length; row += 1) {
    for (let column = 0; column < shape[row].length; column += 1) {
      if (!shape[row][column]) continue;
      const x = piece.x + dx + column;
      const y = piece.y + dy + row;
      if (x < 0 || x >= BLOCK_DROP.columns || y < 0 || y >= BLOCK_DROP.rows || board[y][x]) return true;
    }
  }
  return false;
}

function wasGrounded(state) {
  return collides(state.board, state.current, 0, 1);
}

function afterManipulation(state, current) {
  const grounded = wasGrounded(state);
  const reset = grounded && state.lockResets < 8;
  return {
    ...state,
    current,
    groundedTime: reset ? 0 : state.groundedTime,
    lockResets: reset ? state.lockResets + 1 : state.lockResets,
  };
}

export function movePiece(state, direction) {
  if (state.mode !== "active" || ![-1, 1].includes(direction)) return state;
  const moved = { ...state.current, x: state.current.x + direction };
  return collides(state.board, moved) ? state : afterManipulation(state, moved);
}

export function rotatePiece(state, direction = 1) {
  if (state.mode !== "active" || ![-1, 1].includes(direction) || state.current.type === "O") return state;
  const rotation = (state.current.rotation + direction + 4) % 4;
  for (const kick of [0, -1, 1, -2, 2]) {
    const turned = { ...state.current, rotation, x: state.current.x + kick };
    if (!collides(state.board, turned)) return afterManipulation(state, turned);
  }
  return state;
}

function lockPiece(state, random) {
  const board = copyBoard(state.board);
  const shape = matrixFor(state.current);
  for (let row = 0; row < shape.length; row += 1) {
    for (let column = 0; column < shape[row].length; column += 1) {
      if (shape[row][column]) board[state.current.y + row][state.current.x + column] = state.current.type;
    }
  }

  const remaining = board.filter((row) => !row.every(Boolean));
  const cleared = BLOCK_DROP.rows - remaining.length;
  while (remaining.length < BLOCK_DROP.rows) remaining.unshift(Array(BLOCK_DROP.columns).fill(null));
  const score = state.score + (LINE_POINTS[cleared] || 0) * state.level;
  const lines = state.lines + cleared;
  const level = 1 + Math.floor(lines / BLOCK_DROP.linesPerLevel);
  const next = pullPiece(state.queue, random);
  const current = spawn(next.type);
  const toppedOut = collides(remaining, current);

  return {
    ...state,
    board: remaining,
    current: toppedOut ? null : current,
    queue: next.queue,
    holdUsed: false,
    score,
    lines,
    level,
    dropClock: 0,
    groundedTime: 0,
    lockResets: 0,
    lastClear: cleared,
    clearCount: state.clearCount + Number(cleared > 0),
    mode: toppedOut ? "over" : "active",
  };
}

export function hardDrop(state, random = Math.random) {
  if (state.mode !== "active") return state;
  let distance = 0;
  while (!collides(state.board, state.current, 0, distance + 1)) distance += 1;
  return lockPiece({ ...state, current: { ...state.current, y: state.current.y + distance }, score: state.score + distance * 2 }, random);
}

export function softDrop(state) {
  if (state.mode !== "active" || collides(state.board, state.current, 0, 1)) return state;
  return { ...state, current: { ...state.current, y: state.current.y + 1 }, score: state.score + 1, dropClock: 0, groundedTime: 0 };
}

export function holdPiece(state, random = Math.random) {
  if (state.mode !== "active" || state.holdUsed) return state;
  let incoming = state.held;
  let queue = state.queue;
  if (!incoming) {
    const next = pullPiece(queue, random);
    incoming = next.type;
    queue = next.queue;
  }
  const current = spawn(incoming);
  if (collides(state.board, current)) return { ...state, mode: "over", current: null };
  return {
    ...state,
    current,
    held: state.current.type,
    queue,
    holdUsed: true,
    dropClock: 0,
    groundedTime: 0,
    lockResets: 0,
  };
}

export function stepRun(state, dt = 1 / 60, random = Math.random) {
  if (state.mode !== "active") return state;
  const step = Math.min(.1, Math.max(0, Number(dt) || 0));
  let next = { ...state, elapsed: state.elapsed + step, dropClock: state.dropClock + step };
  const interval = fallInterval(next.level);

  while (next.dropClock >= interval && next.mode === "active") {
    next.dropClock -= interval;
    if (collides(next.board, next.current, 0, 1)) {
      next.dropClock = 0;
      break;
    }
    next.current = { ...next.current, y: next.current.y + 1 };
    next.groundedTime = 0;
  }

  if (collides(next.board, next.current, 0, 1)) {
    next.groundedTime += step;
    if (next.groundedTime >= BLOCK_DROP.lockDelay) next = lockPiece(next, random);
  } else {
    next.groundedTime = 0;
  }
  return next;
}

export function togglePause(state) {
  if (state.mode === "active") return { ...state, mode: "paused" };
  if (state.mode === "paused") return { ...state, mode: "active" };
  return state;
}
