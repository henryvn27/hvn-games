export const DOCKSIDE = Object.freeze({
  width: 960,
  height: 560,
  baseX: 344,
  baseY: 488,
  baseWidth: 272,
  crateHeight: 32,
  swingRange: 320,
  startingSpeed: 1.25,
  speedPerCrate: 0.045,
  maxSpeed: 2.2,
  maxMisses: 3,
  minCrateWidth: 56,
});

function makeCrate(x, y, width) {
  return { x, y, width, height: DOCKSIDE.crateHeight, vy: 0 };
}

export function createRound() {
  return {
    mode: "ready",
    elapsed: 0,
    score: 0,
    misses: 0,
    combo: 0,
    perfects: 0,
    floors: [{ x: DOCKSIDE.baseX, y: DOCKSIDE.baseY, width: DOCKSIDE.baseWidth, height: DOCKSIDE.crateHeight, base: true }],
    block: makeCrate(DOCKSIDE.baseX + (DOCKSIDE.baseWidth / 2) - 54, 110, 108),
    lastPlacement: null,
    result: null,
  };
}

export function startRound() {
  return { ...createRound(), mode: "active" };
}

export function pauseRound(state) {
  return state.mode === "active" || state.mode === "dropping"
    ? { ...state, mode: "paused", resumeMode: state.mode }
    : state;
}

export function resumeRound(state) {
  return state.mode === "paused" ? { ...state, mode: state.resumeMode || "active", resumeMode: null } : state;
}

export function dropCrate(state) {
  if (state.mode !== "active") return state;
  return { ...state, mode: "dropping", block: { ...state.block, vy: 0 }, lastPlacement: null };
}

function nextBlock(state) {
  const top = state.floors[state.floors.length - 1];
  return makeCrate(top.x + (top.width / 2) - (Math.min(108, top.width) / 2), 110, Math.min(108, top.width));
}

function miss(state) {
  const misses = state.misses + 1;
  if (misses >= DOCKSIDE.maxMisses) {
    return { ...state, misses, combo: 0, mode: "result", lastPlacement: "miss", result: "The stack came down." };
  }
  return { ...state, misses, combo: 0, mode: "active", block: nextBlock(state), lastPlacement: "miss" };
}

function land(state) {
  const block = state.block;
  const top = state.floors[state.floors.length - 1];
  const left = Math.max(block.x, top.x);
  const right = Math.min(block.x + block.width, top.x + top.width);
  const width = right - left;
  if (width < DOCKSIDE.minCrateWidth) return miss(state);

  const centerOffset = Math.abs((block.x + block.width / 2) - (top.x + top.width / 2));
  const perfect = centerOffset <= 9;
  const combo = perfect ? state.combo + 1 : 0;
  const score = state.score + 25 + (perfect ? combo * 25 : 0);
  const floor = {
    x: left,
    y: top.y - DOCKSIDE.crateHeight,
    width,
    height: DOCKSIDE.crateHeight,
    perfect,
    index: state.floors.length - 1,
  };
  return {
    ...state,
    mode: "active",
    floors: [...state.floors, floor],
    block: nextBlock({ ...state, floors: [...state.floors, floor] }),
    combo,
    score,
    perfects: state.perfects + Number(perfect),
    lastPlacement: perfect ? "perfect" : "landed",
  };
}

export function stepRound(state, deltaSeconds = 1 / 60) {
  if (state.mode !== "active" && state.mode !== "dropping") return state;
  const dt = Math.max(0, Math.min(Number(deltaSeconds) || 0, 0.05));
  const elapsed = state.elapsed + dt;
  if (state.mode === "active") {
    const speed = Math.min(DOCKSIDE.maxSpeed, DOCKSIDE.startingSpeed + (state.floors.length - 1) * DOCKSIDE.speedPerCrate);
    const center = DOCKSIDE.width / 2 + Math.sin(elapsed * speed) * DOCKSIDE.swingRange;
    const x = Math.max(18, Math.min(DOCKSIDE.width - state.block.width - 18, center - state.block.width / 2));
    return { ...state, elapsed, block: { ...state.block, x } };
  }

  const vy = Math.min(900, state.block.vy + 1850 * dt);
  const y = state.block.y + vy * dt;
  const top = state.floors[state.floors.length - 1];
  const landingY = top.y - DOCKSIDE.crateHeight;
  const droppingState = { ...state, elapsed, block: { ...state.block, y, vy } };
  return y >= landingY ? land({ ...droppingState, block: { ...droppingState.block, y: landingY } }) : droppingState;
}

export function speedForRound(state) {
  return Math.min(DOCKSIDE.maxSpeed, DOCKSIDE.startingSpeed + (state.floors.length - 1) * DOCKSIDE.speedPerCrate);
}

export function cameraOffsetForRound(state) {
  return Math.max(0, (state.floors.length - 1) * DOCKSIDE.crateHeight - 248);
}
