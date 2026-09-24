import assert from "node:assert/strict";
import test from "node:test";
import { formatLeaderboardScore, getLeaderboardMetric, LEADERBOARD_METRICS, sortLeaderboardEntries } from "./leaderboard-metrics.js";

test("reaction leaderboard consistently ranks the smallest millisecond value first", () => {
  const rows = [
    { name: "slow", score: 2401 },
    { name: "fast", score: 4 },
    { name: "mid", score: 205 },
  ];
  assert.deepEqual(sortLeaderboardEntries(rows, "reaction").map((row) => row.score), [4, 205, 2401]);
  assert.equal(formatLeaderboardScore(4, "reaction"), "4 ms");
});

test("point and win leaderboards rank higher values first and render units", () => {
  const rows = [{ score: 4 }, { score: 2401 }, { score: 205 }];
  assert.deepEqual(sortLeaderboardEntries(rows, "phasebound").map((row) => row.score), [2401, 205, 4]);
  assert.deepEqual(sortLeaderboardEntries(rows, "chess").map((row) => row.score), [2401, 205, 4]);
  assert.equal(formatLeaderboardScore(3, "phasebound"), "3 points");
  assert.equal(formatLeaderboardScore(3, "chess"), "3 wins");
  assert.equal(getLeaderboardMetric("asteroids").order, "desc");
  assert.equal(formatLeaderboardScore(120, "asteroids"), "120 points");
  assert.equal(Object.keys(LEADERBOARD_METRICS).length, 17);
});
