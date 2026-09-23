import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";

const SIZE = 4;
const TARGET = 2048;
const BEST_KEY = "hvn-games:2048:best";

export function blankBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

export function slideLine(line) {
  const compact = line.filter(Boolean);
  const result = [];
  let score = 0;
  for (let index = 0; index < compact.length; index += 1) {
    if (compact[index] === compact[index + 1]) {
      const merged = compact[index] * 2;
      result.push(merged);
      score += merged;
      index += 1;
    } else {
      result.push(compact[index]);
    }
  }
  while (result.length < SIZE) result.push(0);
  return { line: result, score };
}

export function moveBoard(board, direction) {
  const next = blankBoard();
  let gained = 0;
  for (let lineIndex = 0; lineIndex < SIZE; lineIndex += 1) {
    const line = Array.from({ length: SIZE }, (_, offset) => {
      const row = direction === "up" || direction === "down" ? offset : lineIndex;
      const col = direction === "up" || direction === "down" ? lineIndex : offset;
      return board[row][col];
    });
    if (direction === "right" || direction === "down") line.reverse();
    const slid = slideLine(line);
    if (direction === "right" || direction === "down") slid.line.reverse();
    gained += slid.score;
    for (let offset = 0; offset < SIZE; offset += 1) {
      const row = direction === "up" || direction === "down" ? offset : lineIndex;
      const col = direction === "up" || direction === "down" ? lineIndex : offset;
      next[row][col] = slid.line[offset];
    }
  }
  return { board: next, gained, moved: next.some((row, r) => row.some((value, c) => value !== board[r][c])) };
}

export function spawnTile(board, random = Math.random) {
  const empty = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) if (!board[row][col]) empty.push([row, col]);
  }
  if (!empty.length) return board;
  const [row, col] = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  const next = board.map((line) => [...line]);
  next[row][col] = random() < 0.9 ? 2 : 4;
  return next;
}

export function newGame(random = Math.random) {
  return { board: spawnTile(spawnTile(blankBoard(), random), random), score: 0, won: false, over: false, continued: false };
}

export function stepGame(state, direction, random = Math.random) {
  if (state.over || (state.won && !state.continued)) return { state, gained: 0, moved: false };
  const result = moveBoard(state.board, direction);
  if (!result.moved) return { state, gained: 0, moved: false };
  const board = spawnTile(result.board, random);
  const has2048 = board.some((row) => row.some((value) => value >= TARGET));
  const over = !has2048 && !canMove(board);
  return {
    state: { board, score: state.score + result.gained, won: state.won || has2048, over, continued: state.continued },
    gained: result.gained,
    moved: true,
  };
}

export function canMove(board) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (!board[row][col]) return true;
      if (col < SIZE - 1 && board[row][col] === board[row][col + 1]) return true;
      if (row < SIZE - 1 && board[row][col] === board[row + 1][col]) return true;
    }
  }
  return false;
}

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function writeBest(value) {
  try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* Private browsing can disable storage. */ }
}

export function mount2048(host) {
  host.innerHTML = `
    <section class="twenty48" aria-label="2048 game">
      <div class="twenty48-top">
        <div class="twenty48-scores" aria-label="Scores">
          <div><span>Score</span><strong id="twenty48-score">0</strong></div>
          <div><span>Best</span><strong id="twenty48-best">0</strong></div>
        </div>
        <button class="twenty48-new" type="button" data-new>New game</button>
      </div>
      <p class="twenty48-rule">Slide matching tiles together to make 2048.</p>
      <div class="twenty48-board" role="grid" aria-label="Tile board" tabindex="0">
        ${Array.from({ length: 16 }, (_, index) => `<div class="twenty48-cell" role="gridcell" data-cell="${index}"></div>`).join("")}
      </div>
      <div class="twenty48-bottom">
        <p id="twenty48-message" aria-live="polite">Use arrow keys, WASD, or swipe the board.</p>
        <button class="twenty48-undo" type="button" data-undo disabled>Undo</button>
      </div>
      <form class="twenty48-name" data-name-form hidden>
        <label for="twenty48-name">Name or initials</label>
        <div><input id="twenty48-name" maxlength="16" autocomplete="nickname" placeholder="Your name or initials"><button class="twenty48-new" type="submit">Save score</button></div>
        <p data-name-status role="status" aria-live="polite"></p>
      </form>
    </section>`;

  const boardNode = host.querySelector(".twenty48-board");
  const cells = [...host.querySelectorAll("[data-cell]")];
  const scoreNode = host.querySelector("#twenty48-score");
  const bestNode = host.querySelector("#twenty48-best");
  const messageNode = host.querySelector("#twenty48-message");
  const undoButton = host.querySelector("[data-undo]");
  let state = newGame();
  let best = readBest();
  let previous = null;
  let pointerStart = null;
  let runSaved = false;

  const render = (message) => {
    cells.forEach((cell, index) => {
      const value = state.board[Math.floor(index / SIZE)][index % SIZE];
      cell.textContent = value ? String(value) : "";
      cell.setAttribute("aria-label", value ? `${value} tile` : "Empty");
      cell.dataset.value = value ? String(Math.min(value, 2048)) : "0";
    });
    scoreNode.textContent = String(state.score);
    bestNode.textContent = String(best);
    undoButton.disabled = !previous;
    if (message) messageNode.textContent = message;
  };
  const fresh = () => {
    state = newGame();
    previous = null;
    runSaved = false;
    const form = host.querySelector("[data-name-form]");
    form.hidden = true;
    form.querySelector("label").textContent = "Name or initials";
    form.querySelector("input").hidden = false;
    form.querySelector("input").value = "";
    form.querySelector("button").hidden = false;
    form.querySelector("[data-name-status]").textContent = "";
    render("Use arrow keys, WASD, or swipe the board.");
    boardNode.focus({ preventScroll: true });
  };
  const saveFinishedRun = async () => {
    if (runSaved || state.score < 1) return;
    const savedName = getPlayerName();
    const form = host.querySelector("[data-name-form]");
    const status = host.querySelector("[data-name-status]");
    if (!savedName) {
      form.hidden = false;
      status.textContent = "Add your name once. Future scores will save automatically.";
      host.querySelector("#twenty48-name").focus({ preventScroll: true });
      return;
    }
    const entry = recordLeaderboardScore("2048", state.score, 0, 0);
    if (!entry) return;
    runSaved = true;
    const online = window.HVNOnlineLeaderboard;
    if (online?.configured) {
      const result = await online.submit("2048", { name: savedName, score: state.score, packets: 0, seconds: 0, submissionId: online.submissionId("2048", entry) });
      status.textContent = result.status === "online" ? `Saved as ${savedName}.` : `Saved on this device as ${savedName}. The shared board will retry when it is reachable.`;
    } else {
      status.textContent = `Saved on this device as ${savedName}.`;
    }
    form.hidden = false;
    form.querySelector("label").textContent = "Score saved";
    form.querySelector("input").hidden = true;
    form.querySelector("button").hidden = true;
  };
  host.querySelector("[data-name-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = host.querySelector("#twenty48-name");
    const name = setPlayerName(input.value);
    const status = host.querySelector("[data-name-status]");
    if (!name) {
      status.textContent = "Enter your own initials or name.";
      input.focus();
      return;
    }
    input.value = name;
    await saveFinishedRun();
  });
  const step = (direction) => {
    const result = stepGame(state, direction);
    if (!result.moved) return;
    previous = state;
    state = result.state;
    if (state.score > best) {
      best = state.score;
      writeBest(best);
    }
    let message = result.gained ? `+${result.gained}` : "";
    if (state.won && !previous.won) {
      message = "2048. Keep playing or start a new board.";
      state = { ...state, continued: false };
      messageNode.dataset.won = "true";
    } else if (state.over) {
      message = "No moves left. Start a new board.";
      messageNode.dataset.won = "false";
    } else {
      messageNode.dataset.won = "false";
    }
    render(message);
    if (state.over) void saveFinishedRun();
    if (state.won && !previous.won) {
      const keep = document.createElement("button");
      keep.type = "button";
      keep.className = "twenty48-continue";
      keep.textContent = "Keep playing";
      keep.addEventListener("click", () => {
        state = { ...state, continued: true };
        messageNode.dataset.won = "false";
        messageNode.textContent = "Carry on. The next tile is yours to chase.";
        boardNode.focus({ preventScroll: true });
      }, { once: true });
      messageNode.append(" ", keep);
    }
  };

  const directions = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down" };
  const onKey = (event) => {
    const direction = directions[event.key];
    if (direction && host.isConnected && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      step(direction);
    }
  };
  const onPointerDown = (event) => { pointerStart = [event.clientX, event.clientY]; };
  const onPointerUp = (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart[0];
    const dy = event.clientY - pointerStart[1];
    pointerStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    step(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down"));
  };
  const onUndo = () => {
    if (!previous) return;
    state = previous;
    previous = null;
    messageNode.dataset.won = "false";
    render("Move undone.");
    boardNode.focus({ preventScroll: true });
  };
  host.querySelector("[data-new]").addEventListener("click", fresh);
  undoButton.addEventListener("click", onUndo);
  boardNode.addEventListener("pointerdown", onPointerDown);
  boardNode.addEventListener("pointerup", onPointerUp);
  boardNode.addEventListener("pointercancel", () => { pointerStart = null; });
  window.addEventListener("keydown", onKey);
  render();
  return () => {
    window.removeEventListener("keydown", onKey);
    host.replaceChildren();
  };
}
