import artifact from "./orbit-policy.json";

const WIDTH = 960;
const HEIGHT = 640;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestHazard(point, hazards) {
  let closest = null;
  let closestDistance = Infinity;
  for (const hazard of hazards) {
    const hazardDistance = distance(point, hazard);
    if (hazardDistance < closestDistance) {
      closest = hazard;
      closestDistance = hazardDistance;
    }
  }
  return { hazard: closest, distance: closestDistance };
}

function routeRisk(packet, targetPhase, observation) {
  const dx = packet.x - observation.player.x;
  const dy = packet.y - observation.player.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  return (observation.packets || []).reduce((risk, crossing) => {
    if (crossing === packet || crossing.phase === targetPhase) return risk;
    const t = Math.max(0, Math.min(1, ((crossing.x - observation.player.x) * dx + (crossing.y - observation.player.y) * dy) / lengthSquared));
    const closest = { x: observation.player.x + dx * t, y: observation.player.y + dy * t };
    const clearance = distance(closest, crossing);
    return t > 0.08 && t < 0.94 && clearance < 66 ? risk + ((66 - clearance) / 66) * (1 - t * 0.25) : risk;
  }, 0);
}

function targetValue(packet, observation, weights) {
  const packetDistance = distance(observation.player, packet);
  const danger = nearestHazard(packet, observation.hazards).distance;
  const phaseValue = packet.phase === observation.phase ? weights.match : -weights.wrong;
  return phaseValue
    + Math.max(-1, 1 - packetDistance / 500) * weights.near
    + Math.max(-1, 1 - danger / 180) * weights.risk
    - routeRisk(packet, packet.phase, observation) * weights.wrong;
}

export function createOrbitPolicy() {
  const weights = artifact.weights;

  return {
    name: artifact.name,
    version: artifact.version,

    act(observation) {
      const now = observation.elapsed;
      const packets = observation.packets || [];
      const hazards = observation.hazards || [];
      const phaseSwitchReady = now - Number(observation.lastToggle ?? -1) >= 0.45;
      // Never steer into an opposite-phase packet while the switch is still on cooldown.
      // Otherwise a close target can be collected before Space becomes available.
      const packetTarget = packets
        .filter((packet) => packet.phase === observation.phase || phaseSwitchReady)
        .slice()
        .sort((a, b) => targetValue(b, observation, weights) - targetValue(a, observation, weights))[0] || null;
      let lifeTarget = null;
      let lifeValue = -Infinity;
      if (observation.lifePickup) {
        lifeTarget = { ...observation.lifePickup, kind: "life" };
        const lifeDistance = distance(observation.player, lifeTarget);
        const lifeSafety = nearestHazard(lifeTarget, hazards).distance;
        lifeValue = weights.life / (1 + Math.max(0, observation.lives) * 0.3)
          + Math.max(-1, 1 - lifeDistance / 500) * weights.near
          + Math.max(-1, 1 - lifeSafety / 180) * weights.risk;
      }
      const packetScore = packetTarget ? targetValue(packetTarget, observation, weights) : -Infinity;
      const target = lifeTarget && lifeValue >= packetScore ? lifeTarget : packetTarget;
      if (!target) {
        return { dx: 0, dy: 0, toggle: false, space: false, dash: false, shift: false, keys: [], target: { label: "No target", kind: "none" }, reason: "Hold position until a pickup appears." };
      }

      const desiredPhase = target.phase ?? observation.phase;
      const toggle = desiredPhase !== observation.phase && phaseSwitchReady;
      const activePhase = toggle ? desiredPhase : observation.phase;
      let moveX = target.x - observation.player.x;
      let moveY = target.y - observation.player.y;
      const goalLength = Math.hypot(moveX, moveY) || 1;
      moveX /= goalLength;
      moveY /= goalLength;
      let reason = "Follow the safest matching pickup route.";

      let routeBlocker = null;
      let blockerT = 1;
      for (const packet of packets) {
        if (packet.phase === activePhase) continue;
        const dx = target.x - observation.player.x;
        const dy = target.y - observation.player.y;
        const lengthSquared = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((packet.x - observation.player.x) * dx + (packet.y - observation.player.y) * dy) / lengthSquared));
        const closest = { x: observation.player.x + dx * t, y: observation.player.y + dy * t };
        if (t > 0.08 && t < 0.94 && distance(closest, packet) < 66 && t < blockerT) {
          routeBlocker = packet;
          blockerT = t;
        }
      }
      if (routeBlocker) {
        const sideA = { x: moveY, y: -moveX };
        const sideB = { x: -moveY, y: moveX };
        const clearanceA = Math.min(...hazards.map((hazard) => Math.hypot(observation.player.x + sideA.x * 60 - hazard.x, observation.player.y + sideA.y * 60 - hazard.y)), Infinity);
        const clearanceB = Math.min(...hazards.map((hazard) => Math.hypot(observation.player.x + sideB.x * 60 - hazard.x, observation.player.y + sideB.y * 60 - hazard.y)), Infinity);
        const side = clearanceA >= clearanceB ? sideA : sideB;
        moveX += side.x * 1.15;
        moveY += side.y * 1.15;
        reason = "Curve around a wrong-color pickup crossing the direct path.";
      }

      let nearWrong = false;
      for (const packet of packets) {
        if (packet.phase === activePhase) continue;
        const awayX = observation.player.x - packet.x;
        const awayY = observation.player.y - packet.y;
        const packetDistance = Math.hypot(awayX, awayY) || 1;
        if (packetDistance >= 118) continue;
        const strength = ((118 - packetDistance) / 118) * weights.wrong * 1.35;
        moveX += (awayX / packetDistance) * strength;
        moveY += (awayY / packetDistance) * strength;
        nearWrong = true;
      }
      if (nearWrong && !routeBlocker) reason = "Give the wrong-color pickup clearance before turning back toward the target.";

      let nearest = { hazard: null, distance: Infinity };
      let dangerX = 0;
      let dangerY = 0;
      for (const hazard of hazards) {
        const dx = observation.player.x - hazard.x;
        const dy = observation.player.y - hazard.y;
        const hazardDistance = Math.hypot(dx, dy) || 1;
        if (hazardDistance < nearest.distance) nearest = { hazard, distance: hazardDistance };
        if (hazardDistance < 170) {
          const strength = ((170 - hazardDistance) / 170) ** 2 * weights.avoid;
          dangerX += (dx / hazardDistance) * strength;
          dangerY += (dy / hazardDistance) * strength;
        }
      }
      moveX += dangerX;
      moveY += dangerY;
      if (nearest.distance < 170 && !routeBlocker && !nearWrong) reason = "Arc away from the nearest moving planet before closing on the target.";

      const edge = 58;
      if (observation.player.x < edge) moveX += (edge - observation.player.x) / edge;
      if (observation.player.x > WIDTH - edge) moveX -= (observation.player.x - (WIDTH - edge)) / edge;
      if (observation.player.y < edge) moveY += (edge - observation.player.y) / edge;
      if (observation.player.y > HEIGHT - edge) moveY -= (observation.player.y - (HEIGHT - edge)) / edge;
      const length = Math.hypot(moveX, moveY) || 1;
      const dx = moveX / length;
      const dy = moveY / length;
      const keys = [];
      if (Math.abs(dx) > 0.24) keys.push(dx > 0 ? "D" : "A");
      if (Math.abs(dy) > 0.24) keys.push(dy > 0 ? "S" : "W");
      if (!keys.length) keys.push(dx > 0 ? "D" : "A");
      const dash = nearest.distance < 94 && observation.energy > 28 && observation.dashCooldown <= 0;
      if (toggle) reason = `Press Space to switch to ${desiredPhase} for the selected pickup.`;
      else if (dash) reason = "Press Shift to dash past the nearby planet.";
      if (target.kind === "life" && !routeBlocker && !nearWrong && !toggle && !dash) reason = "Collect the extra life while its route is clear.";
      return {
        dx, dy, toggle, space: toggle, dash, shift: dash, keys,
        target: { kind: target.kind || "packet", label: target.kind === "life" ? "Extra life" : `${target.phase} pickup`, x: target.x, y: target.y },
        hazard: nearest.hazard ? { x: nearest.hazard.x, y: nearest.hazard.y, distance: Math.round(nearest.distance) } : null,
        reason,
      };
    },
  };
}
