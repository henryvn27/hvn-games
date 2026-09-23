export const WORLD = Object.freeze({ width: 900, height: 520, radius: 14, cellRadius: 13, hazardRadius: 22 });
export const GRAVITY = Object.freeze([
  { x: 0, y: 1, label: "down" }, { x: -1, y: 0, label: "left" },
  { x: 0, y: -1, label: "up" }, { x: 1, y: 0, label: "right" },
]);
export const SECTORS = Object.freeze([
  { name: "Dock", cells: [[250, 160], [460, 365], [650, 150]], hazard: [480, 250], rate: 0.7 },
  { name: "Kiln", cells: [[245, 355], [500, 145], [690, 355]], hazard: [490, 250], rate: 1.1 },
  { name: "Glass", cells: [[230, 155], [450, 380], [675, 165]], hazard: [450, 230], rate: 1.5 },
  { name: "Spindle", cells: [[250, 360], [480, 145], [690, 350]], hazard: [510, 270], rate: 1.9 },
  { name: "Night side", cells: [[240, 160], [455, 370], [680, 160]], hazard: [445, 245], rate: 2.4 },
  { name: "Airlock", cells: [[260, 355], [470, 150], [665, 350]], hazard: [500, 260], rate: 2.9 },
]);
export const EXIT = Object.freeze({ x: 840, y: 260, radius: 34 });

export function createRun() {
  return { mode: "active", sector: 0, elapsed: 0, x: 88, y: 260, vx: 0, vy: 0, charge: 1, collected: [], hits: 0, gravityTurn: 0, result: null };
}
export function pulseGravity(state) {
  if (state.mode !== "active" || state.charge <= 0) return state;
  return { ...state, charge: state.charge - 1, gravityTurn: (state.gravityTurn + 1) % GRAVITY.length };
}
export function advanceSector(state) {
  if (state.mode !== "active" || state.collected.length < SECTORS[state.sector].cells.length) return state;
  if (state.sector === SECTORS.length - 1) return { ...state, mode: "won", result: { seconds: Math.ceil(state.elapsed), hits: state.hits, perfect: state.hits === 0 } };
  return { ...state, sector: state.sector + 1, x: 78, y: 260, vx: 0, vy: 0, collected: [], gravityTurn: (state.gravityTurn + 1) % GRAVITY.length };
}
export function stepRun(state, input = {}, deltaSeconds = 1 / 60) {
  if (state.mode !== "active") return state;
  const dt = Math.max(0, Math.min(deltaSeconds, 0.05));
  const sector = SECTORS[state.sector];
  const gravity = GRAVITY[(state.sector + state.gravityTurn) % GRAVITY.length];
  const force = 600;
  const sectorFactor = 1 + state.sector * 0.08;
  const ax = (Number(Boolean(input.right)) - Number(Boolean(input.left))) * force;
  const ay = (Number(Boolean(input.down)) - Number(Boolean(input.up))) * force;
  let vx = (state.vx + (ax + gravity.x * 96 * sectorFactor) * dt) * Math.pow(0.985, dt * 60);
  let vy = (state.vy + (ay + gravity.y * 96 * sectorFactor) * dt) * Math.pow(0.985, dt * 60);
  let x = state.x + vx * dt, y = state.y + vy * dt;
  const radius = WORLD.radius;
  if (x < radius || x > WORLD.width - radius) { x = Math.max(radius, Math.min(WORLD.width - radius, x)); vx *= -0.38; }
  if (y < radius || y > WORLD.height - radius) { y = Math.max(radius, Math.min(WORLD.height - radius, y)); vy *= -0.38; }
  const elapsed = state.elapsed + dt;
  const hazardAngle = input.reducedMotion ? 0 : elapsed * sector.rate;
  const hx = sector.hazard[0] + Math.cos(hazardAngle) * (95 + state.sector * 7);
  const hy = sector.hazard[1] + Math.sin(hazardAngle * 1.37) * 88;
  if ((x - hx) ** 2 + (y - hy) ** 2 < (WORLD.radius + WORLD.hazardRadius) ** 2) {
    return { ...state, mode: "lost", x, y, vx, vy, elapsed, hits: state.hits + 1, result: { seconds: Math.ceil(elapsed), hits: state.hits + 1, perfect: false, reason: "The loose core caught you." } };
  }
  if (elapsed >= 240) return { ...state, mode: "lost", x, y, vx, vy, elapsed, result: { seconds: 240, hits: state.hits, perfect: false, reason: "The station sealed its airlock." } };
  const collected = [...state.collected];
  let charge = state.charge;
  sector.cells.forEach(([cx, cy], index) => {
    if (!collected.includes(index) && (x - cx) ** 2 + (y - cy) ** 2 < 27 ** 2) {
      collected.push(index);
      charge = Math.min(3, charge + 1);
    }
  });
  const next = { ...state, x, y, vx, vy, elapsed, collected, charge };
  const allCells = collected.length === sector.cells.length;
  const docked = (x - EXIT.x) ** 2 + (y - EXIT.y) ** 2 <= EXIT.radius ** 2;
  return allCells && docked ? advanceSector(next) : next;
}
