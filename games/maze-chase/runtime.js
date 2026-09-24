import "./style.css";
import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { createMazeRun, MAZE, stepMaze } from "./simulation.mjs";

const CELL = 40;
const WIDTH = CELL * MAZE[0].length;
const HEIGHT = CELL * MAZE.length;
const BEST_KEY = "hvn-games:maze-chase:best";
const readBest = () => { try { return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch { return 0; } };

export function mountMazeChase(host) {
  host.innerHTML = `<section class="maze-chase" aria-label="Maze Chase game">
    <div class="maze-chase-bar"><div><span>score</span><strong data-score>0</strong></div><div><span>dots left</span><strong data-left>0</strong></div><div><span>lives</span><strong data-lives>3</strong></div><div><span>best</span><strong data-best>${readBest()}</strong></div><button type="button" data-pause disabled>Pause</button></div>
    <div class="maze-chase-stage"><canvas data-board width="${WIDTH}" height="${HEIGHT}" aria-label="Maze. Use arrow keys or WASD to move, collect dots, and avoid the pursuer."></canvas>
      <div class="maze-chase-overlay" data-overlay><h2 data-title>Clear the lanes.</h2><p data-copy>Collect every dot. Power orbs turn the tables for a few seconds.</p><button type="button" data-action>Start chase</button>
        <form data-name hidden><label for="maze-player-name">Name or initials<input id="maze-player-name" maxlength="16" autocomplete="nickname"></label><button type="submit">Save score</button><p data-save-status role="status"></p></form>
      </div>
    </div>
    <div class="maze-chase-controls"><button data-dir="up" aria-label="Move up">↑</button><button data-dir="left" aria-label="Move left">←</button><button data-dir="down" aria-label="Move down">↓</button><button data-dir="right" aria-label="Move right">→</button><button data-restart>Restart</button></div>
    <p class="maze-chase-help" data-message role="status" aria-live="polite">Arrows / WASD · P to pause · touch the direction pad</p>
  </section>`;
  const $ = (selector) => host.querySelector(selector);
  const canvas = $(`[data-board]`), ctx = canvas.getContext("2d");
  const overlay = $(`[data-overlay]`), action = $(`[data-action]`), pause = $(`[data-pause]`);
  const form = $(`[data-name]`), nameInput = $(`#maze-player-name`);
  let state = createMazeRun(), direction = "right", timer = 0, best = readBest(), saved = false, disposed = false;

  const draw = () => {
    ctx.fillStyle = "#101820";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let y = 0; y < MAZE.length; y += 1) for (let x = 0; x < MAZE[y].length; x += 1) {
      const px = x * CELL, py = y * CELL;
      if (MAZE[y][x] === "#") {
        ctx.fillStyle = "#314a5a";
        ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
        ctx.strokeStyle = "#72909e";
        ctx.strokeRect(px + 5, py + 5, CELL - 10, CELL - 10);
        continue;
      }
      const pellet = state.pellets[y][x];
      if (pellet) {
        ctx.fillStyle = pellet === 2 ? "#f5c95b" : "#f0e8c7";
        ctx.beginPath();
        ctx.arc(px + CELL / 2, py + CELL / 2, pellet === 2 ? 7 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const [px, py] = state.player;
    const center = [px * CELL + CELL / 2, py * CELL + CELL / 2];
    const facing = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[state.direction];
    ctx.fillStyle = "#dfff73";
    ctx.beginPath();
    ctx.moveTo(...center);
    ctx.arc(...center, 14, facing + 0.32, facing + Math.PI * 2 - 0.32);
    ctx.closePath();
    ctx.fill();
    for (const ghost of state.ghosts) {
      const [gx, gy] = ghost.position;
      const cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2;
      ctx.fillStyle = state.powerSeconds > 0 ? "#6bb8d1" : "#e35b65";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, Math.PI, 0);
      ctx.lineTo(cx + 14, cy + 12);
      ctx.lineTo(cx + 7, cy + 8);
      ctx.lineTo(cx, cy + 12);
      ctx.lineTo(cx - 7, cy + 8);
      ctx.lineTo(cx - 14, cy + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f4f0dc";
      ctx.fillRect(cx - 6, cy - 4, 4, 5);
      ctx.fillRect(cx + 3, cy - 4, 4, 5);
    }
    $(`[data-score]`).textContent = String(state.score);
    $(`[data-left]`).textContent = String(state.remaining);
    $(`[data-lives]`).textContent = String(state.lives);
    $(`[data-best]`).textContent = String(best);
    $(`[data-message]`).textContent = state.powerSeconds > 0 ? `Power orb · ${Math.ceil(state.powerSeconds)} seconds` : "Arrows / WASD · P to pause · touch the direction pad";
  };

  const finish = () => {
    if (!["won", "over"].includes(state.mode)) return;
    window.clearInterval(timer);
    pause.disabled = true;
    draw();
    if (state.mode === "won") show("Maze cleared!", `${state.score} points · ${Math.floor(state.elapsed)} seconds.`, "Play again", restart);
    else show("The pursuer caught you.", `${state.score} points · ${state.remaining} dots left.`, "Try again", restart);
    if (state.score > 0) {
      if (getPlayerName()) void saveScore();
      else form.hidden = false;
    }
  };

  const tick = () => {
    if (disposed || state.mode !== "playing") return;
    state = stepMaze(state, { direction }, 0.16);
    if (state.score > best) {
      best = state.score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* Best score is optional. */ }
    }
    draw();
    finish();
  };

  const show = (title, copy, label, callback) => {
    $(`[data-title]`).textContent = title;
    $(`[data-copy]`).textContent = copy;
    action.textContent = label;
    action.onclick = callback;
    overlay.hidden = false;
  };

  const saveScore = async (value = getPlayerName()) => {
    const playerName = setPlayerName(value);
    if (!playerName) { $(`[data-save-status]`).textContent = "Enter a name or initials to save."; nameInput.focus(); return; }
    if (saved) return;
    const entry = recordLeaderboardScore("maze-chase", state.score, state.remaining, Math.floor(state.elapsed));
    if (!entry) return;
    saved = true;
    const online = window.HVNOnlineLeaderboard;
    if (!online?.configured) { $(`[data-save-status]`).textContent = `Saved in this browser as ${playerName}.`; return; }
    const result = await online.submit("maze-chase", { name: playerName, score: state.score, packets: state.remaining, seconds: Math.floor(state.elapsed), submissionId: online.submissionId("maze-chase", entry) });
    $(`[data-save-status]`).textContent = result.status === "online" ? `Saved on the shared board as ${playerName}.` : `Saved in this browser as ${playerName}.`;
  };

  function restart() {
    window.clearInterval(timer);
    state = createMazeRun();
    direction = "right";
    saved = false;
    form.hidden = true;
    pause.disabled = true;
    pause.textContent = "Pause";
    draw();
    show("Clear the lanes.", "Collect every dot. A power orb gives you time against the pursuer.", "Start chase", start);
  }

  function start() {
    if (state.mode !== "ready") state = createMazeRun();
    state.mode = "playing";
    saved = false;
    form.hidden = true;
    overlay.hidden = true;
    pause.disabled = false;
    pause.textContent = "Pause";
    window.clearInterval(timer);
    timer = window.setInterval(tick, 160);
  }

  function pauseGame() {
    if (state.mode === "playing") {
      state.mode = "paused";
      window.clearInterval(timer);
      pause.textContent = "Resume";
      show("Paused", "Your maze is safe while you take a break.", "Resume", resume);
    } else if (state.mode === "paused") resume();
  }

  function resume() {
    state.mode = "playing";
    overlay.hidden = true;
    pause.textContent = "Pause";
    timer = window.setInterval(tick, 160);
  }

  const changeDirection = (next) => {
    direction = next;
    state.queuedDirection = next;
    if (state.mode === "ready") start();
  };
  const onKeyDown = (event) => {
    if (event.target instanceof Element && event.target.closest("input, textarea, select")) return;
    const keyName = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const map = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
    if (map[keyName] && !event.repeat) { event.preventDefault(); changeDirection(map[keyName]); }
    else if ((keyName === "p" || keyName === "Escape") && !event.repeat) pauseGame();
  };

  action.onclick = start;
  pause.onclick = pauseGame;
  $(`[data-restart]`).onclick = restart;
  host.querySelectorAll("[data-dir]").forEach((button) => button.addEventListener("click", () => changeDirection(button.dataset.dir)));
  form.addEventListener("submit", (event) => { event.preventDefault(); void saveScore(nameInput.value); });
  window.addEventListener("keydown", onKeyDown);
  draw();

  return () => {
    disposed = true;
    window.clearInterval(timer);
    window.removeEventListener("keydown", onKeyDown);
  };
}
