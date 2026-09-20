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

function targetValue(packet, observation, weights) {
  const packetDistance = distance(observation.player, packet);
  const danger = nearestHazard(packet, observation.hazards).distance;
  if (packet.kind === "life") {
    return weights.life * 2 + 1.4 + Math.max(-1, 1 - packetDistance / 500) * weights.near + Math.max(-1, 1 - danger / 180) * weights.risk;
  }
  const matching = packet.phase === observation.phase ? 1 : 0;
  return matching * weights.match
    + Math.max(-1, 1 - packetDistance / 500) * weights.near
    + Math.max(-1, 1 - danger / 180) * weights.risk;
}

export function createOrbitPolicy() {
  const weights = artifact.weights;
  let lastToggleAt = -Infinity;
  let lastDashAt = -Infinity;

  return {
    name: artifact.name,
    version: artifact.version,

    act(observation) {
      const now = observation.elapsed;
      const packets = observation.packets || [];
      const hazards = observation.hazards || [];
      const matchingPackets = packets.filter((packet) => packet.phase === observation.phase);
      const lifeTarget = observation.lifePickup && observation.lives < 1
        ? [{ x: observation.lifePickup.x, y: observation.lifePickup.y, kind: "life" }]
        : [];
      const candidates = lifeTarget.length ? lifeTarget : (matchingPackets.length ? matchingPackets : packets);
      const target = candidates.slice().sort((a, b) => targetValue(b, observation, weights) - targetValue(a, observation, weights))[0];

      let goalX = observation.player.x;
      let goalY = observation.player.y;
      let toggle = false;
      if (target) {
        goalX = target.x;
        goalY = target.y;
        if (target.kind !== "life" && !matchingPackets.length && now - lastToggleAt > 0.45) {
          toggle = true;
          lastToggleAt = now;
        }
      } else if (observation.lifePickup && observation.lives < 1) {
        goalX = observation.lifePickup.x;
        goalY = observation.lifePickup.y;
      }

      let moveX = goalX - observation.player.x;
      let moveY = goalY - observation.player.y;
      const goalLength = Math.hypot(moveX, moveY) || 1;
      moveX /= goalLength;
      moveY /= goalLength;

      let dangerX = 0;
      let dangerY = 0;
      let nearestDistance = Infinity;
      for (const hazard of hazards) {
        const dx = observation.player.x - hazard.x;
        const dy = observation.player.y - hazard.y;
        const hazardDistance = Math.hypot(dx, dy) || 1;
        nearestDistance = Math.min(nearestDistance, hazardDistance);
        if (hazardDistance < 190) {
          const strength = ((190 - hazardDistance) / 190) ** 2;
          dangerX += (dx / hazardDistance) * strength;
          dangerY += (dy / hazardDistance) * strength;
        }
      }

      const edge = 58;
      if (observation.player.x < edge) moveX += (edge - observation.player.x) / edge;
      if (observation.player.x > WIDTH - edge) moveX -= (observation.player.x - (WIDTH - edge)) / edge;
      if (observation.player.y < edge) moveY += (edge - observation.player.y) / edge;
      if (observation.player.y > HEIGHT - edge) moveY -= (observation.player.y - (HEIGHT - edge)) / edge;

      moveX += dangerX * weights.avoid * 1.35;
      moveY += dangerY * weights.avoid * 1.35;
      const length = Math.hypot(moveX, moveY) || 1;
      const dash = nearestDistance < 94 && observation.energy > 28 && now - lastDashAt > 1.4;
      if (dash) lastDashAt = now;

      return { dx: moveX / length, dy: moveY / length, toggle, dash };
    },
  };
}
