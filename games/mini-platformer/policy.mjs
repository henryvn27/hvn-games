import { PLATFORMER_LEVEL_NAMES } from "./simulation.mjs";

export const DEFAULT_PLATFORMER_WEIGHTS = Object.freeze({
  progress: 2.4,
  star: 3.1,
  safety: 2.5,
  stable: 1.05,
  spring: 0.45,
  checkpoint: 1.2,
  gap: 0.8,
  height: 1.1,
  lookAhead: 280,
  jumpLead: 54,
  jumpHold: 0.2,
  brakeLead: 28,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const surfaceLabel = (platform) => ({
  solid: "stable ledge",
  spring: "spring pad",
  moving: "moving platform",
  crumble: "crumbling ledge",
}[platform.type] || "platform");

function currentSurface(state) {
  const id = state.player.on ?? state.lastSupportId;
  if (id !== null && id !== undefined) {
    const platform = state.platforms.find((item) => item.id === id);
    if (platform && !platform.gone) return platform;
  }
  const player = state.player;
  return state.platforms.find((platform) => !platform.gone
    && player.x + player.w > platform.x && player.x < platform.x + platform.w
    && Math.abs(player.y + player.h - platform.y) <= 20) || null;
}

function candidateFeatures(state, from, to, weights) {
  const player = state.player;
  const playerCenter = player.x + player.w / 2;
  const center = to.x + to.w / 2;
  const gap = Math.max(0, to.x - (player.x + player.w));
  const rise = from.y - to.y;
  const progress = clamp((center - playerCenter) / weights.lookAhead, 0, 1);
  const gapCost = clamp(gap / weights.lookAhead, 0, 1.4);
  const heightCost = rise > 0 ? rise / 125 : Math.max(0, -rise - 85) / 280;
  const star = state.stars.reduce((value, item, index) => value + Number(!state.collected.has(index)
    && Math.abs(item.x - center) <= to.w / 2 + 34
    && Math.abs(item.y + 11 - to.y) <= 118), 0);
  const eta = clamp((Math.max(gap, 28) / 220) + 0.32, 0.3, 1.3);
  const enemyRisk = state.enemies.reduce((risk, enemy) => {
    if (enemy.dead || Math.abs(enemy.y + enemy.h - to.y) > 45) return risk;
    const x = enemy.base + Math.sin((state.elapsed + eta) * enemy.speed) * enemy.range;
    return Math.max(risk, Number(Math.abs(x + enemy.w / 2 - center) < to.w / 2 + 48));
  }, 0);
  const stable = to.type === "solid" ? 1 : to.type === "spring" ? 0.72 : to.type === "moving" ? 0.42 : 0;
  const checkpoint = to.x < 770 && to.x + to.w > 680 && to.y >= 280 ? 1 : 0;
  const spring = to.type === "spring" ? 1 : 0;
  const score = weights.progress * progress
    + weights.star * star
    + weights.safety * (1 - enemyRisk)
    + weights.stable * stable
    + weights.spring * spring
    + weights.checkpoint * checkpoint
    - weights.gap * gapCost
    - weights.height * heightCost;
  return { score, gap, rise, enemyRisk, star, progress };
}

function pickTarget(state, from, weights) {
  const player = state.player;
  const springReach = from.type === "spring" ? 168 : 96;
  const maxDrop = 220;
  const candidates = state.platforms.filter((to) => {
    if (to.id === from.id || to.gone) return false;
    if (to.x + to.w < player.x + 16 || to.x > player.x + weights.lookAhead + player.w) return false;
    const isLowerFloorUnderThisLedge = to.y > from.y + 10 && to.x <= from.x && to.x + to.w >= from.x + from.w;
    const playerUnderRaisedLedge = to.y < from.y - 10 && player.y >= to.y + to.h
      && player.x + player.w > to.x + 5 && player.x < to.x + to.w - 5;
    if (isLowerFloorUnderThisLedge || playerUnderRaisedLedge) return false;
    const gap = Math.max(0, to.x - (player.x + player.w));
    if (gap > weights.lookAhead) return false;
    const rise = from.y - to.y;
    return rise <= springReach && rise >= -maxDrop;
  }).map((to) => ({ platform: to, features: candidateFeatures(state, from, to, weights) }))
    .sort((a, b) => b.features.score - a.features.score || a.platform.x - b.platform.x);
  return candidates[0] || null;
}

function reasonFor(target, features, jumpNeeded) {
  if (features?.enemyRisk) return "The patrol crosses this landing window; keep moving through it.";
  if (target.type === "spring") return "Use the spring pad to gain height on the next section.";
  if (features?.star > 0) return "Take the ledge with a route marker on the way forward.";
  if (target.type === "crumble") return "Cross the crumbling ledge quickly before its timer expires.";
  if (target.type === "moving") return "Meet the moving platform at its current position.";
  if (jumpNeeded && target.y < 280) return "Jump before the gap to reach the higher ledge.";
  if (jumpNeeded) return "Jump while there is still room on the takeoff platform.";
  return "Stay on the forward route and line up a safe landing.";
}

export function createMiniPlatformerPolicy(candidateWeights = DEFAULT_PLATFORMER_WEIGHTS) {
  const weights = { ...DEFAULT_PLATFORMER_WEIGHTS, ...candidateWeights };
  let targetId = null;
  let lastDeaths = -1;
  let lastSupport = null;
  let jumpStartedAt = null;

  return {
    name: "market-trail-cem-v1",
    decide(state) {
      const player = state.player;
      if (state.deaths !== lastDeaths) {
        targetId = null;
        jumpStartedAt = null;
        lastDeaths = state.deaths;
      }
      const surface = currentSurface(state);
      if (player.on !== null && player.on !== lastSupport) {
        if (player.on === targetId) targetId = null;
        lastSupport = player.on;
        jumpStartedAt = null;
      }

      let target = targetId === "finish" ? { id: "finish", x: 1510, y: 270, w: 64, h: 40, type: "solid" }
        : state.platforms.find((item) => item.id === targetId && !item.gone);
      if (player.on !== null && target?.id === player.on) target = null;
      if (surface && target && target.id !== "finish") {
        const blockedFloor = target.y > surface.y + 10 && target.x <= surface.x && target.x + target.w >= surface.x + surface.w;
        const underRaisedLedge = target.y < surface.y - 10 && player.y >= target.y + target.h
          && player.x + player.w > target.x + 5 && player.x < target.x + target.w - 5;
        if (blockedFloor || underRaisedLedge) {
          target = null;
          targetId = null;
        }
      }
      if (target?.type === "spring" && state.lastSupportId === target.id) {
        targetId = null;
        target = null;
      }
      let features = target && surface ? candidateFeatures(state, surface, target, weights) : null;
      if (!target && surface) {
        const selected = pickTarget(state, surface, weights);
        if (selected) {
          target = selected.platform;
          features = selected.features;
          targetId = target.id;
        } else {
          target = { id: "finish", x: 1510, y: 270, w: 64, h: 40, type: "solid" };
          targetId = "finish";
          features = { score: 0, gap: Math.max(0, target.x - player.x - player.w), rise: 0, enemyRisk: 0, star: 0, progress: 1 };
        }
      }
      if (!target) {
        target = { id: "finish", x: 1510, y: 270, w: 64, h: 40, type: "solid" };
        targetId = "finish";
        features = { score: 0, gap: Math.max(0, target.x - player.x - player.w), rise: 0, enemyRisk: 0, star: 0, progress: 1 };
      }
      if (target.id === "finish") features = features || { score: 0, gap: 0, rise: 0, enemyRisk: 0, star: 0, progress: 1 };

      const targetCenter = target.x + target.w / 2;
      const currentRight = surface ? surface.x + surface.w : player.x + 80;
      const gap = surface ? Math.max(0, target.x - currentRight) : 0;
      const rise = surface ? surface.y - target.y : 0;
      const jumpNeeded = target.id !== "finish" && (rise > 10 || gap > 10);
      const launchX = gap > 10
        ? currentRight - weights.jumpLead
        : target.x - weights.jumpLead;
      const canJump = player.on !== null || state.coyote > 0;
      if (jumpNeeded && canJump && player.x >= launchX && jumpStartedAt === null) jumpStartedAt = state.elapsed;
      if (jumpStartedAt !== null && state.elapsed - jumpStartedAt >= weights.jumpHold) jumpStartedAt = null;
      const jump = jumpStartedAt !== null && state.elapsed - jumpStartedAt < weights.jumpHold;

      let direction;
      if (player.on !== null && jumpNeeded && player.x < launchX) direction = 1;
      else if (player.on !== null && jumpNeeded && player.vx > 60 && player.x > launchX + weights.brakeLead) direction = -1;
      else if (player.x + player.w / 2 < targetCenter - weights.brakeLead) direction = 1;
      else if (player.x + player.w / 2 > targetCenter + weights.brakeLead) direction = -1;
      else if (player.vx > 95 && player.x + player.w / 2 > targetCenter - weights.brakeLead / 2) direction = -1;
      else if (player.vx < -95 && player.x + player.w / 2 < targetCenter + weights.brakeLead / 2) direction = 1;
      else direction = 0;

      if (player.on !== null && !jumpNeeded && target.id !== "finish") direction = player.x + player.w / 2 < targetCenter ? 1 : -1;
      if (player.on !== null && target.id === "finish") direction = player.x + player.w / 2 < targetCenter ? 1 : 0;
      if (target.id === "finish" && player.on === null && player.x < 1500) direction = 1;
      if (player.on === null && features?.enemyRisk && player.vy > 0 && Math.abs(player.x + player.w / 2 - targetCenter) < 28) direction = player.x < targetCenter ? 1 : -1;

      const input = { left: direction < 0, right: direction > 0, jump };
      const keys = [];
      if (input.left) keys.push("A");
      if (input.right) keys.push("D");
      if (input.jump) keys.push("SPACE");
      const typeLabel = target.id === "finish" ? "finish flag" : surfaceLabel(target);
      const targetLabel = target.id === "finish" ? "Finish flag" : `${typeLabel} ${String(target.id + 1).padStart(2, "0")}`;
      const landingX = target.id === "finish" ? target.x + 16 : clamp(targetCenter, target.x + player.w / 2, target.x + target.w - player.w / 2);
      const landing = { x: Math.round(landingX), y: Math.round(target.y - player.h) };
      const reason = target.id === "finish" ? "The next platform is clear; carry on to the flag."
        : reasonFor(target, features, jumpNeeded);
      return {
        input,
        keys,
        action: keys.length ? keys.join(" + ") : "HOLD",
        target: { id: target.id, x: targetCenter, y: target.y, w: target.w, h: target.h, label: targetLabel, type: target.type },
        landing,
        reason,
        routeScore: Number((features?.score ?? 0).toFixed(2)),
        risk: Math.round((features?.enemyRisk ?? 0) * 100),
        course: PLATFORMER_LEVEL_NAMES[state.levelIndex],
      };
    },
  };
}

export function scorePlatformerEpisode(result) {
  return (result.completed ? 150 : result.progress * 40)
    + result.stars * 4
    - result.seconds * 0.05
    - result.deaths * 16
    - result.falls * 4
    - result.enemyHits * 10;
}
