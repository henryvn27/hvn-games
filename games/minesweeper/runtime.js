import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { createGame, revealCell, tick, toggleFlag } from "./rules.js";
import "./minesweeper.css";

const MODE_NAMES = { easy: "Easy", normal: "Standard", hard: "Hard" };
const SCORE_BASE = { easy: 1800, normal: 3000, hard: 4500 };

export function mountMinesweeper(host) {
  host.innerHTML = `
    <section class="minesweeper" aria-label="Minesweeper">
      <div class="mine-toolbar">
        <label>Board<select data-mode aria-label="Board size"><option value="easy">Easy · 8 × 8</option><option value="normal" selected>Standard · 10 × 10</option><option value="hard">Hard · 12 × 10</option></select></label>
        <div class="mine-count" aria-label="Mines left"><span>mines</span><strong data-count>18</strong></div>
        <div class="mine-count"><span>time</span><strong data-time>0:00</strong></div>
        <button class="mine-flag-mode" type="button" data-flag aria-pressed="false">Flag mode</button>
        <button type="button" data-pause>Pause</button>
        <button type="button" data-reset>New board</button>
      </div>
      <p class="mine-instructions" data-instructions>Pick any square. The first one clears a patch. Numbers count touching mines.</p>
      <div class="mine-board" data-board role="group" aria-label="Minefield"></div>
      <div class="mine-footer"><span data-status role="status" aria-live="polite">Mark mines with right-click, F, or Flag mode.</span><span data-best>Best: —</span></div>
      <section class="mine-result" data-result hidden aria-live="polite">
        <div><h2 data-result-title></h2><p data-result-copy></p></div>
        <form data-score-form hidden>
          <label for="mine-player-name">Name on the Minesweeper board</label>
          <div><input id="mine-player-name" maxlength="16" autocomplete="nickname" placeholder="Your name or initials"><button type="submit">Save score</button></div>
        </form>
        <p class="mine-score-status" data-score-status role="status"></p>
        <button type="button" data-again>Play again</button>
      </section>
      <p class="mine-help">Click to open · right-click or F to mark · click a number to clear around it</p>
    </section>`;

  const $ = (selector) => host.querySelector(selector);
  const board = $("[data-board]");
  const modePicker = $("[data-mode]");
  const flagButton = $("[data-flag]");
  const resultPanel = $("[data-result]");
  const form = $("[data-score-form]");
  const nameInput = $("#mine-player-name");
  let state = createGame(modePicker.value);
  let flagMode = false;
  let paused = false;
  let focusId = 0;
  let interval = 0;
  let bestTime = readBest(state.mode);
  let savedThisRun = false;
  let disposed = false;

  function readBest(mode) {
    try {
      const stored = localStorage.getItem(`hvn-games:minesweeper:${mode}:best`);
      if (stored === null) return null;
      const value = Number(stored);
      return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
    } catch { return null; }
  }

  function writeBest() {
    bestTime = bestTime === null ? state.elapsed : Math.min(bestTime, state.elapsed);
    try { localStorage.setItem(`hvn-games:minesweeper:${state.mode}:best`, String(bestTime)); } catch { /* A local record is optional. */ }
  }

  function timeLabel(seconds) {
    const value = Math.floor(seconds);
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  }

  function render() {
    if (disposed) return;
    $("[data-count]").textContent = String(Math.max(0, state.mineTotal - state.flags.filter(Boolean).length));
    $("[data-time]").textContent = timeLabel(state.elapsed);
    $("[data-best]").textContent = bestTime !== null ? `Best: ${timeLabel(bestTime)}` : "Best: —";
    board.style.setProperty("--mine-columns", state.width);
    board.style.setProperty("--mine-rows", state.height);
    board.setAttribute("aria-label", `${MODE_NAMES[state.mode]} minefield, ${state.height} rows and ${state.width} columns`);
    board.innerHTML = state.revealed.map((clue, id) => {
      const flagged = state.flags[id];
      const lostCell = state.result === "lost" && id === state.lastMove;
      const label = clue >= 0 ? (clue === 0 ? "Clear square" : `${clue}, ${clue === 1 ? "one mine" : `${clue} mines`} nearby`) : flagged ? "Marked as a mine" : "Covered square";
      const classes = ["mine-cell", clue >= 0 ? "is-open" : "is-covered", clue > 0 ? `clue-${clue}` : "", flagged ? "is-flagged" : "", lostCell ? "is-hit" : ""].filter(Boolean).join(" ");
      return `<button class="${classes}" type="button" data-cell="${id}" aria-label="Row ${Math.floor(id / state.width) + 1}, column ${id % state.width + 1}: ${label}" tabindex="${id === focusId ? "0" : "-1"}" ${paused || state.result === "won" || state.result === "lost" ? "disabled" : ""}>${flagged ? "⚑" : clue > 0 ? clue : ""}</button>`;
    }).join("");
    const cells = [...board.querySelectorAll("[data-cell]")];
    if (cells.length && !cells.some((cell) => Number(cell.dataset.cell) === focusId)) cells[0].tabIndex = 0;
    board.classList.toggle("is-finished", state.result === "won" || state.result === "lost");
    flagButton.setAttribute("aria-pressed", String(flagMode));
    flagButton.textContent = flagMode ? "Flag mode on" : "Flag mode";
    const active = state.result === "playing" || state.result === "ready";
    $("[data-instructions]").textContent = paused ? "Paused. The board and timer are stopped." : state.solverStalled ? "That position took too long to check. Try another square or start a new board." : state.result === "ready"
      ? "Pick any square. The first one clears a patch. Numbers count touching mines."
      : state.result === "playing"
        ? "Use the numbers. A guess can end the run while a safe square is certain."
        : state.result === "lost"
          ? "That guess could have been a mine while a safe square was available."
          : "Board cleared.";
    resultPanel.hidden = active;
    if (state.result === "won") {
      $("[data-result-title]").textContent = "Board cleared.";
      $("[data-result-copy]").textContent = `${MODE_NAMES[state.mode]} board · ${timeLabel(state.elapsed)} · ${scoreFor(state)} points`;
    } else if (state.result === "lost") {
      $("[data-result-title]").textContent = "Mine.";
      $("[data-result-copy]").textContent = "A sure thing was still on the board.";
    }
  }

  function scoreFor(run) { return Math.max(1, SCORE_BASE[run.mode] - Math.floor(run.elapsed)); }

  async function saveScore() {
    if (savedThisRun || state.result !== "won") return;
    const name = getPlayerName() || setPlayerName(nameInput.value);
    if (!name) {
      $("[data-score-status]").textContent = "Enter your name or initials first.";
      nameInput.focus();
      return;
    }
    if (!getPlayerName()) {
      $("[data-score-status]").textContent = "Enter a name that is yours, not the example tag.";
      return;
    }
    const score = scoreFor(state);
    const entry = recordLeaderboardScore("minesweeper", score, state.revealed.filter((clue) => clue >= 0).length, Math.floor(state.elapsed));
    if (!entry) {
      $("[data-score-status]").textContent = "Could not save this score in the browser.";
      return;
    }
    savedThisRun = true;
    form.hidden = true;
    const online = window.HVNOnlineLeaderboard;
    if (!online?.configured) {
      $("[data-score-status]").textContent = `Saved as ${name} in this browser.`;
      return;
    }
    try {
      const response = await online.submit("minesweeper", {
        name,
        score,
        packets: state.revealed.filter((clue) => clue >= 0).length,
        seconds: Math.floor(state.elapsed),
        submissionId: online.submissionId("minesweeper", entry),
      });
      $("[data-score-status]").textContent = response.status === "online"
        ? `Saved as ${name}. It’s on the shared Minesweeper board.`
        : `Saved as ${name} here. The shared board could not be reached.`;
    } catch {
      $("[data-score-status]").textContent = `Saved as ${name} here. The shared board could not be reached.`;
    }
  }

  function finishIfNeeded(previousResult) {
    if (state.result === previousResult) return;
    if (state.result === "won") {
      clearInterval(interval);
      writeBest();
      window.Shelf?.record("minesweeper_win", {});
      const playerName = getPlayerName();
      if (!playerName) {
        form.hidden = false;
        $("[data-score-status]").textContent = "Add a name once to save scores to the board.";
        nameInput.focus();
      } else void saveScore();
    } else if (state.result === "lost") clearInterval(interval);
  }

  function chooseCell(id, mark = flagMode) {
    if (paused || state.result === "won" || state.result === "lost") return;
    const hadFocus = board.contains(document.activeElement);
    focusId = id;
    const before = state.result;
    state = mark ? toggleFlag(state, id) : revealCell(state, id);
    render();
    if (hadFocus) board.querySelector(`[data-cell="${id}"]`)?.focus();
    finishIfNeeded(before);
  }

  function reset(mode = modePicker.value) {
    clearInterval(interval);
    state = createGame(mode);
    paused = false;
    focusId = 0;
    bestTime = readBest(mode);
    savedThisRun = false;
    form.hidden = true;
    $("[data-score-status]").textContent = "";
    interval = window.setInterval(() => {
      if (!paused && state.result === "playing") { state = tick(state); render(); }
    }, 1000);
    render();
  }

  board.addEventListener("click", (event) => {
    const cell = event.target.closest("[data-cell]");
    if (cell) chooseCell(Number(cell.dataset.cell));
  });
  board.addEventListener("contextmenu", (event) => {
    const cell = event.target.closest("[data-cell]");
    if (!cell) return;
    event.preventDefault();
    chooseCell(Number(cell.dataset.cell), true);
  });
  board.addEventListener("keydown", (event) => {
    const cell = event.target.closest("[data-cell]");
    if (!cell) return;
    const id = Number(cell.dataset.cell);
    const column = id % state.width;
    const destinations = { ArrowLeft: column === 0 ? id : id - 1, ArrowRight: column === state.width - 1 ? id : id + 1, ArrowUp: id - state.width, ArrowDown: id + state.width };
    if (Object.hasOwn(destinations, event.key)) {
      event.preventDefault();
      const next = Math.max(0, Math.min(state.revealed.length - 1, destinations[event.key]));
      focusId = next;
      board.querySelector(`[data-cell="${next}"]`)?.focus();
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      chooseCell(id, true);
      board.querySelector(`[data-cell="${id}"]`)?.focus();
    }
  });
  modePicker.addEventListener("change", () => reset(modePicker.value));
  flagButton.addEventListener("click", () => {
    flagMode = !flagMode;
    render();
    flagButton.focus();
  });
  $("[data-pause]").addEventListener("click", (event) => {
    paused = !paused;
    event.currentTarget.textContent = paused ? "Resume" : "Pause";
    render();
    event.currentTarget.focus();
  });
  $("[data-reset]").addEventListener("click", () => reset());
  $("[data-again]").addEventListener("click", () => reset());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!setPlayerName(nameInput.value)) {
      $("[data-score-status]").textContent = "Use your own name or initials, not the example tag.";
      nameInput.focus();
      return;
    }
    void saveScore();
  });
  interval = window.setInterval(() => {
    if (!paused && state.result === "playing") { state = tick(state); render(); }
  }, 1000);
  render();
  return () => { disposed = true; clearInterval(interval); board.replaceChildren(); };
}
