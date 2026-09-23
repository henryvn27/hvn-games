import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { canPossiblyMate, chooseComputerMove, describeResult, evaluate, makeGame } from "./rules.js";

const opening = makeGame();
assert.equal(opening.moves().length, 20, "the starting position has 20 legal moves");
assert.throws(() => opening.move({ from: "e2", to: "e5" }), /Invalid move/, "illegal moves are rejected");
opening.move("e4");
assert.equal(opening.get("e4")?.type, "p");

const castle = makeGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
assert.ok(castle.moves({ verbose: true }).some((move) => move.from === "e1" && move.to === "g1"), "white can castle king side");
castle.move({ from: "e1", to: "g1" });
assert.equal(castle.get("f1")?.type, "r", "castling moves the rook too");

const enPassant = makeGame("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2");
assert.ok(enPassant.moves({ verbose: true }).some((move) => move.from === "e5" && move.to === "d6" && move.flags.includes("e")));
enPassant.move({ from: "e5", to: "d6" });
assert.equal(enPassant.get("d5"), undefined, "en passant removes the passed pawn");

const promotion = makeGame("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
promotion.move({ from: "a7", to: "a8", promotion: "q" });
assert.equal(promotion.get("a8")?.type, "q", "promotion changes the pawn to a queen");

const mate = new Chess();
for (const move of ["f3", "e5", "g4", "Qh4#"]) mate.move(move);
assert.deepEqual(describeResult(mate, "w"), { kind: "mate", winner: "b", humanWon: false });
assert.equal(describeResult(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"))?.kind, "stalemate");

const ladder = makeGame();
ladder.move("e4");
const computerMove = chooseComputerMove(ladder, 4, () => 0.37);
assert.ok(ladder.moves({ verbose: true }).some((move) => move.from === computerMove.from && move.to === computerMove.to));
ladder.move(computerMove);
assert.equal(ladder.turn(), "w");
assert.ok(Number.isFinite(evaluate(ladder, "b")));
assert.equal(canPossiblyMate(makeGame("7k/8/8/8/8/8/8/7K w - - 0 1"), "w"), false);
assert.equal(canPossiblyMate(makeGame("7k/8/8/8/8/8/8/6BK w - - 0 1"), "w"), false);
assert.equal(canPossiblyMate(makeGame("7k/8/8/8/8/8/8/5N1K w - - 0 1"), "w"), false);
for (let round = 0; round < 3; round += 1) {
  const replay = makeGame();
  for (const move of ["f3", "e5", "g4", "Qh4#"]) replay.move(move);
  assert.equal(describeResult(replay, "w")?.winner, "b", `completed replay ${round + 1} ends in a clear result`);
}
console.log("Chess rules, terminal states, castling, en passant, promotion, and bot checks passed.");
