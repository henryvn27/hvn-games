export const HEX_STACK = Object.freeze({ sides: 6, maxDepth: 8, levelEvery: 12 });
const COLORS = Object.freeze(["mint", "coral", "gold", "lilac"]);

const pick = (random) => COLORS[Math.min(COLORS.length - 1, Math.floor(random() * COLORS.length))];
export function newRun(random = Math.random) {
  return { mode: "ready", score: 0, cleared: 0, level: 1, elapsed: 0, orientation: 0, fallAt: 0, fallEvery: 2, combo: 0, comboTime: 0, stacks: Array.from({ length: HEX_STACK.sides }, () => []), current: pick(random), next: pick(random), lastClear: 0 };
}
export function startRun(random = Math.random) { return { ...newRun(random), mode: "active" }; }
export function togglePause(state) {
  if (state.mode === "active") return { ...state, mode: "paused" };
  if (state.mode === "paused") return { ...state, mode: "active" };
  return state;
}
function groupAt(stacks, side, depth) {
  const color = stacks[side]?.[depth];
  if (!color) return [];
  const pending = [[side, depth]], found = new Set();
  while (pending.length) {
    const [s, d] = pending.pop(), key = `${s}:${d}`;
    if (found.has(key) || stacks[s]?.[d] !== color) continue;
    found.add(key);
    // Spokes touch each other only around the innermost ring. Farther out,
    // the drawing leaves a visible gap between lanes, so those tiles cannot match.
    if (d === 0) pending.push([(s + 1) % HEX_STACK.sides, 0], [(s + HEX_STACK.sides - 1) % HEX_STACK.sides, 0]);
    pending.push([s, d - 1], [s, d + 1]);
  }
  return [...found].map((key) => key.split(":").map(Number));
}
function settle(state, random) {
  const stacks = state.stacks.map((stack) => [...stack]);
  const lane = state.orientation;
  if (stacks[lane].length >= HEX_STACK.maxDepth) return { ...state, stacks, mode: "over", current: null };
  stacks[lane].unshift(state.current);
  const group = groupAt(stacks, lane, 0);
  let score = state.score, cleared = state.cleared, combo = state.combo, lastClear = 0;
  if (group.length >= 3) {
    combo = state.comboTime > 0 ? state.combo + 1 : 1;
    const remove = new Set(group.map(([s, d]) => `${s}:${d}`));
    for (let side = 0; side < stacks.length; side += 1) stacks[side] = stacks[side].filter((_color, depth) => !remove.has(`${side}:${depth}`));
    cleared += group.length;
    score += group.length * group.length * 10 * combo;
    lastClear = group.length;
  } else combo = 0;
  const level = 1 + Math.floor(cleared / HEX_STACK.levelEvery);
  return { ...state, stacks, score, cleared, level, combo, comboTime: lastClear ? 2.2 : 0, lastClear, current: state.next, next: pick(random), fallAt: 0, fallEvery: Math.max(.52, 2 - (level - 1) * .08) };
}
export function stepRun(state, input = {}, dt = 1 / 60, random = Math.random) {
  if (state.mode !== "active") return state;
  const step = Math.min(.05, Math.max(0, dt));
  let orientation = state.orientation;
  if (input.rotate === "left") orientation = (orientation + 5) % 6;
  if (input.rotate === "right") orientation = (orientation + 1) % 6;
  const next = { ...state, orientation, elapsed: state.elapsed + step, comboTime: Math.max(0, state.comboTime - step), fallAt: state.fallAt + step, lastClear: Math.max(0, state.lastClear - step * 3) };
  if (input.drop) next.fallAt = next.fallEvery;
  return next.fallAt >= next.fallEvery ? settle(next, random) : next;
}
