export const DODGER_WIDTH = 640;
export const DODGER_HEIGHT = 480;
export const DODGER_STEP_SECONDS = 1 / 30;

export function createSeededRandom(seed = 1) {
  let state = Number(seed) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function overlaps(a, b) {
  return distance(a, b) < a.r + b.r;
}

export class SpaceDodgerSimulation {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.reset();
  }

  reset() {
    this.state = "ready";
    this.ship = { x: 320, y: 400, r: 12, hp: 3, weapon: 1, inv: 0 };
    this.enemies = [];
    this.shots = [];
    this.hostile = [];
    this.pickups = [];
    this.boss = null;
    this.wave = 1;
    this.score = 0;
    this.kills = 0;
    this.spawned = 0;
    this.spawnTimer = 0.8;
    this.fireTimer = 0;
    this.elapsed = 0;
    this.breakTimer = 0;
    this.events = [];
    this.metrics = {
      damageTaken: 0,
      repairPickups: 0,
      upgradePickups: 0,
      enemyKills: 0,
      bossesDefeated: 0,
      wavesCleared: 0,
    };
    return this.observe();
  }

  emit(type, details = {}) {
    this.events.push({ type, ...details });
  }

  drainEvents() {
    return this.events.splice(0);
  }

  quota() {
    return 6 + Math.min(this.wave * 2, 20);
  }

  startWave() {
    this.spawned = 0;
    this.spawnTimer = 0.8;
    this.breakTimer = 0;
    this.boss = null;
    if (this.wave % 5 === 0) {
      const hp = 40 + this.wave * 4;
      this.boss = { x: 320, y: -65, r: 49, hp, max: hp, fire: 1.6, time: 0 };
      this.emit("wave-start", { wave: this.wave, boss: true });
    } else {
      this.emit("wave-start", { wave: this.wave, boss: false });
    }
  }

  start() {
    if (this.state === "over") return false;
    if (this.state === "ready") this.startWave();
    this.state = "running";
    this.emit("run-start");
    return true;
  }

  pause() {
    if (this.state !== "running") return false;
    this.state = "paused";
    this.emit("pause");
    return true;
  }

  resume() {
    if (this.state !== "paused") return false;
    this.state = "running";
    this.emit("resume");
    return true;
  }

  fire() {
    const offsets = this.ship.weapon === 1 ? [0] : this.ship.weapon === 2 ? [-8, 8] : [-12, 0, 12];
    for (const offset of offsets) {
      this.shots.push({ x: this.ship.x + offset, y: this.ship.y - 20, r: 4, vx: this.ship.weapon === 3 ? offset * 4 : 0 });
    }
  }

  aim(source, speed, spread = 0) {
    const angle = Math.atan2(this.ship.y - source.y, this.ship.x - source.x) + spread;
    this.hostile.push({ x: source.x, y: source.y + 14, r: 5, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
  }

  damage() {
    if (this.ship.inv > 0 || this.state !== "running") return;
    this.ship.hp -= 1;
    this.ship.inv = 1.5;
    this.metrics.damageTaken += 1;
    this.emit("ship-hit", { x: this.ship.x, y: this.ship.y, hp: this.ship.hp });
    if (this.ship.hp === 0) {
      this.state = "over";
      this.emit("game-over", { score: this.score, wave: this.wave, reason: "hull-depleted" });
    }
  }

  drop(x, y, type) {
    this.pickups.push({ x, y, r: 15, type });
  }

  step(dt, action = {}) {
    if (this.state !== "running") return this.drainEvents();
    dt = clamp(Number(dt) || 0, 0, 0.05);
    this.elapsed += dt;
    this.ship.inv = Math.max(0, this.ship.inv - dt);

    const keys = action.keys instanceof Set ? action.keys : new Set(action.keys || []);
    let dx = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
    let dy = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);
    if (action.drag) {
      dx = action.drag.x - this.ship.x;
      dy = action.drag.y - this.ship.y;
      const distanceToPointer = Math.hypot(dx, dy);
      if (distanceToPointer) {
        const step = Math.min(distanceToPointer, 260 * dt);
        this.ship.x += (dx / distanceToPointer) * step;
        this.ship.y += (dy / distanceToPointer) * step;
      }
    } else {
      const magnitude = Math.hypot(dx, dy) || 1;
      this.ship.x += (dx / magnitude) * 260 * dt;
      this.ship.y += (dy / magnitude) * 260 * dt;
    }
    this.ship.x = clamp(this.ship.x, 20, 620);
    this.ship.y = clamp(this.ship.y, 28, 452);

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fire();
      this.fireTimer = 0.19;
    }

    if (this.breakTimer > 0) {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) {
        this.wave += 1;
        this.startWave();
      }
    } else if (this.wave % 5 !== 0 && this.spawned < this.quota()) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const rock = this.spawned % 3 === 2;
        this.enemies.push({
          x: 35 + this.random() * 570,
          y: -28,
          r: rock ? 21 : 17,
          hp: rock ? 3 : 2,
          kind: rock ? "rock" : "fighter",
          vy: 55 + Math.min(this.wave * 7, 100),
          fire: 1 + this.random(),
          phase: this.random() * 6,
        });
        this.spawned += 1;
        this.spawnTimer = Math.max(0.4, 1.1 - this.wave * 0.04);
      }
    }

    for (const enemy of this.enemies) {
      enemy.y += enemy.vy * dt;
      enemy.x = clamp(enemy.x + Math.sin(this.elapsed * 2 + enemy.phase) * 20 * dt, enemy.r, 640 - enemy.r);
      enemy.fire -= dt;
      if (enemy.kind === "fighter" && enemy.y > 10 && enemy.y < 340 && enemy.fire <= 0) {
        this.aim(enemy, 130 + Math.min(this.wave * 5, 65));
        enemy.fire = 2;
      }
    }

    if (this.boss) {
      this.boss.time += dt;
      this.boss.y = Math.min(88, this.boss.y + 55 * dt);
      this.boss.x = 320 + Math.sin(this.boss.time * 0.65) * 195;
      this.boss.fire -= dt;
      if (this.boss.y > 35 && this.boss.fire <= 0) {
        for (const spread of [-0.36, -0.18, 0, 0.18, 0.36]) this.aim(this.boss, 155 + Math.min(this.wave * 3, 60), spread);
        this.boss.fire = Math.max(0.7, 1.6 - this.wave * 0.035);
      }
    }

    for (const shot of this.shots) {
      shot.y -= 460 * dt;
      shot.x += shot.vx * dt;
      if (this.boss && overlaps(shot, this.boss)) {
        shot.dead = true;
        this.boss.hp -= 1;
        this.emit("boss-hit", { x: shot.x, y: shot.y });
      } else {
        const target = this.enemies.find((enemy) => enemy.hp > 0 && overlaps(shot, enemy));
        if (target) {
          shot.dead = true;
          target.hp -= 1;
          this.emit("enemy-hit", { x: shot.x, y: shot.y });
        }
      }
    }

    for (const enemy of this.enemies.filter((item) => item.hp <= 0)) {
      this.score += enemy.kind === "rock" ? 40 : 100;
      this.kills += 1;
      this.metrics.enemyKills += 1;
      this.emit("enemy-destroyed", { x: enemy.x, y: enemy.y, kind: enemy.kind });
      if (this.kills % 5 === 0) this.drop(enemy.x, enemy.y, "upgrade");
      else if (this.kills % 9 === 0) this.drop(enemy.x, enemy.y, "repair");
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0 && enemy.y < 515);

    if (this.boss && this.boss.hp <= 0) {
      this.metrics.bossesDefeated += 1;
      this.score += 1000 + this.wave * 100;
      this.emit("boss-defeated", { x: this.boss.x, y: this.boss.y, wave: this.wave });
      this.drop(this.boss.x, this.boss.y, "repair");
      this.boss = null;
      this.hostile = [];
    }

    for (const bullet of this.hostile) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (overlaps(bullet, this.ship)) {
        bullet.dead = true;
        this.damage();
      }
    }
    for (const enemy of this.enemies) if (overlaps(enemy, this.ship)) this.damage();
    if (this.boss && overlaps(this.boss, this.ship)) this.damage();
    if (this.state === "over") return this.drainEvents();

    for (const pickup of this.pickups) {
      pickup.y += 65 * dt;
      if (!overlaps(pickup, this.ship)) continue;
      pickup.dead = true;
      if (pickup.type === "upgrade") {
        if (this.ship.weapon < 3) this.ship.weapon += 1;
        else this.score += 150;
        this.metrics.upgradePickups += 1;
        this.emit("upgrade-collected", { x: pickup.x, y: pickup.y, weapon: this.ship.weapon });
      } else {
        const before = this.ship.hp;
        this.ship.hp = Math.min(3, this.ship.hp + 1);
        if (this.ship.hp > before) this.metrics.repairPickups += 1;
        this.emit("repair-collected", { x: pickup.x, y: pickup.y, hp: this.ship.hp, restored: this.ship.hp > before });
      }
    }

    this.shots = this.shots.filter((shot) => !shot.dead && shot.y > -25 && shot.x > -10 && shot.x < 650);
    this.hostile = this.hostile.filter((bullet) => !bullet.dead && bullet.y < 500 && bullet.y > -30 && bullet.x > -30 && bullet.x < 670);
    this.pickups = this.pickups.filter((pickup) => !pickup.dead && pickup.y < 510);

    if (this.state === "running" && !this.breakTimer && !this.boss && (this.wave % 5 === 0 || (this.spawned >= this.quota() && this.enemies.length === 0))) {
      this.breakTimer = 3;
      this.hostile = [];
      this.drop(this.ship.x, Math.max(30, this.ship.y - 85), "upgrade");
      this.metrics.wavesCleared += 1;
      this.emit("wave-cleared", { wave: this.wave });
    }

    return this.drainEvents();
  }

  observe() {
    return {
      state: this.state,
      player: { ...this.ship },
      enemies: this.enemies.map((enemy) => ({
        ...enemy,
        vx: Math.cos(this.elapsed * 2 + enemy.phase) * 40,
      })),
      hostile: this.hostile.map((bullet) => ({ ...bullet })),
      pickups: this.pickups.map((pickup) => ({ ...pickup })),
      boss: this.boss ? { ...this.boss, vx: Math.cos(this.boss.time * 0.65) * 195 * 0.65 } : null,
      wave: this.wave,
      score: this.score,
      kills: this.kills,
      spawned: this.spawned,
      quota: this.quota(),
      elapsed: this.elapsed,
      breakTimer: this.breakTimer,
    };
  }
}
