import artifact from "./policy.json" with { type: "json" };
import { ASTEROIDS_FIELD } from "./simulation.mjs";

export const DEFAULT_ASTEROIDS_WEIGHTS = Object.freeze({ aim: 1.2, avoid: 1.9, cruise: 105, turnDeadband: 0.12, panic: 0.8, lead: 0.75 });

function wrappedDelta(value, size) {
  if (value > size / 2) return value - size;
  if (value < -size / 2) return value + size;
  return value;
}
function wrapAngle(value) {
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export function createAsteroidsPolicy(weights = DEFAULT_ASTEROIDS_WEIGHTS) {
  return {
    name: artifact.name,
    decide(run) {
      const ship = run.ship;
      const width = ASTEROIDS_FIELD.width;
      const height = ASTEROIDS_FIELD.height;
      let target = null;
      let targetScore = -Infinity;
      let evadeX = 0;
      let evadeY = 0;
      let threat = 0;
      let nearest = Infinity;

      for (const rock of run.asteroids) {
        const dx = wrappedDelta(rock.x - ship.x, width);
        const dy = wrappedDelta(rock.y - ship.y, height);
        const distance = Math.hypot(dx, dy) || 1;
        const leadTime = Math.min(weights.lead, distance / ASTEROIDS_FIELD.bulletSpeed);
        const tx = wrappedDelta(rock.x + rock.vx * leadTime - ship.x, width);
        const ty = wrappedDelta(rock.y + rock.vy * leadTime - ship.y, height);
        const candidateScore = (rock.size * 20) / (distance + 32);
        if (candidateScore > targetScore) {
          target = { x: tx, y: ty, rock, distance };
          targetScore = candidateScore;
        }

        const relativeX = dx;
        const relativeY = dy;
        const relativeVX = rock.vx - ship.vx;
        const relativeVY = rock.vy - ship.vy;
        const relativeSpeedSquared = relativeVX * relativeVX + relativeVY * relativeVY || 1;
        const closestTime = Math.max(0, Math.min(1.8, -(relativeX * relativeVX + relativeY * relativeVY) / relativeSpeedSquared));
        const closestX = relativeX + relativeVX * closestTime;
        const closestY = relativeY + relativeVY * closestTime;
        const clearance = Math.hypot(closestX, closestY) - ASTEROIDS_FIELD.shipRadius - ASTEROIDS_FIELD.rockRadius[rock.size] * 0.72;
        nearest = Math.min(nearest, distance);
        if (clearance < 110) {
          const urgency = Math.max(0, (110 - clearance) / 110) * Math.max(0.15, 1 - closestTime / 2.2);
          evadeX -= closestX / (Math.hypot(closestX, closestY) || 1) * urgency;
          evadeY -= closestY / (Math.hypot(closestX, closestY) || 1) * urgency;
          threat = Math.max(threat, urgency);
        }
      }

      if (!target) return { left: false, right: false, thrust: false, fire: false, label: "HOLD", target: "No rocks in field", reason: "Hold a stable heading until the next wave appears.", threat: 0 };
      const targetLength = Math.hypot(target.x, target.y) || 1;
      const aimX = target.x / targetLength;
      const aimY = target.y / targetLength;
      let desiredX = aimX * weights.aim + evadeX * weights.avoid;
      let desiredY = aimY * weights.aim + evadeY * weights.avoid;
      let desiredAngle = Math.atan2(desiredY, desiredX);
      if (Math.hypot(desiredX, desiredY) < 0.05) desiredAngle = Math.atan2(target.y, target.x);
      const error = wrapAngle(desiredAngle - ship.angle);
      const left = error < -weights.turnDeadband;
      const right = error > weights.turnDeadband;
      const speed = Math.hypot(ship.vx, ship.vy);
      const thrust = speed < weights.cruise || threat > weights.panic;
      const label = `${left ? "A" : right ? "D" : "LOCK"}${thrust ? " + W" : ""} + SPACE`;
      return {
        left, right, thrust, fire: true,
        label,
        target: `${target.rock.size === 3 ? "Large" : target.rock.size === 2 ? "Medium" : "Small"} rock · ${Math.round(target.distance)} px`,
        reason: threat > weights.panic ? "Thrust through the projected collision lane while keeping the guns firing." : Math.abs(error) > weights.turnDeadband ? "Lead the nearest high-value rock and keep firing through the turn." : "Hold the firing line and preserve enough speed to keep the ship mobile.",
        threat: Number(Math.max(0, Math.min(1, threat)).toFixed(2)),
        aimError: Number(error.toFixed(3)),
      };
    },
  };
}
