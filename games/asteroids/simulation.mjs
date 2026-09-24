export const ASTEROIDS_FIELD = Object.freeze({
  width: 760,
  height: 520,
  maxSpeed: 250,
  turnSpeed: 4.4,
  thrust: 185,
  fireDelay: 0.18,
  bulletSpeed: 390,
  bulletLife: 0.95,
  shipRadius: 13,
  rockRadius: Object.freeze({ 1: 13, 2: 25, 3: 39 }),
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const distanceSquared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

function random(run) {
  run.seed = (Math.imul(run.seed, 1664525) + 1013904223) >>> 0;
  return run.seed / 4294967296;
}

function wrap(point) {
  if (point.x < 0) point.x += ASTEROIDS_FIELD.width;
  else if (point.x >= ASTEROIDS_FIELD.width) point.x -= ASTEROIDS_FIELD.width;
  if (point.y < 0) point.y += ASTEROIDS_FIELD.height;
  else if (point.y >= ASTEROIDS_FIELD.height) point.y -= ASTEROIDS_FIELD.height;
}

function makeRock(run, x, y, size, vx, vy) {
  return {
    x, y, size, vx, vy,
    angle: random(run) * Math.PI * 2,
    spin: (random(run) - 0.5) * 1.3,
    shape: Math.floor(random(run) * 0xffffffff) >>> 0,
  };
}

function beginWave(run) {
  run.wave += 1;
  const count = 3 + run.wave;
  for (let index = 0; index < count; index += 1) {
    const edge = index % 4;
    const x = edge === 0 ? 26 : edge === 1 ? ASTEROIDS_FIELD.width - 26 : 70 + random(run) * (ASTEROIDS_FIELD.width - 140);
    const y = edge === 2 ? 26 : edge === 3 ? ASTEROIDS_FIELD.height - 26 : 70 + random(run) * (ASTEROIDS_FIELD.height - 140);
    const angle = random(run) * Math.PI * 2;
    const speed = 26 + random(run) * 24;
    run.asteroids.push(makeRock(run, x, y, 3, Math.cos(angle) * speed, Math.sin(angle) * speed));
  }
}

export function createAsteroidsRun(seed = 20260924) {
  return {
    mode: "ready",
    seed: (Number(seed) >>> 0) || 1,
    wave: 0,
    score: 0,
    lives: 3,
    elapsed: 0,
    fireCooldown: 0,
    ship: { x: ASTEROIDS_FIELD.width / 2, y: ASTEROIDS_FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invulnerable: 0 },
    bullets: [],
    asteroids: [],
  };
}

export function startAsteroidsRun(run) {
  if (run.mode === "ready") {
    run.mode = "playing";
    beginWave(run);
  }
  return run;
}

function splitRock(run, rock) {
  if (rock.size <= 1) return;
  const size = rock.size - 1;
  const speed = Math.max(46, Math.hypot(rock.vx, rock.vy) * 1.35);
  const base = Math.atan2(rock.vy, rock.vx);
  for (const offset of [-0.72, 0.72]) {
    const angle = base + offset;
    const child = makeRock(run, rock.x, rock.y, size, Math.cos(angle) * speed, Math.sin(angle) * speed);
    run.asteroids.push(child);
  }
}

function hitShip(run) {
  if (run.ship.invulnerable > 0) return;
  run.lives -= 1;
  run.ship.x = ASTEROIDS_FIELD.width / 2;
  run.ship.y = ASTEROIDS_FIELD.height / 2;
  run.ship.vx = 0;
  run.ship.vy = 0;
  run.ship.angle = -Math.PI / 2;
  run.ship.invulnerable = 1.7;
  run.bullets = [];
  if (run.lives <= 0) run.mode = "over";
}

export function stepAsteroidsRun(run, input = {}, seconds = 1 / 60) {
  if (run.mode !== "playing") return run;
  const dt = clamp(Number(seconds) || 0, 0, 0.05);
  run.elapsed += dt;
  run.fireCooldown = Math.max(0, run.fireCooldown - dt);

  const ship = run.ship;
  ship.angle += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * ASTEROIDS_FIELD.turnSpeed * dt;
  if (input.thrust) {
    ship.vx += Math.cos(ship.angle) * ASTEROIDS_FIELD.thrust * dt;
    ship.vy += Math.sin(ship.angle) * ASTEROIDS_FIELD.thrust * dt;
  }
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > ASTEROIDS_FIELD.maxSpeed) {
    ship.vx = (ship.vx / speed) * ASTEROIDS_FIELD.maxSpeed;
    ship.vy = (ship.vy / speed) * ASTEROIDS_FIELD.maxSpeed;
  }
  const drag = Math.pow(0.997, dt * 60);
  ship.vx *= drag;
  ship.vy *= drag;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrap(ship);
  ship.invulnerable = Math.max(0, ship.invulnerable - dt);

  if (input.fire && run.fireCooldown === 0 && run.bullets.length < 8) {
    const noseX = ship.x + Math.cos(ship.angle) * (ASTEROIDS_FIELD.shipRadius + 3);
    const noseY = ship.y + Math.sin(ship.angle) * (ASTEROIDS_FIELD.shipRadius + 3);
    run.bullets.push({
      x: noseX, y: noseY,
      vx: ship.vx + Math.cos(ship.angle) * ASTEROIDS_FIELD.bulletSpeed,
      vy: ship.vy + Math.sin(ship.angle) * ASTEROIDS_FIELD.bulletSpeed,
      life: ASTEROIDS_FIELD.bulletLife,
    });
    run.fireCooldown = ASTEROIDS_FIELD.fireDelay;
  }

  run.bullets = run.bullets.filter((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    return bullet.life > 0
      && bullet.x >= -8 && bullet.x <= ASTEROIDS_FIELD.width + 8
      && bullet.y >= -8 && bullet.y <= ASTEROIDS_FIELD.height + 8;
  });
  for (const rock of run.asteroids) {
    rock.x += rock.vx * dt;
    rock.y += rock.vy * dt;
    rock.angle += rock.spin * dt;
    wrap(rock);
  }

  const remainingRocks = [];
  for (const rock of run.asteroids) {
    const radius = ASTEROIDS_FIELD.rockRadius[rock.size];
    let destroyed = false;
    for (let index = 0; index < run.bullets.length; index += 1) {
      if (distanceSquared(rock, run.bullets[index]) > radius * radius) continue;
      run.bullets.splice(index, 1);
      run.score += rock.size === 3 ? 20 : rock.size === 2 ? 50 : 100;
      splitRock(run, rock);
      destroyed = true;
      break;
    }
    if (!destroyed) remainingRocks.push(rock);
  }
  run.asteroids = remainingRocks;
  if (ship.invulnerable === 0 && run.asteroids.some((rock) => distanceSquared(ship, rock) < (ASTEROIDS_FIELD.shipRadius + ASTEROIDS_FIELD.rockRadius[rock.size] * 0.72) ** 2)) {
    hitShip(run);
  }
  if (run.mode !== "playing") return run;

  if (run.asteroids.length === 0) {
    if (run.wave >= 3) run.mode = "won";
    else beginWave(run);
  }
  return run;
}
