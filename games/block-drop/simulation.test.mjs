import assert from "node:assert/strict";
import { BLOCK_DROP, collides, fallInterval, hardDrop, holdPiece, matrixFor, movePiece, newRun, rotatePiece, softDrop, startRun, stepRun, togglePause } from "./simulation.js";

const fixed = () => .1;
let state = startRun(fixed);
assert.equal(state.mode, "active");
assert.equal(state.queue.length, 13);
assert.equal(new Set(state.queue.slice(0, 7)).size, 7, "pieces arrive in shuffled seven-piece bags");
assert.equal(state.board.length, BLOCK_DROP.rows);
assert.equal(matrixFor({ type: "I", rotation: 1 }).length, 4, "rotation changes the piece bounds");
assert.equal(new Set([state.current.type, ...state.queue.slice(0, 6)]).size, 7, "the current piece and six previews complete one bag");

state = { ...state, current: { type: "T", rotation: 0, x: 3, y: 0 } };
assert.equal(movePiece(state, -1).current.x, 2);
const atWall = { ...state, current: { ...state.current, x: 0 } };
assert.equal(movePiece(atWall, -1), atWall, "a move outside the well is rejected");
assert.equal(rotatePiece(state, 1).current.rotation, 1);
assert.ok(fallInterval(4) < fallInterval(1), "the pace rises with each level");

const held = holdPiece(state, fixed);
assert.equal(held.holdUsed, true);
assert.equal(holdPiece(held, fixed), held, "a piece can only be held once before locking");
assert.equal(holdPiece({ ...held, holdUsed: false, held: "I" }, fixed).current.type, "I");
assert.equal(softDrop({ ...state, current: { ...state.current, y: 0 } }).score, state.score + 1);

const paused = togglePause(state);
assert.equal(stepRun(paused, 1), paused, "pause freezes the board and clock");
assert.equal(togglePause(paused).mode, "active");

const board = Array.from({ length: BLOCK_DROP.rows }, () => Array(BLOCK_DROP.columns).fill(null));
for (let y = BLOCK_DROP.rows - 4; y < BLOCK_DROP.rows; y += 1) {
  board[y] = Array(BLOCK_DROP.columns).fill("J");
  board[y][4] = null;
}
const fourLineState = { ...state, board, current: { type: "I", rotation: 1, x: 4, y: 0 }, queue: [...state.queue] };
assert.equal(collides(board, fourLineState.current), false);
const clear = hardDrop(fourLineState, fixed);
assert.equal(clear.lastClear, 4, "a vertical I can clear four full rows at once");
assert.equal(clear.lines, 4);
assert.equal(clear.score, 832, "four-row clear scores 800 plus the hard-drop distance");
assert.equal(clear.board.flat().filter(Boolean).length, 0);

const levelBoard = Array.from({ length: BLOCK_DROP.rows }, () => Array(BLOCK_DROP.columns).fill(null));
levelBoard[BLOCK_DROP.rows - 1] = Array(BLOCK_DROP.columns).fill("S");
for (let x = 3; x < 7; x += 1) levelBoard[BLOCK_DROP.rows - 1][x] = null;
const levelState = { ...state, lines: 9, level: 1, board: levelBoard, current: { type: "I", rotation: 0, x: 3, y: 0 } };
const leveled = hardDrop(levelState, fixed);
assert.equal(leveled.level, 2, "the tenth cleared line advances the level");
assert.ok(leveled.score > 0);

const blockedBoard = Array.from({ length: 20 }, () => Array(10).fill(null));
blockedBoard[0][4] = "L";
const toppedOut = hardDrop({ ...state, board: blockedBoard, queue: ["I", ...state.queue.slice(1)], current: { type: "O", rotation: 0, x: 4, y: 0 } }, fixed);
assert.equal(toppedOut.mode, "over", "a blocked spawn ends the run");
assert.equal(toppedOut.current, null);

let falling = startRun(fixed);
const startY = falling.current.y;
for (let frame = 0; frame < 50; frame += 1) falling = stepRun(falling, 1 / 60, fixed);
assert.ok(falling.current.y > startY, "gravity moves the active piece");
assert.ok(!collides(falling.board, falling.current));
console.log("Block Drop simulation checks passed.");
