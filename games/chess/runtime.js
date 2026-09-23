import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { Chess } from "chess.js";
import { canPossiblyMate, chooseComputerMove, describeResult, MATCH_SECONDS } from "./rules.js";
import "./chess.css";

const SYMBOLS = Object.freeze({
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
});
const NAMES = Object.freeze({ k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" });
const FILES = "abcdefgh";
const BEST_KEY = "hvn-games:chess:best-ladder";

function readBest() {
  try { return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch { return 0; }
}

function squareList() {
  return Array.from({ length: 64 }, (_unused, index) => `${FILES[index % 8]}${8 - Math.floor(index / 8)}`);
}

function clockLabel(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function readCaptured(history, color) {
  const material = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  for (const move of history) {
    if (move.color !== color || !move.captured) continue;
    material[move.captured] += 1;
  }
  return Object.entries(material).flatMap(([type, count]) => Array.from({ length: count }, () => SYMBOLS[color][type]));
}

export function mountChess(host) {
  host.innerHTML = `
    <section class="chess-game" aria-label="Chess">
      <div class="chess-status-bar" role="group" aria-label="Match status">
        <div class="chess-turn"><span data-turn-color class="chess-turn-mark" aria-hidden="true"></span><div><strong data-turn>White to move</strong><small data-status>Choose a mode to start.</small></div></div>
        <div class="chess-clock-row" aria-label="Clocks"><div data-clock-box="b"><small>Black</small><strong data-clock="b">3:00</strong></div><div data-clock-box="w"><small>White</small><strong data-clock="w">3:00</strong></div></div>
        <button class="chess-small-button" type="button" data-pause disabled>Pause</button>
      </div>
      <div class="chess-layout">
        <div class="chess-board-column">
          <div class="chess-board" data-board role="grid" aria-label="Chess board"></div>
          <div class="chess-board-footer"><span data-captured="w" aria-label="Pieces captured by White"></span><span data-move-list>Moves will appear here.</span><span data-captured="b" aria-label="Pieces captured by Black"></span></div>
        </div>
        <aside class="chess-side">
          <section class="chess-side-section" aria-live="polite">
            <p class="chess-overline" data-round-label>READY</p>
            <h2 data-title>Take a seat.</h2>
            <p data-copy>Win a quick match to face a stronger opponent. Or pass the board to someone beside you.</p>
            <button class="chess-primary" type="button" data-start>Play the ladder</button>
            <button class="chess-secondary" type="button" data-local>Two players</button>
          </section>
          <dl class="chess-record">
            <div><dt>Wins this run</dt><dd data-wins>0</dd></div>
            <div><dt>Best run</dt><dd data-best>0</dd></div>
            <div><dt>Moves</dt><dd data-moves>0</dd></div>
          </dl>
          <div class="chess-promotion" data-promotion hidden role="group" aria-label="Choose a promotion piece">
            <span>Promote pawn to</span>
            <div><button type="button" data-promote="q" aria-label="Queen">♕</button><button type="button" data-promote="r" aria-label="Rook">♖</button><button type="button" data-promote="b" aria-label="Bishop">♗</button><button type="button" data-promote="n" aria-label="Knight">♘</button></div>
          </div>
          <form class="chess-name-form" data-name-form hidden>
            <label for="chess-player-name">Name or initials for the Chess board</label>
            <div><input id="chess-player-name" maxlength="16" autocomplete="nickname" placeholder="Your name or initials"><button type="submit">Save</button></div>
          </form>
          <p class="chess-save-status" data-save-status role="status" aria-live="polite"></p>
          <button class="chess-undo" type="button" data-undo disabled>Take back</button>
          <p class="chess-help">Tap a piece, then its square. Arrow keys move around the board; Enter selects. Press P to pause.</p>
        </aside>
      </div>
    </section>`;

  const $ = (selector) => host.querySelector(selector);
  const boardElement = $(`[data-board]`);
  const promotion = $(`[data-promotion]`);
  const nameForm = $(`[data-name-form]`);
  const nameInput = $(`#chess-player-name`);
  let game = new Chess();
  let mode = "ready";
  let session = "ladder";
  let selected = null;
  let legalTargets = [];
  let pendingPromotion = null;
  let wins = 0;
  let best = readBest();
  let time = { w: MATCH_SECONDS, b: MATCH_SECONDS };
  let elapsedTotal = 0;
  let focusedSquare = "e2";
  let lastMove = null;
  let botPending = false;
  let botTimer = 0;
  let savedThisRun = false;
  let disposed = false;

  function renderBoard(restoreFocus = false) {
    const checkSquare = game.isCheck() ? game.board().flatMap((row, rankIndex) => row.map((piece, file) => ({ piece, rankIndex, file }))).find(({ piece }) => piece?.type === "k" && piece.color === game.turn()) : null;
    const checkedKing = checkSquare ? `${FILES[checkSquare.file]}${8 - checkSquare.rankIndex}` : "";
    const targets = new Map(legalTargets.map((move) => [move.to, move]));
    boardElement.innerHTML = squareList().map((square, index) => {
      const piece = game.get(square);
      const fileIndex = index % 8;
      const isLast = lastMove && (square === lastMove.from || square === lastMove.to);
      const target = targets.get(square);
      const label = piece ? `${piece.color === "w" ? "White" : "Black"} ${NAMES[piece.type]} on ${square}` : `Empty ${square}`;
      return `<button class="chess-square ${(Math.floor(index / 8) + fileIndex) % 2 ? "is-dark" : "is-light"}${selected === square ? " is-selected" : ""}${isLast ? " is-last-move" : ""}${target ? " is-target" : ""}${target?.captured ? " is-capture" : ""}${checkedKing === square ? " is-check" : ""}" type="button" role="gridcell" data-square="${square}" aria-label="${label}${target ? ", legal move" : ""}" aria-pressed="${selected === square}" tabindex="${focusedSquare === square ? 0 : -1}"${fileIndex === 0 ? ` data-rank-label="${8 - Math.floor(index / 8)}"` : ""}${Math.floor(index / 8) === 7 ? ` data-file-label="${FILES[fileIndex]}"` : ""}>${piece ? `<span class="chess-piece ${piece.color === "w" ? "is-white" : "is-black"}" aria-hidden="true">${SYMBOLS[piece.color][piece.type]}</span>` : ""}</button>`;
    }).join("");
    if (restoreFocus) boardElement.querySelector(`[data-square="${focusedSquare}"]`)?.focus();
  }

  function render(restoreBoardFocus = false) {
    const active = mode === "active";
    const turn = game.turn();
    const humanTurn = session === "local" || turn === "w";
    const paused = mode === "paused";
    $(`[data-turn]`).textContent = paused ? "Paused" : `${turn === "w" ? "White" : "Black"} to move${game.isCheck() ? " · check" : ""}`;
    $(`[data-turn-color]`).className = `chess-turn-mark ${turn === "w" ? "is-white" : "is-black"}`;
    $(`[data-status]`).textContent = mode === "ready" ? "Choose a mode to start." : mode === "between" ? "Match won. The next opponent is ready." : mode === "over" ? "Run finished." : paused ? "Clock stopped." : session === "ladder" ? `Opponent ${Math.min(wins + 1, 4)} · you play White` : "Local game · pass the board after each move";
    $(`[data-title]`).textContent = mode === "ready" ? "Take a seat." : mode === "active" ? (session === "ladder" ? `Match ${wins + 1}` : "Your move") : mode === "paused" ? "Paused." : mode === "between" ? "You won." : "Run over.";
    $(`[data-copy]`).textContent = mode === "ready" ? "Win a quick match to face a stronger opponent. Or pass the board to someone beside you." : mode === "active" ? (session === "ladder" ? "Beat the computer. Each win makes it play a little sharper." : "Both sides use the same board. Take turns on this screen.") : mode === "paused" ? "The board and both clocks are stopped." : mode === "between" ? "One point on your run. Ready for the next table?" : session === "ladder" ? `${wins} ${wins === 1 ? "win" : "wins"} in a row. Start another run when you’re ready.` : "Start a new board when you’re ready.";
    $(`[data-round-label]`).textContent = mode === "ready" ? "READY" : session === "local" ? "LOCAL GAME" : `LADDER · ${String(wins + 1).padStart(2, "0")}`;
    $(`[data-wins]`).textContent = String(wins);
    $(`[data-best]`).textContent = String(best);
    $(`[data-moves]`).textContent = String(Math.ceil(game.history().length / 2));
    renderClocks();
    $(`[data-pause]`).disabled = !["active", "paused"].includes(mode);
    $(`[data-pause]`).textContent = paused ? "Resume" : "Pause";
    $(`[data-start]`).hidden = mode === "active" || mode === "paused" || mode === "between";
    $(`[data-start]`).textContent = mode === "over" ? "New ladder run" : mode === "between" ? "Next match" : "Play the ladder";
    $(`[data-local]`).hidden = mode === "active" || mode === "paused" || mode === "between";
    $(`[data-local]`).textContent = mode === "over" && session === "local" ? "New local game" : "Two players";
    $(`[data-undo]`).disabled = !active || botPending || game.history().length < (session === "ladder" ? 2 : 1);
    $(`[data-move-list]`).textContent = game.history().slice(-6).join(" · ") || "Moves will appear here.";
    for (const color of ["w", "b"]) $(`[data-captured="${color}"]`).textContent = readCaptured(game.history({ verbose: true }), color).join("");
    renderBoard(restoreBoardFocus);
  }

  function renderClocks() {
    const turn = game.turn();
    const active = mode === "active";
    for (const color of ["w", "b"]) {
      $(`[data-clock="${color}"]`).textContent = clockLabel(time[color]);
      $(`[data-clock-box="${color}"]`).classList.toggle("is-running", active && turn === color);
      $(`[data-clock-box="${color}"]`).classList.toggle("is-low", time[color] <= 30);
    }
  }

  function legalFrom(square) {
    return game.moves({ square, verbose: true });
  }

  function setSelection(square) {
    const piece = square ? game.get(square) : null;
    if (!piece || piece.color !== game.turn()) {
      selected = null;
      legalTargets = [];
    } else {
      selected = square;
      legalTargets = legalFrom(square);
    }
    focusedSquare = square || focusedSquare;
    renderBoard(true);
  }

  function finishRun(reason) {
    if (mode === "over") return;
    mode = "over";
    botPending = false;
    window.clearTimeout(botTimer);
    $(`[data-save-status]`).textContent = reason;
    render();
    saveScore();
  }

  function finishMatch(result) {
    if (session === "ladder") {
      if (result.winner === "w") {
        wins += 1;
        mode = "between";
        $(`[data-save-status]`).textContent = `${result.kind === "time" ? "Won on time" : "Checkmate"}. Win ${wins}.`;
        render();
        return;
      }
      finishRun(result.winner === "b" ? "The computer won this match." : result.kind === "time" ? "Time ran out. The match is a draw." : "Draw. The run ends here.");
      return;
    }
    mode = "over";
    const message = result.winner === "w" ? "White wins." : result.winner === "b" ? "Black wins." : "Draw.";
    $(`[data-save-status]`).textContent = result.kind === "mate" ? `${message} Checkmate.` : `${message} ${result.kind === "time" ? "Time ran out." : ""}`;
    render();
  }

  function commitMove(from, to, promotionType = "q") {
    const legal = legalTargets.find((move) => move.to === to);
    if (!legal) return false;
    const move = game.move({ from, to, ...(legal.promotion ? { promotion: promotionType } : {}) });
    lastMove = { from: move.from, to: move.to };
    selected = null;
    legalTargets = [];
    pendingPromotion = null;
    promotion.hidden = true;
    focusedSquare = to;
    const outcome = describeResult(game, session === "ladder" ? "w" : "w");
    if (outcome) {
      finishMatch({ winner: outcome.winner, kind: outcome.kind });
      return true;
    }
    render(true);
    if (session === "ladder" && game.turn() === "b") scheduleComputer();
    return true;
  }

  function handleSquare(square) {
    if (mode !== "active" || (session === "ladder" && game.turn() !== "w")) return;
    focusedSquare = square;
    const target = legalTargets.find((move) => move.to === square);
    if (selected && target) {
      if (target.promotion) {
        pendingPromotion = { from: selected, to: square };
        promotion.hidden = false;
        promotion.querySelector("button")?.focus();
      } else commitMove(selected, square);
      return;
    }
    const piece = game.get(square);
    if (piece?.color === game.turn() && (session === "local" || piece.color === "w")) setSelection(square);
    else if (selected) setSelection("");
  }

  function scheduleComputer() {
    if (mode !== "active" || session !== "ladder" || game.turn() !== "b") return;
    botPending = true;
    $(`[data-undo]`).disabled = true;
    botTimer = window.setTimeout(() => {
      botTimer = 0;
      if (disposed || mode !== "active" || !botPending) return;
      botPending = false;
      const started = performance.now();
      const move = chooseComputerMove(game, Math.min(wins + 1, 5));
      if (!move) return;
      const played = game.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
      lastMove = { from: played.from, to: played.to };
      const outcome = describeResult(game, "w");
      if (outcome) finishMatch({ winner: outcome.winner, kind: outcome.kind });
      else render();
      host.dataset.chessBotMs = String(Math.round(performance.now() - started));
    }, 380);
  }

  function beginMatch(nextMode = session) {
    window.clearTimeout(botTimer);
    botPending = false;
    game = new Chess();
    time = { w: MATCH_SECONDS, b: MATCH_SECONDS };
    selected = null;
    legalTargets = [];
    pendingPromotion = null;
    lastMove = null;
    focusedSquare = "e2";
    promotion.hidden = true;
    session = nextMode;
    mode = "active";
    $(`[data-save-status]`).textContent = "";
    window.Shelf?.record("game_play", { id: "chess" });
    render(true);
  }

  function startLadder() {
    wins = 0;
    elapsedTotal = 0;
    savedThisRun = false;
    beginMatch("ladder");
  }

  function startLocal() {
    wins = 0;
    elapsedTotal = 0;
    savedThisRun = true;
    beginMatch("local");
  }

  async function saveScore() {
    if (savedThisRun || session !== "ladder" || wins < 1) return;
    const name = getPlayerName();
    if (!name) {
      nameForm.hidden = false;
      $(`[data-save-status]`).textContent = "Add your name or initials to save this run.";
      nameInput.focus();
      return;
    }
    const entry = recordLeaderboardScore("chess", wins, wins, elapsedTotal);
    if (!entry) { $(`[data-save-status]`).textContent = "Couldn’t save this run in the browser."; return; }
    savedThisRun = true;
    nameForm.hidden = true;
    const online = window.HVNOnlineLeaderboard;
    if (!online?.configured) { $(`[data-save-status]`).textContent = `Saved as ${name} on this device.`; return; }
    const result = await online.submit("chess", {
      name,
      score: wins,
      packets: wins,
      seconds: entry.seconds,
      submissionId: online.submissionId("chess", entry),
    });
    $(`[data-save-status]`).textContent = result.status === "online"
      ? `Saved as ${name} on the shared Chess board.`
      : `Saved as ${name} here. The shared board could not be reached.`;
  }

  function tickClock() {
    if (mode !== "active") return;
    const side = game.turn();
    time[side] = Math.max(0, time[side] - 1);
    elapsedTotal += 1;
    if (time[side] === 0) {
      const winner = side === "w" ? "b" : "w";
      finishMatch({ winner: canPossiblyMate(game, winner) ? winner : null, kind: "time" });
    } else renderClocks();
  }

  function togglePause() {
    if (mode === "active") {
      mode = "paused";
      window.clearTimeout(botTimer);
      render();
    } else if (mode === "paused") {
      mode = "active";
      render();
      if (botPending) scheduleComputer();
    }
  }

  boardElement.addEventListener("click", (event) => {
    const square = event.target.closest("[data-square]")?.dataset.square;
    if (square) handleSquare(square);
  });
  boardElement.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"].includes(event.key)) return;
    const current = event.target.closest("[data-square]")?.dataset.square || focusedSquare;
    if (event.key === "Escape") { selected = null; legalTargets = []; renderBoard(true); return; }
    event.preventDefault();
    let file = FILES.indexOf(current[0]);
    let rank = Number(current[1]);
    if (event.key === "ArrowLeft") file = Math.max(0, file - 1);
    if (event.key === "ArrowRight") file = Math.min(7, file + 1);
    if (event.key === "ArrowUp") rank = Math.min(8, rank + 1);
    if (event.key === "ArrowDown") rank = Math.max(1, rank - 1);
    focusedSquare = `${FILES[file]}${rank}`;
    renderBoard(true);
  });
  $(`[data-start]`).addEventListener("click", () => {
    if (mode === "between") beginMatch("ladder");
    else startLadder();
  });
  $(`[data-local]`).addEventListener("click", startLocal);
  $(`[data-pause]`).addEventListener("click", togglePause);
  $(`[data-undo]`).addEventListener("click", () => {
    if (mode !== "active") return;
    game.undo();
    if (session === "ladder" && game.history().length && game.turn() === "b") game.undo();
    selected = null;
    legalTargets = [];
    pendingPromotion = null;
    promotion.hidden = true;
    window.clearTimeout(botTimer);
    botPending = false;
    lastMove = game.history({ verbose: true }).at(-1) || null;
    if (lastMove) lastMove = { from: lastMove.from, to: lastMove.to };
    render();
  });
  promotion.addEventListener("click", (event) => {
    const piece = event.target.closest("[data-promote]")?.dataset.promote;
    if (piece && pendingPromotion) commitMove(pendingPromotion.from, pendingPromotion.to, piece);
  });
  nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!setPlayerName(nameInput.value)) {
      $(`[data-save-status]`).textContent = "Enter your name or initials.";
      nameInput.focus();
      return;
    }
    void saveScore();
  });
  window.addEventListener("keydown", (event) => {
    if (event.code !== "KeyP" || event.repeat || event.target instanceof Element && event.target.closest("input, textarea")) return;
    if (["active", "paused"].includes(mode)) togglePause();
  });
  const clockTimer = window.setInterval(tickClock, 1000);
  render();
  return () => {
    disposed = true;
    window.clearInterval(clockTimer);
    window.clearTimeout(botTimer);
  };
}
