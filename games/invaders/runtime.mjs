import Phaser from "phaser";
import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { newRun, startRun, stepRun, togglePause } from "./simulation.js";
const BEST_KEY = "hvn-games:invaders:best";
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };

export function mountInvaders(host) {
  host.innerHTML = `<section class="invaders"><div class="invaders-head"><div class="invaders-stat">score <strong data-score>0</strong></div><div class="invaders-stat">wave <strong data-wave>1</strong></div><div class="invaders-stat">lives <strong data-lives>● ● ●</strong></div><div class="invaders-stat">best <strong data-best>0</strong></div><button class="invaders-pause" data-pause disabled>Pause</button></div><div class="invaders-stage"><div class="invaders-canvas" data-canvas></div><div class="invaders-overlay" data-overlay><h2 data-title>Hold the line.</h2><p data-copy>Move, fire, and clear the ships before they reach the moon relay.</p><button class="invaders-action" data-action>Start defense</button><form class="invaders-name" data-name hidden><label for="invaders-name">Name or initials<input id="invaders-name" maxlength="16" autocomplete="nickname"></label><button type="submit">Save score</button><p data-status role="status"></p></form></div></div><div class="invaders-controls"><button data-left aria-label="Move left">←</button><button data-right aria-label="Move right">→</button><button data-fire>Fire</button></div><p class="invaders-help">A/D or arrows to move · Space to fire · P to pause</p></section>`;
  const $ = (s) => host.querySelector(s);
  const overlay = $("[data-overlay]"), action = $("[data-action]"), pause = $("[data-pause]");
  const scoreNode = $("[data-score]");
  const waveNode = $("[data-wave]"), livesNode = $("[data-lives]"), bestNode = $("[data-best]");
  const form = $("[data-name]"), name = $("#invaders-name");
  let state = newRun(), lastMode = "ready", lastWave = 1, best = readBest(), saved = false, touch = { left: false, right: false, fire: false }, tap = { left: false, right: false, fire: false };
  const heldKeys = new Set();
  const start = () => { state = startRun(); saved = false; lastWave = 1; form.hidden = true; lastMode = "active"; overlay.hidden = true; pause.disabled = false; pause.textContent = "Pause"; window.Shelf?.record("game_play", { id: "invaders" }); };
  const save = async (value) => {
    const playerName = setPlayerName(value);
    if (!playerName) { $("[data-status]").textContent = "Enter your own initials or name."; name.focus(); return; }
    const entry = recordLeaderboardScore("invaders", state.score, state.wave, Math.floor(state.elapsed));
    if (!entry) return;
    saved = true;
    const online = window.HVNOnlineLeaderboard;
    if (online?.configured) {
      const result = await online.submit("invaders", { name: playerName, score: state.score, packets: state.wave, seconds: Math.floor(state.elapsed), submissionId: online.submissionId("invaders", entry) });
      $("[data-status]").textContent = result.status === "online" ? `Saved as ${playerName} on the shared board.` : `Saved in this browser as ${playerName}.`;
    } else $("[data-status]").textContent = `Saved in this browser as ${playerName}.`;
  };
  form.addEventListener("submit", (event) => { event.preventDefault(); void save(name.value); });
  const finish = () => {
    if (saved || state.score < 1) return;
    const playerName = getPlayerName();
    if (playerName) void save(playerName);
    else form.hidden = false;
  };
  action.onclick = start;
  const show = (title, copy, label, callback) => {
    $("[data-title]").textContent = title;
    $("[data-copy]").textContent = copy;
    action.textContent = label;
    action.onclick = callback;
    overlay.hidden = false;
  };
  const toggle = () => {
    const wasPaused = state.mode === "paused";
    state = togglePause(state);
    if (state.mode === "paused") {
      pause.textContent = "Resume";
      show("Paused", "Nothing moves until you’re ready.", "Resume", () => { state = togglePause(state); overlay.hidden = true; pause.textContent = "Pause"; });
    } else if (wasPaused) { overlay.hidden = true; pause.textContent = "Pause"; }
  };
  pause.onclick = toggle;
  const bind = (selector, key) => {
    const button = $(selector);
    button.addEventListener("pointerdown", (event) => { event.preventDefault(); touch[key] = true; tap[key] = true; });
    for (const type of ["pointerup", "pointercancel", "pointerleave"]) button.addEventListener(type, () => { touch[key] = false; });
  };
  bind("[data-left]", "left"); bind("[data-right]", "right"); bind("[data-fire]", "fire");
  const onKeyDown = (event) => {
    if (event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable=true]")) return;
    if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) toggle();
    if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(event.code)) {
      heldKeys.add(event.code);
      if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    }
  };
  const onKeyUp = (event) => { heldKeys.delete(event.code); };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  class RelayScene extends Phaser.Scene {
    create() { this.g = this.add.graphics(); }
    update(_time, delta) {
      if (state.mode === "active") {
        state = stepRun(state, { left: heldKeys.has("ArrowLeft") || heldKeys.has("KeyA") || touch.left || tap.left, right: heldKeys.has("ArrowRight") || heldKeys.has("KeyD") || touch.right || tap.right, fire: heldKeys.has("Space") || touch.fire || tap.fire }, delta / 1000);
        tap = { left: false, right: false, fire: false };
      }
      this.draw();
      scoreNode.textContent = String(state.score);
      waveNode.textContent = String(state.wave);
      livesNode.textContent = state.lives ? "● ".repeat(state.lives).trim() : "—";
      if (state.score > best) { best = state.score; try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* Best score is optional. */ } }
      bestNode.textContent = String(best);
      if (state.wave > lastWave) { lastWave = state.wave; window.Shelf?.record("invaders_wave", { wave: state.wave - 1 }); }
      pause.disabled = state.mode === "ready" || state.mode === "over";
      if (state.mode === "over" && lastMode !== "over") show("Relay lost.", `Wave ${state.wave} · ${state.score} points.`, "Try again", start);
      if (state.mode === "over" && lastMode !== "over") finish();
      lastMode = state.mode;
    }
    draw() {
      const g = this.g;
      g.clear(); g.fillStyle(0x11191b, 1); g.fillRect(0, 0, 960, 540);
      g.fillStyle(0x77847d, .55);
      for (let i = 0; i < 42; i += 1) g.fillCircle((i * 197 + 31) % 950 + 5, (i * 83 + 23) % 345 + 12, i % 7 ? 1 : 2);
      g.fillStyle(0x222d2c, 1); g.fillEllipse(480, 530, 1100, 260);
      g.fillStyle(0x52605a, 1); g.fillEllipse(480, 550, 1000, 210);
      g.fillStyle(0xc4d77d, 1); g.fillRect(446, 488, 68, 10); g.fillRect(475, 463, 10, 25);
      g.lineStyle(4, 0xc4d77d, 1); g.strokeCircle(480, 461, 20);
      g.fillStyle(0x9eaa92, 1); g.fillRoundedRect(state.playerX - 22, 464, 44, 20, 5);
      g.fillTriangle(state.playerX - 11, 465, state.playerX, 447, state.playerX + 11, 465);
      g.fillStyle(0xc4d77d, 1); for (const shot of state.shots) g.fillRoundedRect(shot.x - 2, shot.y - 8, 4, 13, 2);
      g.fillStyle(0xe39a68, 1); for (const shot of state.enemyShots) g.fillTriangle(shot.x, shot.y + 7, shot.x - 4, shot.y - 4, shot.x + 4, shot.y - 4);
      for (const alien of state.formation.aliens) if (alien.alive) {
        const colors = [0xb6cb84, 0xc58a76, 0x8ab3a4, 0xcbbd83];
        g.fillStyle(colors[alien.row], 1); g.fillRoundedRect(alien.x - 18, alien.y - 11, 36, 22, 6);
        g.fillRect(alien.x - 22, alien.y - 5, 5, 12); g.fillRect(alien.x + 17, alien.y - 5, 5, 12);
        g.fillStyle(0x202727, 1); g.fillCircle(alien.x - 7, alien.y - 1, 2); g.fillCircle(alien.x + 7, alien.y - 1, 2);
      }
    }
  }
  new Phaser.Game({ type: Phaser.AUTO, parent: $("[data-canvas]"), width: 960, height: 540, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: RelayScene, backgroundColor: "#11191b" });
}
