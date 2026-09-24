export const TILE_SIGNS = Object.freeze(["●", "♣", "▲", "◆", "✿", "☾", "☼", "✦", "★", "♥"]);

function positions() {
  const cells = [];
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 8; x += 1) cells.push({ x, y, layer: 0 });
  for (let y = 1; y < 3; y += 1) for (let x = 2; x < 6; x += 1) cells.push({ x, y, layer: 1 });
  return cells;
}

export function createMahjongRun() {
  const cells = positions();
  const playable = cells.map((tile, index) => ({ ...tile, index })).filter((tile) => tile.layer === 0 && (tile.x === 0 || tile.x === 7));
  const types = Array(cells.length);
  types[playable[0].index] = 0; types[playable[1].index] = 0;
  let pair = 1;
  for (let i = 0; i < types.length; i += 1) if (types[i] === undefined) { types[i] = pair; types[i + 1] = pair; i += 1; pair += 1; }
  const tiles = cells.map((cell, id) => ({ ...cell, id, type: types[id], removed: false }));
  return { tiles, remaining: tiles.length, score: 0, mode: "playing", selected: null, elapsed: 0, hints: 0 };
}

export function isMahjongFree(run, tile) {
  if (!tile || tile.removed) return false;
  const blockedAbove = run.tiles.some((other) => !other.removed && other.layer > tile.layer && Math.abs(other.x - tile.x) < 1 && Math.abs(other.y - tile.y) < 1);
  if (blockedAbove) return false;
  const left = run.tiles.some((other) => !other.removed && other.layer === tile.layer && other.y === tile.y && other.x === tile.x - 1);
  const right = run.tiles.some((other) => !other.removed && other.layer === tile.layer && other.y === tile.y && other.x === tile.x + 1);
  return !left || !right;
}

export function mahjongHint(run) {
  const free = run.tiles.filter((tile) => isMahjongFree(run, tile));
  for (let i = 0; i < free.length; i += 1) for (let j = i + 1; j < free.length; j += 1) {
    if (free[i].type === free[j].type) return [free[i].id, free[j].id];
  }
  return [];
}

export function removeMahjongPair(run, firstId, secondId) {
  if (run.mode !== "playing" || firstId === secondId) return run;
  const first = run.tiles.find((tile) => tile.id === firstId), second = run.tiles.find((tile) => tile.id === secondId);
  if (!first || !second || first.type !== second.type || !isMahjongFree(run, first) || !isMahjongFree(run, second)) return run;
  first.removed = true; second.removed = true; run.remaining -= 2; run.score += 20;
  if (run.remaining === 0) run.mode = "won";
  return run;
}

export function shuffleMahjongTiles(run, random = Math.random) {
  const remaining = run.tiles.filter((tile) => !tile.removed);
  const types = remaining.map((tile) => tile.type);
  for (let i = types.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
  remaining.forEach((tile, index) => { tile.type = types[index]; });
  run.selected = null;
  return run;
}
