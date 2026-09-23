import assert from "node:assert/strict";
import { blankBoard, canMove, moveBoard, newGame, slideLine, spawnTile, stepGame } from "./game.js";
import { SHELF_GAMES } from "../../site/src/shelf.js";

assert.equal(SHELF_GAMES.length, 13);
assert.ok(SHELF_GAMES.some((game) => game.id === "2048"), "2048 is reachable from the shared shelf");
assert.equal(new Set(SHELF_GAMES.map((game) => game.id)).size, SHELF_GAMES.length, "shelf routes are unique");

assert.deepEqual(slideLine([2, 2, 2, 2]), { line: [4, 4, 0, 0], score: 8 });
assert.deepEqual(slideLine([4, 4, 8, 0]), { line: [8, 8, 0, 0], score: 8 }, "a newly merged tile cannot merge twice in one move");

const board = blankBoard();
board[0] = [2, 2, 2, 2];
assert.deepEqual(moveBoard(board, "left").board[0], [4, 4, 0, 0]);
assert.deepEqual(moveBoard(board, "right").board[0], [0, 0, 4, 4]);
const vertical = blankBoard();
vertical.forEach((row) => { row[0] = 2; });
assert.deepEqual(moveBoard(vertical, "up").board.map((row) => row[0]), [4, 4, 0, 0]);
assert.deepEqual(moveBoard(vertical, "down").board.map((row) => row[0]), [0, 0, 4, 4]);

const stuck = Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, col) => (row + col) % 2 ? 4 : 2));
assert.equal(canMove(stuck), false);
assert.equal(canMove(blankBoard()), true);

const oneEmpty = stuck.map((row) => [...row]);
oneEmpty[3][3] = 0;
const spawned = spawnTile(oneEmpty, () => 0);
assert.equal(spawned.flat().filter(Boolean).length, 16);
assert.equal(spawned[3][3], 2);

const initial = newGame(() => 0);
assert.equal(initial.board.flat().filter(Boolean).length, 2);
const noMoveBoard = blankBoard();
noMoveBoard[0][0] = 2;
const noMove = stepGame({ ...initial, board: noMoveBoard }, "left", () => 0);
assert.equal(noMove.moved, false);
assert.strictEqual(noMove.state.board, noMoveBoard, "a blocked input must not spawn another tile");

const almostWon = blankBoard();
almostWon[0] = [1024, 1024, 0, 0];
const won = stepGame({ ...initial, board: almostWon }, "left", () => 0);
assert.equal(won.state.won, true);
assert.equal(won.state.score, 2048);
assert.equal(stepGame(won.state, "right", () => 0).moved, false, "the win waits for an explicit keep-playing choice");
console.log("2048 game logic checks passed.");
