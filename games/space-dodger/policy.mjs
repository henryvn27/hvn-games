import { DODGER_HEIGHT, DODGER_WIDTH } from "./simulation.mjs";

export const DODGER_ACTIONS = Object.freeze([
  { label: "hold", keys: [], dx: 0, dy: 0 },
  { label: "W", keys: ["w"], dx: 0, dy: -1 },
  { label: "A", keys: ["a"], dx: -1, dy: 0 },
  { label: "S", keys: ["s"], dx: 0, dy: 1 },
  { label: "D", keys: ["d"], dx: 1, dy: 0 },
  { label: "W + A", keys: ["w", "a"], dx: -1, dy: -1 },
  { label: "W + D", keys: ["w", "d"], dx: 1, dy: -1 },
  { label: "S + A", keys: ["s", "a"], dx: -1, dy: 1 },
  { label: "S + D", keys: ["s", "d"], dx: 1, dy: 1 },
]);

export const DEFAULT_DODGER_WEIGHTS = Object.freeze({
  repair: 5.2,
  upgrade: 2.4,
  danger: 7.2,
  hullRisk: 2.8,
  aim: 2.8,
  lane: 1.1,
  edge: 1.8,
  smooth: 0.28,
});

const HORIZON = 0.48;
const SHIP_SPEED = 260;
const PLAYER_RADIUS = 12;
const KEY_ORDER = ["w", "a", "s", "d"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function project(player, action, seconds = HORIZON) {
  const length = Math.hypot(action.dx, action.dy) || 1;
  return {
    x: clamp(player.x + (action.dx / length) * SHIP_SPEED * seconds, 20, DODGER_WIDTH - 20),
    y: clamp(player.y + (action.dy / length) * SHIP_SPEED * seconds, 28, DODGER_HEIGHT - 28),
    vx: (action.dx / length) * SHIP_SPEED,
    vy: (action.dy / length) * SHIP_SPEED,
  };
}

function closestApproach(player, move, object, seconds) {
  const rx = object.x - player.x;
  const ry = object.y - player.y;
  const vx = (object.vx || 0) - move.vx;
  const vy = (object.vy || 0) - move.vy;
  const speedSquared = vx * vx + vy * vy;
  const time = speedSquared ? clamp(-(rx * vx + ry * vy) / speedSquared, 0, seconds) : 0;
  return Math.hypot(rx + vx * time, ry + vy * time);
}

function collisionRisk(player, move, object, radius, margin = 34) {
  const clearance = closestApproach(player, move, object, HORIZON);
  const dangerRadius = PLAYER_RADIUS + radius + margin;
  if (clearance >= dangerRadius) return 0;
  return ((dangerRadius - clearance) / dangerRadius) ** 2;
}

function interceptTarget(player, observation) {
  let best = null;
  const candidates = observation.boss
    ? [{ ...observation.boss, kind: "boss", vy: 0 }]
    : observation.enemies.map((enemy) => ({ ...enemy, kind: enemy.kind || "fighter" }));
  for (const enemy of candidates) {
    const closingSpeed = 460 + (enemy.vy || 0);
    const time = (player.y - enemy.y) / closingSpeed;
    if (time < 0.04 || time > 1.6) continue;
    const x = clamp(enemy.x + (enemy.vx || 0) * time, enemy.r, DODGER_WIDTH - enemy.r);
    const urgency = 1 / (0.45 + time);
    const value = urgency * (enemy.kind === "boss" ? 1.8 : enemy.kind === "fighter" ? 1 : 0.72);
    if (!best || value > best.value) best = { x, y: enemy.y + enemy.vy * time, kind: enemy.kind, value };
  }
  return best;
}

function scoreAction(observation, action, weights, previousKeys) {
  const player = observation.player;
  const moved = project(player, action);
  const hullMultiplier = 1 + ((3 - player.hp) / 3) * weights.hullRisk;
  let score = 0;

  for (const pickup of observation.pickups) {
    const urgency = pickup.type === "repair"
      ? (player.hp < 3 ? 1.3 + (3 - player.hp) * 0.9 : 0.08)
      : (player.weapon < 3 ? 1.1 + (3 - player.weapon) * 0.55 : 0.12);
    const weight = pickup.type === "repair" ? weights.repair : weights.upgrade;
    const before = distance(player, pickup);
    const after = distance(moved, { x: pickup.x, y: pickup.y + (pickup.vy || 65) * HORIZON });
    score += weight * urgency * clamp((before - after) / 90, -1.5, 1.5);
    if (after < 25) score += weight * urgency * 0.65;
  }

  let risk = 0;
  for (const bullet of observation.hostile) risk += collisionRisk(player, moved, bullet, bullet.r, 30);
  for (const enemy of observation.enemies) risk += collisionRisk(player, moved, enemy, enemy.r, 42);
  if (observation.boss) risk += collisionRisk(player, moved, observation.boss, observation.boss.r, 52);
  risk = Math.min(3.5, risk);
  score -= weights.danger * hullMultiplier * risk;

  const target = interceptTarget(player, observation);
  if (target) {
    const lateralError = Math.abs(moved.x - target.x);
    const horizontalValue = Math.max(0, 1 - lateralError / 150);
    const verticalError = Math.abs(moved.y - 388);
    const laneValue = Math.max(0, 1 - verticalError / 190);
    score += horizontalValue * Math.min(1.7, target.value) * weights.aim + laneValue * weights.lane;
  } else {
    score += Math.max(0, 1 - Math.abs(moved.y - 388) / 120) * weights.lane;
  }

  const edgeClearance = Math.min(moved.x, DODGER_WIDTH - moved.x, moved.y, DODGER_HEIGHT - moved.y);
  const edgeRisk = clamp((64 - edgeClearance) / 64, 0, 1) ** 2;
  score -= weights.edge * edgeRisk;

  const previous = new Set(previousKeys);
  const changes = KEY_ORDER.reduce((count, key) => count + Number(previous.has(key) !== action.keys.includes(key)), 0);
  score -= weights.smooth * changes * 0.06;
  return { score, moved, risk };
}

function targetFor(observation) {
  const player = observation.player;
  const repairs = observation.pickups.filter((pickup) => pickup.type === "repair");
  const upgrades = observation.pickups.filter((pickup) => pickup.type === "upgrade");
  if (player.hp < 3 && repairs.length) {
    const pickup = repairs.slice().sort((a, b) => distance(player, a) - distance(player, b))[0];
    return { x: pickup.x, y: pickup.y, kind: "repair", label: `repair cell · hull ${player.hp}/3` };
  }
  if (player.weapon < 3 && upgrades.length) {
    const pickup = upgrades.slice().sort((a, b) => distance(player, a) - distance(player, b))[0];
    return { x: pickup.x, y: pickup.y, kind: "upgrade", label: `weapon upgrade · level ${player.weapon}` };
  }
  const intercept = interceptTarget(player, observation);
  if (intercept) {
    return { x: intercept.x, y: intercept.y, kind: intercept.kind, label: intercept.kind === "boss" ? "line up on dreadnought" : "line up an automatic shot" };
  }
  const nearestBullet = observation.hostile.slice().sort((a, b) => distance(player, a) - distance(player, b))[0];
  if (nearestBullet && distance(player, nearestBullet) < 150) {
    return { x: nearestBullet.x, y: nearestBullet.y, kind: "threat", label: "clear the incoming fire lane" };
  }
  return { x: player.x, y: 388, kind: "position", label: `hold a firing lane · wave ${observation.wave}` };
}

export function createSpaceDodgerPolicy(artifact = { weights: DEFAULT_DODGER_WEIGHTS }) {
  const weights = { ...DEFAULT_DODGER_WEIGHTS, ...(artifact.weights || {}) };
  let previousKeys = [];
  return {
    name: artifact.name || "mars-pilot-cem",
    version: artifact.version || 1,
    act(observation) {
      let best = null;
      for (const action of DODGER_ACTIONS) {
        const candidate = scoreAction(observation, action, weights, previousKeys);
        if (!best || candidate.score > best.score) best = { ...candidate, action };
      }
      previousKeys = best.action.keys.slice();
      const target = targetFor(observation);
      const threat = Math.round(Math.min(1, best.risk / 1.5) * 100);
      return {
        keys: best.action.keys.slice(),
        action: best.action.label,
        target,
        reason: threat > 48 ? "evading a nearby threat" : target.label,
        threat,
        projected: { x: Math.round(best.moved.x), y: Math.round(best.moved.y) },
        score: best.score,
      };
    },
  };
}
