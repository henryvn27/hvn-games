export const INVADERS = Object.freeze({ width: 960, height: 540, playerSpeed: 430, shotSpeed: 540, enemyShotSpeed: 140, columns: 10, rows: 4 });

export function newRun() {
  return { mode: "ready", score: 0, wave: 1, lives: 3, elapsed: 0, playerX: INVADERS.width / 2, shots: [], enemyShots: [], formation: makeFormation(1), fireWait: 0, invulnerable: 0, aliensHit: 0 };
}

function makeFormation(wave) {
  const aliens = [];
  for (let row = 0; row < INVADERS.rows; row += 1) for (let col = 0; col < INVADERS.columns; col += 1) aliens.push({ x: 138 + col * 68, y: 96 + row * 42, row, col, alive: true, phase: (row + col) % 2 });
  return { aliens, direction: 1, speed: 22 + Math.min(42, wave * 2), drop: 0, fireClock: 2.2 };
}

export function startRun() { return { ...newRun(), mode: "active" }; }
export function togglePause(state) { return state.mode === "active" ? { ...state, mode: "paused" } : state.mode === "paused" ? { ...state, mode: "active" } : state; }

function takeHit(state) {
  if (state.invulnerable > 0) return state;
  const lives = state.lives - 1;
  return { ...state, lives, invulnerable: lives > 0 ? 1.05 : 0, mode: lives > 0 ? "active" : "over", enemyShots: [] };
}

export function stepRun(state, input = {}, dt = 1 / 60, random = Math.random) {
  if (state.mode !== "active") return state;
  const step = Math.min(0.05, Math.max(0, dt));
  const movement = Number(Boolean(input.right)) - Number(Boolean(input.left));
  let next = { ...state, elapsed: state.elapsed + step, playerX: Math.max(38, Math.min(INVADERS.width - 38, state.playerX + movement * INVADERS.playerSpeed * step)), fireWait: Math.max(0, state.fireWait - step), invulnerable: Math.max(0, state.invulnerable - step) };
  let shots = next.shots.map((shot) => ({ ...shot, y: shot.y - INVADERS.shotSpeed * step })).filter((shot) => shot.y > 44);
  let enemyShots = next.enemyShots.map((shot) => ({ ...shot, y: shot.y + shot.speed * step })).filter((shot) => shot.y < INVADERS.height - 22);
  if (input.fire && next.fireWait <= 0) { shots.push({ x: next.playerX, y: 465 }); next.fireWait = 0.22; }
  const formation = { ...next.formation, aliens: next.formation.aliens.map((alien) => ({ ...alien })), fireClock: next.formation.fireClock - step };
  const alive = formation.aliens.filter((alien) => alien.alive);
  if (!alive.length) {
    next = { ...next, wave: next.wave + 1, score: next.score + 300, shots: [], enemyShots: [], formation: makeFormation(next.wave + 1) };
    return next;
  }
  const left = Math.min(...alive.map((alien) => alien.x));
  const right = Math.max(...alive.map((alien) => alien.x));
  if ((right >= INVADERS.width - 45 && formation.direction > 0) || (left <= 45 && formation.direction < 0)) { formation.direction *= -1; formation.drop = 15; }
  for (const alien of formation.aliens) if (alien.alive) {
    alien.x += formation.direction * formation.speed * step;
    if (formation.drop > 0) alien.y += formation.drop * step * 8;
    if (alien.y >= 418) next = { ...next, lives: 0, mode: "over" };
  }
  formation.drop = Math.max(0, formation.drop - step * 18);
  for (const shot of shots) {
    const hit = formation.aliens.find((alien) => alien.alive && Math.abs(shot.x - alien.x) < 19 && Math.abs(shot.y - alien.y) < 14);
    if (hit) { hit.alive = false; shot.y = -1; next.score += (4 - hit.row) * 10; next.aliensHit += 1; }
  }
  shots = shots.filter((shot) => shot.y > 0);
  if (!formation.aliens.some((alien) => alien.alive)) {
    const wave = next.wave + 1;
    return { ...next, wave, score: next.score + 300, shots: [], enemyShots: [], formation: makeFormation(wave) };
  }
  if (formation.fireClock <= 0 && alive.length) {
    const shooters = alive.filter((alien) => !alive.some((other) => other.col === alien.col && other.row > alien.row));
    const shooter = shooters[Math.min(shooters.length - 1, Math.floor(random() * shooters.length))];
    enemyShots.push({ x: shooter.x, y: shooter.y + 14, speed: INVADERS.enemyShotSpeed + Math.min(100, next.wave * 6) });
    formation.fireClock = Math.max(1.1, 2.2 - next.wave * 0.06) + random() * 0.8;
  }
  if (next.invulnerable <= 0 && enemyShots.some((shot) => Math.abs(shot.x - next.playerX) < 25 && shot.y > 452 && shot.y < 481)) next = takeHit(next);
  return { ...next, shots, enemyShots, formation };
}
