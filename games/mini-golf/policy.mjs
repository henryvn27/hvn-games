import artifact from "./policy.json" with { type: "json" };
import { GOLF_COURSES, applyGolfShot } from "./simulation.mjs";

export const DEFAULT_GOLF_WEIGHTS = Object.freeze({ sink: 20, progress: 2.4, stroke: 1.1, water: 12, overshoot: 0.8, sand: 0.12 });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function scoreGolfShot(courseIndex, ball, angle, power, weights) {
  const trial = { courseIndexes: [courseIndex], holePosition: 0, holeIndex: courseIndex, ball: { ...ball }, lie: { ...ball }, strokes: 0, totalStrokes: 0, scores: [], holed: [], waterPenalties: 0, completed: false, status: "aiming" };
  const course = GOLF_COURSES[courseIndex];
  const before = Math.hypot(course.cup[0] - ball.x, course.cup[1] - ball.y);
  const result = applyGolfShot(trial, { angle, power });
  const outcome = result.outcome;
  const after = Math.hypot(course.cup[0] - outcome.x, course.cup[1] - outcome.y);
  const improvement = before - after;
  const overshoot = Math.max(0, after - before);
  const score = Number(outcome.sunk) * weights.sink
    + improvement / 100 * weights.progress
    - weights.stroke
    - Number(outcome.water) * weights.water
    - overshoot / 100 * weights.overshoot
    - outcome.sandTime * weights.sand;
  return { angle, power, score, outcome, after, improvement, overshoot };
}

export function createGolfPolicy(weights = DEFAULT_GOLF_WEIGHTS) {
  return {
    name: artifact.name,
    decide(run) {
      const course = GOLF_COURSES[run.holeIndex];
      const baseAngle = Math.atan2(course.cup[1] - run.ball.y, course.cup[0] - run.ball.x) * 180 / Math.PI;
      const distance = Math.hypot(course.cup[0] - run.ball.x, course.cup[1] - run.ball.y);
      const idealPower = clamp(distance * 1.05 / 5.2, 10, 100);
      const angleOffsets = [-55, -35, -20, -10, 0, 10, 20, 35, 55];
      const powerFactors = [0.56, 0.73, 0.89, 1, 1.12, 1.3];
      let best = null;
      for (const offset of angleOffsets) {
        for (const factor of powerFactors) {
          const power = clamp(idealPower * factor, 10, 100);
          const trial = scoreGolfShot(run.holeIndex, run.ball, baseAngle + offset, power, weights);
          if (!best || trial.score > best.score) best = trial;
        }
      }
      return {
        angle: best.angle,
        power: best.power,
        target: `${course.name} · cup ${Math.round(distance)} px away`,
        reason: best.outcome.sunk ? "A gentle line reaches the cup at a sinkable speed." : best.outcome.water ? "Avoid the pond on the next putt; this candidate carries a water penalty." : best.improvement > 0 ? "Choose the bank and pace with the best predicted distance gain." : "Preserve the lie and favor a safe line toward the green.",
        prediction: { sunk: best.outcome.sunk, water: best.outcome.water, distanceRemaining: Math.round(best.after), gain: Math.round(best.improvement) },
      };
    },
  };
}
