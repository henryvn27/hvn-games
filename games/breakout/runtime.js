import "./style.css";
import { createBreakoutRun, stepBreakout } from "./simulation.js";
import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";

export function mountSpookyball(host) {
  host.innerHTML = `<section class="breakout-game"><canvas width="640" height="440" aria-label="Spookyball. Move with arrow keys or A and D."></canvas></section>`;
  host.insertAdjacentHTML("beforeend", `<p><strong data-score>0</strong> points · <strong data-bricks>50</strong> bricks · <strong data-lives>3</strong> balls</p><div class="breakout-controls"><button data-left type="button" aria-label="Move paddle left">←</button><button data-start type="button">Start game</button><button data-right type="button" aria-label="Move paddle right">→</button><button data-pause type="button">Pause</button><button data-restart type="button">Restart</button></div><p class="breakout-status" data-status role="status" aria-live="polite">Use ← → or A / D to move the paddle.</p>`);
  const canvas = host.querySelector("canvas"), ctx = canvas.getContext("2d");
  host.insertAdjacentHTML("beforeend", `<form data-name hidden><label>Name or initials<input maxlength="16" autocomplete="nickname"></label><button type="submit">Save score</button><span data-save-status role="status"></span></form>`);
  let run = createBreakoutRun(), frame = 0, disposed = false, saved = false;
  const draw = () => {
    ctx.fillStyle = "#14262a"; ctx.fillRect(0, 0, 640, 440);
    run.bricks.forEach((brick) => { if (!brick.alive) return; ctx.fillStyle = ["#e1a84b", "#d86f57", "#b35b69", "#747ab3", "#51a38e"][brick.row]; ctx.fillRect(brick.x, brick.y, brick.width, brick.height); });
    ctx.fillStyle = "#eaf0dc"; ctx.fillRect(run.paddleX - 47, 410, 94, 12);
    ctx.fillStyle = "#f7d56b"; ctx.beginPath(); ctx.arc(run.ballX, run.ballY, 8, 0, Math.PI * 2); ctx.fill();
    host.querySelector("[data-score]").textContent = String(run.score);
    host.querySelector("[data-bricks]").textContent = String(run.bricks.filter((brick) => brick.alive).length);
    host.querySelector("[data-lives]").textContent = String(run.lives);
  };
  const save = async (name = getPlayerName()) => {
    const clean = setPlayerName(name); if (!clean || saved) return;
    const packets = 50 - run.bricks.filter((brick) => brick.alive).length;
    const entry = recordLeaderboardScore("spookyball", run.score, packets, Math.floor(run.elapsed));
    if (!entry) return; saved = true;
    const online = window.HVNOnlineLeaderboard;
    const result = online?.configured ? await online.submit("spookyball", { name: clean, score: run.score, packets, seconds: Math.floor(run.elapsed), submissionId: online.submissionId("spookyball", entry) }) : { status: "local" };
    host.querySelector("[data-save-status]").textContent = result.status === "online" ? `Saved on the shared board as ${clean}.` : `Saved in this browser as ${clean}.`;
  };
  const tick = () => {
    if (disposed || run.mode !== "playing") return;
    run = stepBreakout(run, { left: keys.has("left"), right: keys.has("right") }, 1 / 60); draw();
    if (run.mode === "won" || run.mode === "over") {
      host.querySelector("[data-status]").textContent = run.mode === "won" ? `Haunted wall cleared · ${run.score} points.` : `Last life · ${run.score} points.`;
      host.querySelector("[data-start]").textContent = "Play again";
      if (run.score > 0) { if (getPlayerName()) void save(); else host.querySelector("[data-name]").hidden = false; }
    }
    else if (run.mode === "ready") { host.querySelector("[data-status]").textContent = `Ball lost · ${run.lives} remain.`; host.querySelector("[data-start]").textContent = "Serve again"; }
    else frame = requestAnimationFrame(tick);
  };
  const keys = new Set();
  const start = () => { if (run.mode === "playing") return; if (run.mode === "won" || run.mode === "over") { run = createBreakoutRun(); saved = false; host.querySelector("[data-name]").hidden = true; } run.mode = "playing"; host.querySelector("[data-status]").textContent = "Use ← → or A / D to move the paddle."; host.querySelector("[data-pause]").textContent = "Pause"; frame = requestAnimationFrame(tick); };
  const keydown = (event) => { const key = { ArrowLeft: "left", ArrowRight: "right", a: "left", d: "right" }[event.key.length === 1 ? event.key.toLowerCase() : event.key]; if (key) { keys.add(key); event.preventDefault(); if (run.mode === "ready") start(); } };
  const keyup = (event) => { const key = { ArrowLeft: "left", ArrowRight: "right", a: "left", d: "right" }[event.key.length === 1 ? event.key.toLowerCase() : event.key]; if (key) keys.delete(key); };
  window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup);
  host.querySelector("[data-name]").addEventListener("submit", (event) => { event.preventDefault(); void save(host.querySelector("[data-name] input").value); });
  host.querySelector("[data-start]").addEventListener("click", start);
  host.querySelector("[data-left]").onpointerdown = () => keys.add("left");
  host.querySelector("[data-left]").onpointerup = () => keys.delete("left");
  host.querySelector("[data-right]").onpointerdown = () => keys.add("right");
  host.querySelector("[data-right]").onpointerup = () => keys.delete("right");
  host.querySelector("[data-pause]").addEventListener("click", () => {
    if (run.mode === "playing") { run.mode = "paused"; cancelAnimationFrame(frame); host.querySelector("[data-pause]").textContent = "Resume"; host.querySelector("[data-status]").textContent = "Paused. The ball will hold here."; }
    else if (run.mode === "paused") start();
  });
  host.querySelector("[data-restart]").addEventListener("click", () => { cancelAnimationFrame(frame); run = createBreakoutRun(); saved = false; host.querySelector("[data-name]").hidden = true; host.querySelector("[data-start]").textContent = "Start game"; start(); });
  draw();
  return () => { disposed = true; cancelAnimationFrame(frame); window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); };
}
