import assert from "node:assert/strict";
import { createMahjongRun, isMahjongFree, mahjongHint, removeMahjongPair } from "./rules.js";

const run = createMahjongRun();
assert.equal(run.tiles.length, 40);
assert.equal(run.remaining, 40);
const hint = mahjongHint(run);
assert.equal(hint.length, 2);
assert.ok(isMahjongFree(run, run.tiles[hint[0]]));
const score = run.score;
removeMahjongPair(run, hint[0], hint[1]);
assert.equal(run.remaining, 38);
assert.equal(run.score, score + 20);
assert.equal(run.tiles[hint[0]].removed, true);
console.log("Mahjong rules tests passed");
