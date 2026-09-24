import "./style.css";
import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { createMahjongRun, isMahjongFree, mahjongHint, removeMahjongPair, shuffleMahjongTiles, TILE_SIGNS } from "./rules.js";

export function mountMahjong(host) {
  host.innerHTML = `<section class="mahjong-game"><header data-hud></header><div class="mahjong-board" data-board></div><div class="mahjong-actions"><button data-hint>Show a match</button><button data-shuffle>Reshuffle</button><button data-restart>New layout</button></div><p data-status role="status"></p><form data-name hidden><label>Name<input maxlength="16"></label><button>Save score</button></form></section>`;
  let state = createMahjongRun(), seconds = 0, timer = 0, saved = false, hint = [];
  const board = host.querySelector("[data-board]"), status = host.querySelector("[data-status]");
  status.textContent = "Choose two matching tiles with an open side.";
  const score = () => Math.max(0, state.score * 10 - state.hints * 25 - seconds);
  const render = () => {
    board.innerHTML = state.tiles.filter((tile) => !tile.removed).map((tile) => {
      const free = isMahjongFree(state, tile);
      return `<button type="button" class="mahjong-tile ${free ? "free" : "blocked"} ${tile.id === state.selected ? "selected" : ""} ${hint.includes(tile.id) ? "hint" : ""}" data-tile="${tile.id}" style="--x:${tile.x};--y:${tile.y};--layer:${tile.layer}" aria-label="Tile ${tile.type + 1}${free ? ", open" : ", blocked"}" aria-disabled="${!free}"><span>${TILE_SIGNS[tile.type % TILE_SIGNS.length]}</span><small>${String(tile.type + 1).padStart(2, "0")}</small></button>`;
    }).join("");
    host.querySelector("[data-hud]").innerHTML = `<span>score <b>${score()}</b></span><span>tiles <b>${state.remaining}</b></span><span>time <b>${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}</b></span>`;
  };
  const save = async (name = getPlayerName()) => {
    const clean = setPlayerName(name); if (!clean || saved) return;
    const entry = recordLeaderboardScore("mahjong", score(), state.hints, seconds); if (!entry) return; saved = true;
    const online = window.HVNOnlineLeaderboard;
    const result = online?.configured ? await online.submit("mahjong", { name: clean, score: score(), packets: state.hints, seconds, submissionId: online.submissionId("mahjong", entry) }) : { status: "local" };
    status.textContent = result.status === "online" ? `Saved on the shared board as ${clean}.` : `Saved in this browser as ${clean}.`;
  };
  const choose = (id) => {
    const tile = state.tiles[id]; if (!isMahjongFree(state, tile)) { status.textContent = "That tile is covered or closed on both sides."; return; }
    if (state.selected === null) { state.selected = id; render(); return; }
    const first = state.tiles[state.selected];
    if (first.type === tile.type && first.id !== tile.id) {
      removeMahjongPair(state, first.id, tile.id); hint = []; status.textContent = state.mode === "won" ? `Garden cleared · ${score()} points.` : "Pair cleared. Choose another open tile."; render();
      if (state.mode === "won") { window.clearInterval(timer); if (getPlayerName()) void save(); else host.querySelector("[data-name]").hidden = false; }
    } else { state.selected = id; hint = []; status.textContent = "Choose a matching tile."; render(); }
  };
  board.addEventListener("click", (event) => { const tile = event.target.closest("[data-tile]"); if (tile) choose(Number(tile.dataset.tile)); });
  host.querySelector("[data-hint]").addEventListener("click", () => {
    hint = mahjongHint(state); state.hints += 1;
    status.textContent = hint.length ? "These two tiles can be matched." : "No matching open pair. Try a reshuffle."; render();
  });
  host.querySelector("[data-shuffle]").addEventListener("click", () => { shuffleMahjongTiles(state); state.score = Math.max(0, state.score - 1); hint = []; status.textContent = "Remaining tiles reshuffled."; render(); });
  host.querySelector("[data-restart]").addEventListener("click", () => { window.clearInterval(timer); state = createMahjongRun(); seconds = 0; saved = false; hint = []; status.textContent = "Choose two matching tiles with an open side."; host.querySelector("[data-name]").hidden = true; render(); timer = window.setInterval(tick, 1000); });
  host.querySelector("[data-name]").addEventListener("submit", (event) => { event.preventDefault(); void save(host.querySelector("[data-name] input").value); });
  function tick() { if (state.mode === "playing") { seconds += 1; state.elapsed = seconds; render(); } }
  timer = window.setInterval(tick, 1000);
  render();
  return () => window.clearInterval(timer);
}
