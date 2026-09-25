export const GOLF_BOUNDS = Object.freeze({ left: 24, right: 616, top: 30, bottom: 406 });
export const GOLF_RADIUS = 7;
export const GOLF_STEP_SECONDS = 1 / 120;
export const GOLF_COURSES = Object.freeze([
  { name: "The Welcome Mat", par: 2, start: [100, 215], cup: [520, 215], walls: [], sand: [], water: [] },
  { name: "Around the Bend", par: 3, start: [105, 330], cup: [520, 100], walls: [{ x: 285, y: 160, w: 30, h: 246 }], sand: [], water: [] },
  { name: "Sandy Shortcut", par: 3, start: [100, 215], cup: [540, 215], walls: [], sand: [{ x: 245, y: 130, w: 160, h: 170 }], water: [] },
  { name: "Water’s Edge", par: 3, start: [95, 320], cup: [535, 100], walls: [], sand: [], water: [{ x: 245, y: 125, w: 150, h: 180 }] },
  { name: "The Garden Gates", par: 4, start: [95, 320], cup: [545, 105], walls: [{ x: 230, y: 150, w: 26, h: 256 }, { x: 402, y: 30, w: 26, h: 240 }], sand: [{ x: 280, y: 295, w: 92, h: 62 }], water: [] },
  { name: "The Clubhouse", par: 4, start: [90, 325], cup: [545, 105], walls: [{ x: 245, y: 30, w: 28, h: 218 }], sand: [{ x: 425, y: 275, w: 115, h: 65 }], water: [{ x: 320, y: 110, w: 95, h: 100 }] },
]);

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inside = (point, rect) => point.x > rect.x && point.x < rect.x + rect.w && point.y > rect.y && point.y < rect.y + rect.h;

export function createGolfRun(courseIndexes = GOLF_COURSES.map((_, index) => index)) {
  const indexes = [...courseIndexes];
  const course = GOLF_COURSES[indexes[0]];
  const ball = { x: course.start[0], y: course.start[1] };
  return { courseIndexes: indexes, holePosition: 0, holeIndex: indexes[0], ball, lie: { ...ball }, strokes: 0, totalStrokes: 0, scores: [], holed: [], waterPenalties: 0, completed: false, status: "aiming" };
}

function collideWall(ball, wall) {
  const qx = clamp(ball.x, wall.x, wall.x + wall.w);
  const qy = clamp(ball.y, wall.y, wall.y + wall.h);
  const dx = ball.x - qx;
  const dy = ball.y - qy;
  const d = Math.hypot(dx, dy);
  if (d >= GOLF_RADIUS) return;
  let nx;
  let ny;
  let push;
  if (d > 0) {
    nx = dx / d; ny = dy / d; push = GOLF_RADIUS - d;
  } else {
    const edges = [
      { value: ball.x - wall.x, nx: -1, ny: 0 },
      { value: wall.x + wall.w - ball.x, nx: 1, ny: 0 },
      { value: ball.y - wall.y, nx: 0, ny: -1 },
      { value: wall.y + wall.h - ball.y, nx: 0, ny: 1 },
    ].sort((a, b) => a.value - b.value);
    ({ nx, ny } = edges[0]);
    push = GOLF_RADIUS + edges[0].value;
  }
  ball.x += nx * push;
  ball.y += ny * push;
  const dot = ball.vx * nx + ball.vy * ny;
  if (dot < 0) { ball.vx -= 1.72 * dot * nx; ball.vy -= 1.72 * dot * ny; }
}

export function rollGolfShot(courseIndex, start, angleDegrees, power, maxSeconds = 10) {
  const course = GOLF_COURSES[courseIndex];
  const ball = { x: start.x, y: start.y, vx: 0, vy: 0 };
  const angle = angleDegrees * Math.PI / 180;
  const speed = power * 5.2;
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  let water = false;
  let sandTime = 0;
  let elapsed = 0;
  const path = [[start.x, start.y]];
  const limit = Math.ceil(maxSeconds / GOLF_STEP_SECONDS);
  for (let step = 0; step < limit; step += 1) {
    const dt = GOLF_STEP_SECONDS;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x < GOLF_BOUNDS.left + GOLF_RADIUS) { ball.x = GOLF_BOUNDS.left + GOLF_RADIUS; ball.vx = Math.abs(ball.vx) * 0.72; }
    if (ball.x > GOLF_BOUNDS.right - GOLF_RADIUS) { ball.x = GOLF_BOUNDS.right - GOLF_RADIUS; ball.vx = -Math.abs(ball.vx) * 0.72; }
    if (ball.y < GOLF_BOUNDS.top + GOLF_RADIUS) { ball.y = GOLF_BOUNDS.top + GOLF_RADIUS; ball.vy = Math.abs(ball.vy) * 0.72; }
    if (ball.y > GOLF_BOUNDS.bottom - GOLF_RADIUS) { ball.y = GOLF_BOUNDS.bottom - GOLF_RADIUS; ball.vy = -Math.abs(ball.vy) * 0.72; }
    for (const wall of course.walls) collideWall(ball, wall);
    if (course.water.some((rect) => inside(ball, rect))) { water = true; path.push([start.x, start.y]); return { x: start.x, y: start.y, sunk: false, water, sandTime, elapsed, stopped: true, path }; }
    const inSand = course.sand.some((rect) => inside(ball, rect));
    if (inSand) sandTime += dt;
    const drag = Math.exp(-(inSand ? 4.6 : 1.05) * dt);
    ball.vx *= drag;
    ball.vy *= drag;
    elapsed += dt;
    const velocity = Math.hypot(ball.vx, ball.vy);
    if (step % 12 === 0) path.push([ball.x, ball.y]);
    if (distance(ball, { x: course.cup[0], y: course.cup[1] }) < 11 && velocity < 165) {
      path.push([course.cup[0], course.cup[1]]);
      return { x: course.cup[0], y: course.cup[1], sunk: true, water, sandTime, elapsed, stopped: true, path };
    }
    if (velocity < 8) break;
  }
  path.push([ball.x, ball.y]);
  return { x: ball.x, y: ball.y, sunk: false, water, sandTime, elapsed, stopped: true, path };
}

export function applyGolfShot(run, shot) {
  if (run.status !== "aiming" || run.completed) return { event: null, outcome: null };
  const course = GOLF_COURSES[run.holeIndex];
  const courseIndex = run.holeIndex;
  const result = rollGolfShot(courseIndex, run.ball, shot.angle, shot.power);
  run.strokes += 1;
  run.totalStrokes += 1;
  if (result.water) { run.strokes += 1; run.totalStrokes += 1; run.waterPenalties += 1; }
  const usedStrokes = run.strokes;
  run.ball = { x: result.x, y: result.y };
  run.lie = { ...run.ball };
  const doneHole = result.sunk || run.strokes >= 10;
  let event = result.water ? "water" : "settled";
  if (doneHole) {
    run.scores[run.holePosition] = run.strokes;
    run.holed[run.holePosition] = result.sunk;
    event = result.sunk ? "holed" : "pickup";
    run.holePosition += 1;
    if (run.holePosition >= run.courseIndexes.length) {
      run.completed = true;
      run.status = "complete";
    } else {
      run.holeIndex = run.courseIndexes[run.holePosition];
      const next = GOLF_COURSES[run.holeIndex];
      run.ball = { x: next.start[0], y: next.start[1] };
      run.lie = { ...run.ball };
      run.strokes = 0;
    }
  }
  return { event, outcome: { ...result, strokes: usedStrokes, holeIndex: courseIndex, sunk: result.sunk, coursePar: course.par } };
}
