export const PLATFORMER_WIDTH = 640;
export const PLATFORMER_HEIGHT = 360;
export const PLATFORMER_STEP_SECONDS = 1 / 120;
export const PLATFORMER_LEVEL_COUNT = 12;
export const PLATFORMER_LEVEL_NAMES = Object.freeze([
  "Station steps", "Market crossing", "Canal shortcut", "Clocktower view",
  "Freight siding", "Moving cargo", "Crumbling platform", "Yard crossing",
  "Garden roof", "High wire", "Skybridge springs", "The final climb",
]);
export const PLATFORMER_WORLD_NAMES = Object.freeze(["Market district", "Rail yard", "Rooftop gardens"]);

const GROUND = 310;
const FINISH_X = 1510;
const PLAYER_START_X = 40;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function createPlatformerLevel(index) {
  const levelIndex = clamp(Math.floor(Number(index) || 0), 0, PLATFORMER_LEVEL_COUNT - 1);
  const world = Math.floor(levelIndex / 4);
  const variant = levelIndex % 4;
  const platforms = [
    { x: 0, y: GROUND, w: 330, h: 50 }, { x: 440, y: GROUND, w: 330, h: 50 },
    { x: 870, y: GROUND, w: 300, h: 50 }, { x: 1280, y: GROUND, w: 340, h: 50 },
    { x: 180, y: 248, w: 85, h: 14 }, { x: 260, y: 170, w: 92, h: 14 },
    { x: 370, y: 264, w: 70, h: 14 }, { x: 550, y: 248, w: 90, h: 14 },
    { x: 660, y: 170, w: 90, h: 14 }, { x: 800, y: 268, w: 70, h: 14 },
    { x: 970, y: 248, w: 90, h: 14 }, { x: 1080, y: 170, w: 90, h: 14 },
    { x: 1210, y: 265, w: 75, h: 14 },
  ].map((platform, id) => ({ ...platform, id, baseX: platform.x, baseY: platform.y, type: "solid", touched: 0, gone: 0 }));

  if (levelIndex >= 1) platforms[4].type = "spring";
  if (world >= 1) {
    platforms[7].type = "moving";
    platforms[7].range = 35;
    platforms[8].type = variant >= 2 ? "crumble" : "solid";
    platforms[11].type = "crumble";
  }
  if (world === 2) {
    platforms[10].type = "spring";
    platforms[5].type = "moving";
    platforms[5].range = 25;
  }

  const shift = variant * 12 + world * 7;
  const second = variant * 9;
  platforms[4].x -= shift;
  platforms[4].baseX -= shift;
  platforms[0].w -= shift;
  platforms[1].x -= shift;
  platforms[1].baseX -= shift;
  platforms[1].w += shift - second;
  platforms[2].x -= second;
  platforms[2].baseX -= second;
  platforms[2].w += second;
  platforms[6].x -= shift;
  platforms[6].baseX -= shift;
  platforms[9].x -= second;
  platforms[9].baseX -= second;
  platforms[3].x += variant * 6;
  platforms[3].baseX += variant * 6;
  platforms[3].w -= variant * 6;
  platforms[12].x += variant * 3;
  platforms[12].baseX += variant * 3;
  if (world >= 1 && variant >= 1) {
    platforms[6].type = "moving";
    platforms[6].range = 12;
  }
  if (world >= 1 && variant >= 2) platforms[9].type = "crumble";
  platforms[7].y -= variant * 7;
  platforms[7].baseY = platforms[7].y;

  const stars = [
    { x: 220 - shift, y: 218 },
    { x: 595, y: 218 - variant * 7 },
    { x: 1010, y: 218 },
  ];
  const enemies = levelIndex >= 2
    ? [{ x: 560, y: 290, w: 24, h: 20, base: 560, range: 75, speed: 1 + variant * 0.2, dead: false }]
    : [];
  if (world >= 1) enemies.push({ x: 1000, y: 290, w: 24, h: 20, base: 1000, range: 70, speed: 1.3, dead: false });

  return { levelIndex, world, variant, platforms, stars, enemies };
}

export function createPlatformerState(levelIndex) {
  const level = createPlatformerLevel(levelIndex);
  return {
    ...level,
    elapsed: 0,
    deaths: 0,
    falls: 0,
    enemyHits: 0,
    checkpoint: PLAYER_START_X,
    checkpointOn: false,
    won: false,
    player: { x: PLAYER_START_X, y: 280, w: 22, h: 30, vx: 0, vy: 0, on: null },
    lastSupportId: null,
    collected: new Set(),
    jumpBuffer: 0,
    coyote: 0,
    jumpWas: false,
    maxX: PLAYER_START_X,
  };
}

function respawn(state) {
  Object.assign(state.player, { x: state.checkpoint, y: 280, vx: 0, vy: 0, on: null });
  state.lastSupportId = null;
  state.coyote = 0;
  state.jumpBuffer = 0;
  state.jumpWas = false;
}

/** Advance the same 120 Hz rules used by training and the browser game. */
export function stepPlatformer(state, input = {}, dt = PLATFORMER_STEP_SECONDS) {
  if (state.won || !(dt > 0)) return [];
  const events = [];
  const player = state.player;
  const jump = Boolean(input.jump);
  const heldLeft = Boolean(input.left);
  const heldRight = Boolean(input.right);

  state.elapsed += dt;
  state.maxX = Math.max(state.maxX, player.x);
  if (jump && !state.jumpWas) state.jumpBuffer = 0.12;
  else state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  if (!jump && state.jumpWas && player.vy < -180) player.vy = -180;
  state.jumpWas = jump;
  state.coyote = player.on !== null ? 0.1 : Math.max(0, state.coyote - dt);
  if (state.jumpBuffer > 0 && state.coyote > 0) {
    player.vy = -440;
    player.on = null;
    state.jumpBuffer = 0;
    state.coyote = 0;
    events.push({ type: "jump" });
  }

  const targetVelocity = (heldRight ? 220 : 0) - (heldLeft ? 220 : 0);
  player.vx += clamp(targetVelocity - player.vx, -1500 * dt, 1500 * dt);
  for (const platform of state.platforms) {
    const oldX = platform.x;
    if (platform.type === "moving") platform.x = platform.baseX + Math.sin(state.elapsed * 1.6) * platform.range;
    if (player.on === platform.id) player.x += platform.x - oldX;
    if (platform.gone > 0) {
      platform.gone = Math.max(0, platform.gone - dt);
      if (!platform.gone) platform.touched = 0;
    } else if (platform.touched > 0) {
      platform.touched += dt;
      if (platform.touched > 0.6) {
        platform.gone = 2.5;
        if (player.on === platform.id) player.on = null;
      }
    }
  }

  player.x = clamp(player.x + player.vx * dt, 0, FINISH_X + 50);
  for (const platform of state.platforms) {
    if (platform.gone || !overlaps(player, platform)) continue;
    if (player.vx > 0) player.x = platform.x - player.w;
    else if (player.vx < 0) player.x = platform.x + platform.w;
    player.vx = 0;
  }

  const oldY = player.y;
  player.vy = Math.min(650, player.vy + 1100 * dt);
  player.y += player.vy * dt;
  player.on = null;
  for (const platform of state.platforms) {
    if (platform.gone || !overlaps(player, platform)) continue;
    if (player.vy >= 0 && oldY + player.h <= platform.y + 2) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.on = platform.id;
      state.lastSupportId = platform.id;
      if (platform.type === "spring") {
        player.vy = -570;
        player.on = null;
        events.push({ type: "spring", platformId: platform.id });
      }
      if (platform.type === "crumble" && !platform.touched) platform.touched = dt;
    } else if (player.vy < 0 && oldY >= platform.y + platform.h - 2) {
      player.y = platform.y + platform.h;
      player.vy = 0;
    }
  }

  for (let index = 0; index < state.stars.length; index += 1) {
    const star = state.stars[index];
    if (!state.collected.has(index) && overlaps(player, { x: star.x - 11, y: star.y - 11, w: 22, h: 22 })) {
      state.collected.add(index);
      events.push({ type: "star", starIndex: index });
    }
  }

  if (player.x > 680 && player.x < 770 && player.y + player.h >= 280 && !state.checkpointOn) {
    state.checkpoint = 690;
    state.checkpointOn = true;
    events.push({ type: "checkpoint" });
  }

  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    enemy.x = enemy.base + Math.sin(state.elapsed * enemy.speed) * enemy.range;
    if (!overlaps(player, enemy)) continue;
    if (player.vy > 0 && oldY + player.h <= enemy.y + 7) {
      enemy.dead = true;
      player.vy = -300;
      events.push({ type: "enemy-stomp" });
    } else {
      state.deaths += 1;
      state.enemyHits += 1;
      events.push({ type: "enemy-hit" });
      respawn(state);
      return events;
    }
  }

  if (player.y > PLATFORMER_HEIGHT + 60) {
    state.deaths += 1;
    state.falls += 1;
    events.push({ type: "fall" });
    respawn(state);
    return events;
  }
  if (player.x >= FINISH_X && player.y + player.h > 270) {
    state.won = true;
    events.push({ type: "finish" });
  }
  state.maxX = Math.max(state.maxX, player.x);
  return events;
}

export function platformerProgress(state) {
  return Math.min(1, Math.max(0, state.maxX / FINISH_X));
}
