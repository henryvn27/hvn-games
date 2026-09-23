import { createGamePlaytimeTracker, getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { getPlantCounts, MATERIAL, newGame, nextTrial, placeMaterial, startGame, stepGame, TIDEPOOL, togglePause } from "./simulation.js";
import "./tidepool.css";

const BEST_KEY = "hvn-games:tidepool:best";
const COLORS = ["#eee8d4", "#c7a875", "#45acc0", "#706b5b", "#56845a"];
const MATERIALS = [[MATERIAL.SAND, "Sand"], [MATERIAL.WATER, "Water"], [MATERIAL.ROCK, "Rock"], [MATERIAL.KELP, "Kelp"]];

export function mountTidepool(host) {
  host.innerHTML = `<section class="tidepool" aria-label="Tidepool game">
    <div class="tidepool-bar"><div><span>Trial <b data-trial>1 / 3</b></span><span>Score <b data-score>0</b></span><span>Best <b data-best>0</b></span></div><button type="button" data-pause disabled>Pause</button></div>
    <div class="tidepool-board"><canvas data-canvas role="img" aria-label="Draw a shoreline, plant kelp and guide the tide"></canvas><div class="tidepool-overlay" data-overlay><div class="tidepool-card"><p data-eyebrow>Three tides. One small shore.</p><h2 data-title>Keep the kelp wet.</h2><p data-copy>Draw a shelf with sand, plant kelp on it, then guide the tide in. Keep enough plants alive until the trial ends.</p><p data-target>Trial 1 needs 2 mature kelp.</p><button type="button" data-action>Start trial</button><form data-name hidden><label for="tidepool-name">Name or initials for the Tidepool board<input id="tidepool-name" maxlength="16" autocomplete="nickname" placeholder="Your name or initials"></label><button type="submit">Save score</button></form><span data-status role="status" aria-live="polite"></span></div></div></div>
    <div class="tidepool-bottom"><div role="group" aria-label="Choose material" class="tidepool-tools">${MATERIALS.map(([id, name], i) => `<button type="button" data-tool="${id}" aria-pressed="${i === 0}"><i style="--swatch:${COLORS[id]}"></i>${name}<kbd>${i + 1}</kbd></button>`).join("")}</div><p>Draw a low sand shelf, then plant kelp on top. Drag to paint.</p></div>
  </section>`;
  const $ = (q) => host.querySelector(q);
  const canvas = $(`[data-canvas]`), ctx = canvas.getContext("2d", { alpha: false });
  const overlay = $(`[data-overlay]`), action = $(`[data-action]`), form = $(`[data-name]`), input = $(`#tidepool-name`), status = $(`[data-status]`);
  let state = newGame(), selected = MATERIAL.SAND, best = 0, saved = false, drawing = false, disposed = false, last = performance.now(), carry = 0, raf = 0, actionHandler = beginRun;
  let stopPlaytime = createGamePlaytimeTracker("tidepool");
  try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { /* browser storage can be disabled */ }

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    ctx.fillStyle = "#d9e8df"; ctx.fillRect(0, 0, w, h);
    const cw = w / TIDEPOOL.columns, ch = h / TIDEPOOL.rows;
    const level = h * (.82 - .08 * Math.sin(state.trialElapsed / TIDEPOOL.trials[state.trial].tidePeriod * Math.PI * 2));
    ctx.fillStyle = "rgba(69,172,192,.17)"; ctx.fillRect(0, level, w, h - level);
    for (let y = 1; y < TIDEPOOL.rows - 1; y++) for (let x = 1; x < TIDEPOOL.columns - 1; x++) {
      const i = y * TIDEPOOL.columns + x, material = state.cells[i];
      if (!material) continue;
      if (material !== MATERIAL.KELP) {
        ctx.fillStyle = COLORS[material]; const pad = Math.max(.4, Math.min(cw, ch) * .09);
        ctx.fillRect(x * cw + pad, y * ch + pad, Math.max(1, cw - 2 * pad), Math.max(1, ch - 2 * pad));
      }
    }
    const plants = getPlantCounts(state);
    host.dataset.plants = String(plants.mature);
    for (let y = 1; y < TIDEPOOL.rows - 1; y++) for (let x = 1; x < TIDEPOOL.columns - 1; x++) {
      const i = y * TIDEPOOL.columns + x;
      if (state.cells[i] !== MATERIAL.KELP) continue;
      ctx.strokeStyle = state.plantWet[i] >= 50 ? "#236644" : "#56845a";
      ctx.lineWidth = Math.max(1.2, cw * .34);
      ctx.beginPath(); ctx.moveTo((x + .5) * cw, (y + .9) * ch);
      ctx.lineTo((x + .5) * cw, (y + .1) * ch); ctx.stroke();
    }
    $(`[data-trial]`).textContent = `${state.trial + 1} / ${TIDEPOOL.trials.length}`;
    $(`[data-score]`).textContent = String(state.score);
    $(`[data-best]`).textContent = String(best);
    $(`[data-target]`).textContent = `${plants.mature} mature · ${plants.living} growing · need ${TIDEPOOL.trials[state.trial].target}`;
  }

  function show(title, copy, label, callback, eyebrow = "Three tides. One small shore.") {
    $(`[data-title]`).textContent = title;
    $(`[data-copy]`).textContent = copy;
    $(`[data-eyebrow]`).textContent = eyebrow;
    action.textContent = label; actionHandler = callback; overlay.hidden = false;
  }

  function saveScore() {
    if (saved || state.score <= 0) return;
    const name = getPlayerName();
    if (!name) { form.hidden = false; status.textContent = "Add your name or initials to save this score."; input.focus(); return; }
    const plants = getPlantCounts(state);
    const entry = recordLeaderboardScore("tidepool", state.score, plants.mature, Math.floor(state.elapsed));
    if (!entry) { status.textContent = "Could not save this score in this browser."; return; }
    saved = true;
    const online = window.HVNOnlineLeaderboard;
    if (!online?.configured) { status.textContent = `Saved as ${name} in this browser.`; return; }
    void online.submit("tidepool", { name, score: state.score, packets: plants.mature, seconds: Math.floor(state.elapsed), submissionId: online.submissionId("tidepool", entry) })
      .then((result) => { status.textContent = result.status === "online" ? `Saved as ${name} on the shared Tidepool board.` : `Saved as ${name} here. The shared board could not be reached.`; })
      .catch(() => { status.textContent = `Saved as ${name} here. The shared board could not be reached.`; });
  }

  function finishTrial() {
    if (state.mode === "between") {
      show("Nice. The next tide comes in faster.", "Carry your points forward. Shape the shelf wider before planting.", "Next trial", () => { state = nextTrial(state); overlay.hidden = true; draw(); });
      return;
    }
    if (state.mode !== "won" && state.mode !== "over") return;
    best = Math.max(best, state.score);
    try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* browser storage is optional */ }
    const won = state.mode === "won";
    show(won ? "The shore held." : "The tide took the garden.", `${state.score} points. ${getPlantCounts(state).mature} kelp made it through.`, "Play again", beginRun, won ? "All three trials cleared" : "Trial ended");
    if (state.score > 0 && getPlayerName()) saveScore();
    else if (state.score > 0) { form.hidden = false; status.textContent = "Add a name once to save scores to the board."; }
    else status.textContent = "Try a wider shelf so the water can reach the kelp.";
  }

  function paintAt(event) {
    if (state.mode !== "active") return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / rect.width * TIDEPOOL.columns);
    const y = Math.floor((event.clientY - rect.top) / rect.height * TIDEPOOL.rows);
    const result = placeMaterial(state, x, y, selected);
    if (result.placed) { state = result.state; draw(); }
  }

  function frame(now) {
    if (disposed) return;
    carry += Math.min(.1, (now - last) / 1000); last = now;
    if (state.mode === "active") {
      let changed = false;
      while (carry >= 1 / 30 && state.mode === "active") { state = stepGame(state, 1 / 30); carry -= 1 / 30; changed = true; }
      if (changed) { draw(); if (state.mode !== "active") finishTrial(); }
    }
    raf = requestAnimationFrame(frame);
  }

  action.addEventListener("click", () => actionHandler());
  function beginRun() {
    $(`[data-pause]`).disabled = false;
    state = startGame(state.mode === "ready" ? state : newGame());
    saved = false; status.textContent = ""; form.hidden = true; overlay.hidden = true;
    stopPlaytime(); stopPlaytime = createGamePlaytimeTracker("tidepool");
    window.Shelf?.record("game_play", { id: "tidepool" }); draw();
  }
  actionHandler = beginRun;
  $(`[data-pause]`).addEventListener("click", (event) => {
    const pauseButton = event.currentTarget;
    state = togglePause(state);
    pauseButton.disabled = !["active", "paused"].includes(state.mode);
    pauseButton.textContent = state.mode === "paused" ? "Resume" : "Pause";
    if (state.mode === "paused") show("Tide paused.", "Nothing moves until you resume.", "Resume", () => { state = togglePause(state); pauseButton.textContent = "Pause"; overlay.hidden = true; });
    else overlay.hidden = true;
  });
  host.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => {
    selected = Number(button.dataset.tool);
    host.querySelectorAll("[data-tool]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  }));
  canvas.addEventListener("pointerdown", (event) => { drawing = true; canvas.setPointerCapture(event.pointerId); paintAt(event); });
  canvas.addEventListener("pointermove", (event) => { if (drawing) paintAt(event); });
  canvas.addEventListener("pointerup", () => { drawing = false; });
  canvas.addEventListener("pointercancel", () => { drawing = false; });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!setPlayerName(input.value)) { status.textContent = "Use your own name or initials, not the example tag."; input.focus(); return; }
    form.hidden = true; saveScore();
  });
  const onKey = (event) => {
    if (["1", "2", "3", "4"].includes(event.key)) host.querySelector(`[data-tool="${MATERIALS[Number(event.key) - 1][0]}"]`)?.click();
    else if (event.key.toLowerCase() === "p" || event.key === "Escape") $(`[data-pause]`).click();
  };
  window.addEventListener("keydown", onKey);
  const observer = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  });
  observer.observe(canvas);
  raf = requestAnimationFrame(frame);
  return () => { disposed = true; cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener("keydown", onKey); stopPlaytime(); };
}
