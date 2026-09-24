export const BREAKOUT = Object.freeze({ width: 640, height: 440, paddleWidth: 94, ballRadius: 8, columns: 10, rows: 5 });

export function createBreakoutRun() {
  const bricks = [];
  const brickWidth = 50, gap = 8;
  const left = (BREAKOUT.width - (BREAKOUT.columns * brickWidth + (BREAKOUT.columns - 1) * gap)) / 2;
  for (let row = 0; row < BREAKOUT.rows; row += 1) {
    for (let column = 0; column < BREAKOUT.columns; column += 1) {
      bricks.push({ x: left + column * (brickWidth + gap), y: 46 + row * 25, width: brickWidth, height: 16, row, alive: true });
    }
  }
  return { mode: "ready", paddleX: 320, ballX: 320, ballY: 385, vx: 190, vy: -230, bricks, score: 0, lives: 3, elapsed: 0 };
}

export function startBreakoutRun() { const run = createBreakoutRun(); run.mode = "playing"; return run; }

export function stepBreakout(run, input = {}, seconds = 1 / 60) {
  if (run.mode !== "playing") return run;
  const dt = Math.min(0.05, Math.max(0, Number(seconds) || 0));
  run.elapsed += dt;
  const half = BREAKOUT.paddleWidth / 2;
  const target = Number.isFinite(input.paddleX) ? input.paddleX : run.paddleX + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 420 * dt;
  run.paddleX = Math.max(half, Math.min(BREAKOUT.width - half, target));
  run.ballX += run.vx * dt; run.ballY += run.vy * dt;
  if (run.ballX <= BREAKOUT.ballRadius) { run.ballX = BREAKOUT.ballRadius; run.vx = Math.abs(run.vx); }
  if (run.ballX >= BREAKOUT.width - BREAKOUT.ballRadius) { run.ballX = BREAKOUT.width - BREAKOUT.ballRadius; run.vx = -Math.abs(run.vx); }
  if (run.ballY <= BREAKOUT.ballRadius) { run.ballY = BREAKOUT.ballRadius; run.vy = Math.abs(run.vy); }
  const paddleY = BREAKOUT.height - 30;
  if (run.vy > 0 && run.ballY + BREAKOUT.ballRadius >= paddleY && run.ballY - BREAKOUT.ballRadius <= paddleY + 12 && Math.abs(run.ballX - run.paddleX) <= half + BREAKOUT.ballRadius) {
    const offset = Math.max(-1, Math.min(1, (run.ballX - run.paddleX) / half));
    const speed = Math.min(430, Math.hypot(run.vx, run.vy) * 1.025);
    run.vx = offset * speed * 0.88; run.vy = -Math.sqrt(Math.max(1, speed * speed - run.vx * run.vx)); run.ballY = paddleY - BREAKOUT.ballRadius;
  }
  for (const brick of run.bricks) {
    if (!brick.alive) continue;
    if (run.ballX + BREAKOUT.ballRadius >= brick.x && run.ballX - BREAKOUT.ballRadius <= brick.x + brick.width && run.ballY + BREAKOUT.ballRadius >= brick.y && run.ballY - BREAKOUT.ballRadius <= brick.y + brick.height) {
      brick.alive = false; run.score += (BREAKOUT.rows - brick.row) * 10; run.vy *= -1; break;
    }
  }
  if (run.bricks.every((brick) => !brick.alive)) run.mode = "won";
  if (run.ballY - BREAKOUT.ballRadius > BREAKOUT.height) {
    run.lives -= 1;
    if (run.lives <= 0) run.mode = "over";
    else { run.ballX = run.paddleX; run.ballY = paddleY - 18; run.vx = 190; run.vy = -230; run.mode = "ready"; }
  }
  return run;
}
