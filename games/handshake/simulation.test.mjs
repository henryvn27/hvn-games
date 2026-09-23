import assert from "node:assert/strict";
import { HANDSHAKE, PARTNERS, advance, choose, pause, resume, startNextTable, startTournament } from "./simulation.js";

assert.equal(PARTNERS.length, HANDSHAKE.tables);
let game = startTournament();
assert.equal(game.mode, "active");
game = choose(game, "share");
assert.deepEqual([game.lastDeal.playerPoints, game.lastDeal.opponentPoints], [3, 3], "mutual sharing splits the pool");
assert.equal(choose(game, "keep"), game, "a second choice cannot replace an unresolved hand");
game = advance(game);
assert.equal(game.handIndex, 1);
assert.equal(game.mode, "active");

let steady = { ...startTournament(), tableIndex: 1 };
for (let hand = 0; hand < HANDSHAKE.dealsPerTable; hand += 1) {
  steady = choose(steady, "keep");
  assert.equal(steady.lastDeal.opponent, "share", "the vendor keeps offering the same fair deal");
  if (hand + 1 < HANDSHAKE.dealsPerTable) steady = advance(steady);
}
assert.equal(steady.tablePoints, 30, "taking every fair offer earns six points each hand");
assert.equal(steady.rivalPoints, 0);

let mirror = startTournament();
mirror = choose(mirror, "keep");
assert.equal(mirror.lastDeal.opponent, "share", "the regular opens fairly");
mirror = advance(mirror);
mirror = choose(mirror, "share");
assert.equal(mirror.lastDeal.opponent, "keep", "the regular mirrors the previous player choice");
mirror = advance(mirror);
mirror = choose(mirror, "share");
assert.equal(mirror.lastDeal.opponent, "share", "the mirror responds to the latest shared hand");

let forgiver = { ...startTournament(), tableIndex: 2 };
forgiver = choose(forgiver, "keep");
assert.equal(forgiver.lastDeal.opponent, "share");
forgiver = advance(forgiver);
forgiver = choose(forgiver, "keep");
assert.equal(forgiver.lastDeal.opponent, "keep", "the forgiver pushes back once after a profitable keep");
forgiver = advance(forgiver);
forgiver = choose(forgiver, "keep");
assert.equal(forgiver.lastDeal.opponent, "share", "the one-hand response does not become a permanent grudge");

let full = startTournament();
for (let table = 0; table < HANDSHAKE.tables; table += 1) {
  for (let hand = 0; hand < HANDSHAKE.dealsPerTable; hand += 1) {
    full = choose(full, "share");
    full = advance(full);
  }
  if (table + 1 < HANDSHAKE.tables) full = startNextTable(full);
}
assert.equal(full.mode, "result", "a complete tournament has a terminal result");
assert.equal(full.completedDeals, HANDSHAKE.tables * HANDSHAKE.dealsPerTable);
assert.equal(full.totalPoints, HANDSHAKE.tables * HANDSHAKE.dealsPerTable * HANDSHAKE.points.bothShare);
assert.equal(advance(full), full, "result state cannot advance into an invalid table");

let paused = pause(startTournament());
assert.equal(paused.mode, "paused");
assert.equal(choose(paused, "share"), paused, "choices do not resolve while paused");
assert.equal(resume(paused).mode, "active");
assert.equal(startNextTable(full), full, "next-table only works between tables");
assert.equal(choose(startTournament(), "wait").completedDeals, 0, "unknown actions are ignored");
console.log("Handshake tests passed: payoffs, adaptive opponents, complete tournament, pause, and terminal state.");
