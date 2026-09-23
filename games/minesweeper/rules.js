const MODES = Object.freeze({
  easy: { width: 8, height: 8, mines: 10 },
  normal: { width: 10, height: 10, mines: 18 },
  hard: { width: 12, height: 10, mines: 24 },
});
const SEARCH_CUTOFF = Symbol("search-cutoff");

export { MODES };

export function createGame(mode = "normal") {
  const settings = MODES[mode] || MODES.normal;
  return {
    mode: Object.hasOwn(MODES, mode) ? mode : "normal",
    width: settings.width,
    height: settings.height,
    mineTotal: settings.mines,
    revealed: Array(settings.width * settings.height).fill(-1),
    flags: Array(settings.width * settings.height).fill(false),
    started: false,
    result: "ready",
    elapsed: 0,
    moves: 0,
  };
}

export function neighbors(state, id) {
  const x = id % state.width;
  const y = Math.floor(id / state.width);
  const result = [];
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
    if (!dx && !dy) continue;
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < state.width && ny >= 0 && ny < state.height) result.push(ny * state.width + nx);
  }
  return result;
}

function constraintsFor(state) {
  const constraints = [];
  for (let id = 0; id < state.revealed.length; id += 1) {
    if (state.revealed[id] < 0) continue;
    const hidden = neighbors(state, id).filter((next) => state.revealed[next] < 0);
    if (hidden.length) constraints.push({ cells: hidden, count: state.revealed[id] });
  }
  return constraints;
}

function solve(state, assumptions = [], preferredMines = []) {
  const size = state.revealed.length;
  const constraints = constraintsFor(state);
  const frontier = new Set(assumptions.map(({ id }) => id));
  for (const constraint of constraints) for (const id of constraint.cells) frontier.add(id);
  const degree = new Map([...frontier].map((id) => [id, 0]));
  for (const constraint of constraints) for (const id of constraint.cells) degree.set(id, degree.get(id) + 1);
  const initial = new Int8Array(size).fill(-1);
  for (let id = 0; id < size; id += 1) if (state.revealed[id] >= 0) initial[id] = 0;
  for (const { id, value } of assumptions) {
    if (id < 0 || id >= size || state.revealed[id] >= 0 || (value !== 0 && value !== 1)) return null;
    if (initial[id] !== -1 && initial[id] !== value) return null;
    initial[id] = value;
  }

  let visited = 0;
  function search(source) {
    visited += 1;
    if (visited > 250000) return SEARCH_CUTOFF;
    const assignment = source.slice();
    let changed = true;
    while (changed) {
      changed = false;
      for (const constraint of constraints) {
        let mines = 0;
        const unknown = [];
        for (const id of constraint.cells) {
          if (assignment[id] === 1) mines += 1;
          else if (assignment[id] === -1) unknown.push(id);
        }
        if (mines > constraint.count || mines + unknown.length < constraint.count) return null;
        if (unknown.length && (mines === constraint.count || mines + unknown.length === constraint.count)) {
          const value = mines === constraint.count ? 0 : 1;
          for (const id of unknown) assignment[id] = value;
          changed = true;
        }
      }
      let knownMines = 0;
      const allUnknown = [];
      for (let id = 0; id < size; id += 1) {
        if (state.revealed[id] >= 0) continue;
        if (assignment[id] === 1) knownMines += 1;
        else if (assignment[id] === -1) allUnknown.push(id);
      }
      if (knownMines > state.mineTotal || knownMines + allUnknown.length < state.mineTotal) return null;
      if (allUnknown.length && (knownMines === state.mineTotal || knownMines + allUnknown.length === state.mineTotal)) {
        const value = knownMines === state.mineTotal ? 0 : 1;
        for (const id of allUnknown) assignment[id] = value;
        changed = true;
      }
    }

    let assignedMines = 0;
    for (const value of assignment) if (value === 1) assignedMines += 1;
    const unknown = [];
    for (let id = 0; id < size; id += 1) if (state.revealed[id] < 0 && assignment[id] === -1) unknown.push(id);
    const needed = state.mineTotal - assignedMines;
    if (needed < 0 || needed > unknown.length) return null;

    let choice = -1;
    let bestDegree = -1;
    for (const id of frontier) {
      if (assignment[id] !== -1) continue;
      const currentDegree = degree.get(id) || 0;
      if (currentDegree > bestDegree) { choice = id; bestDegree = currentDegree; }
    }
    if (choice < 0) {
      const result = assignment.slice();
      let left = needed;
      const preferred = [...new Set(preferredMines)].filter((id) => result[id] === -1 && state.revealed[id] < 0);
      for (const id of preferred) {
        if (left <= 0) break;
        result[id] = 1;
        left -= 1;
      }
      for (const id of unknown) {
        if (left <= 0) break;
        if (result[id] === -1) { result[id] = 1; left -= 1; }
      }
      if (left !== 0) return null;
      for (let id = 0; id < size; id += 1) if (result[id] === -1) result[id] = 0;
      return result;
    }

    const preferMine = preferredMines.includes(choice);
    let hitCutoff = false;
    for (const value of preferMine ? [1, 0] : [0, 1]) {
      const branch = assignment.slice();
      branch[choice] = value;
      const result = search(branch);
      if (result === SEARCH_CUTOFF) hitCutoff = true;
      else if (result) return result;
    }
    return hitCutoff ? SEARCH_CUTOFF : null;
  }
  return search(initial);
}

function hasForcedSafeCell(state) {
  for (let id = 0; id < state.revealed.length; id += 1) {
    if (state.revealed[id] >= 0) continue;
    if (solve(state, [{ id, value: 1 }]) === null) return true;
  }
  return false;
}

export function guaranteedSafeMoves(state) {
  const result = [];
  for (let id = 0; id < state.revealed.length; id += 1) {
    if (state.revealed[id] >= 0) continue;
    if (solve(state, [{ id, value: 1 }]) === null) result.push(id);
  }
  return result;
}

function revealOne(state, id, forceFirstClear = false) {
  if (state.revealed[id] >= 0 || state.flags[id] || state.result === "won" || state.result === "lost") return state;
  const adjacent = neighbors(state, id);
  const first = !state.started;
  const assumptions = [{ id, value: 0 }];
  if (first || forceFirstClear) for (const next of adjacent) assumptions.push({ id: next, value: 0 });
  if (!first && !forceFirstClear) {
    const minePossible = solve(state, [{ id, value: 1 }]) !== null;
    if (minePossible && hasForcedSafeCell(state)) return { ...state, result: "lost", lastMove: id, moves: state.moves + 1 };
  }
  const assignment = solve(state, assumptions, adjacent);
  if (assignment === SEARCH_CUTOFF) return { ...state, solverStalled: true };
  if (!assignment) return { ...state, result: "lost", lastMove: id, moves: state.moves + 1 };
  const revealed = state.revealed.slice();
  const queue = [id];
  const visited = new Set();
  while (queue.length) {
    const next = queue.shift();
    if (visited.has(next) || revealed[next] >= 0 || state.flags[next]) continue;
    visited.add(next);
    const model = next === id ? assignment : solve({ ...state, revealed }, [{ id: next, value: 0 }], neighbors(state, next));
    if (!model) continue;
    const clue = neighbors(state, next).reduce((count, cell) => count + model[cell], 0);
    revealed[next] = clue;
    if (clue === 0) for (const cell of neighbors(state, next)) if (revealed[cell] < 0 && !state.flags[cell]) queue.push(cell);
  }
  const cleared = revealed.reduce((count, clue) => count + Number(clue >= 0), 0);
  return { ...state, revealed, started: true, solverStalled: false, result: cleared >= state.revealed.length - state.mineTotal ? "won" : "playing", moves: state.moves + 1 };
}

export function revealCell(state, id) {
  if (!Number.isInteger(id) || id < 0 || id >= state.revealed.length) return state;
  if (state.result === "ready") return revealOne(state, id, true);
  if (state.revealed[id] > 0) {
    const around = neighbors(state, id);
    if (around.filter((cell) => state.flags[cell]).length !== state.revealed[id]) return state;
    let next = state;
    for (const cell of around) {
      if (next.result === "won" || next.result === "lost") break;
      if (next.revealed[cell] < 0 && !next.flags[cell]) next = revealOne(next, cell);
    }
    return next;
  }
  return revealOne(state, id);
}

export function toggleFlag(state, id) {
  if (!Number.isInteger(id) || id < 0 || id >= state.revealed.length || state.revealed[id] >= 0 || state.result === "won" || state.result === "lost") return state;
  const flags = state.flags.slice();
  flags[id] = !flags[id];
  return { ...state, flags };
}

export function tick(state, seconds = 1) {
  return state.result === "playing" ? { ...state, elapsed: state.elapsed + Math.max(0, seconds) } : state;
}
