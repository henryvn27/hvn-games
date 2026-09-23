import assert from "node:assert/strict";
import { createGame, guaranteedSafeMoves, neighbors, revealCell, tick, toggleFlag } from "./rules.js";

let game = createGame("easy");
assert.equal(game.width, 8);
assert.equal(game.height, 8);
const opening = revealCell(game, 0);
assert.equal(opening.started, true, "first move starts the clockable round");
assert.equal(opening.result, "playing", "first click is safe");
assert.equal(opening.revealed[0], 0, "first click clears the corner and its neighbors");
assert.ok(neighbors(opening, 0).every((id) => opening.revealed[id] >= 0), "the opening patch is cleared");
assert.ok(opening.revealed.length - opening.revealed.filter((clue) => clue >= 0).length >= opening.mineTotal);

const elapsed = tick(opening, 2.5);
assert.equal(elapsed.elapsed, 2.5);
assert.equal(tick({ ...opening, result: "won" }, 3).elapsed, 0, "finished rounds stop their timer");
const candidate = opening.revealed.findIndex((clue) => clue < 0);
const flagged = toggleFlag(opening, candidate);
assert.equal(flagged.flags[candidate], true);
assert.equal(opening.flags[candidate], false, "updates do not mutate prior state");
assert.equal(toggleFlag(flagged, candidate).flags[candidate], false, "marking toggles off");
const finished = { ...opening, result: "lost" };
assert.equal(toggleFlag(finished, candidate), finished, "finished boards ignore marks");

const forcedMine = {
  ...createGame("easy"), width: 3, height: 3, mineTotal: 1,
  revealed: [1, -1, 0, -1, -1, -1, -1, -1, -1],
  flags: Array(9).fill(false), started: true, result: "playing",
};
assert.ok(guaranteedSafeMoves(forcedMine).length > 0, "clues expose at least one guaranteed-safe square");
const death = revealCell(forcedMine, 3);
assert.equal(death.result, "lost", "a mine-capable guess loses when a forced-safe move exists");
assert.equal(death.lastMove, 3, "the mistake is remembered for clear feedback");
assert.equal(revealCell(death, 2), death, "the board stays locked after a loss");

const knownMine = { ...forcedMine, mineTotal: 2 };
assert.equal(revealCell(knownMine, 3).result, "lost", "a square proved to be a mine stays dangerous even when no safe move is certain");

const flaggedSafe = toggleFlag(forcedMine, 2);
assert.equal(flaggedSafe.flags[2], false, "already-open cells cannot be marked");
console.log("Minesweeper rules checks passed.");
