import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

const browser = {window: {}};
runInNewContext(readFileSync(new URL('./leaderboards.js', import.meta.url), 'utf8'), browser);

test('reaction times sort fastest first even when entries arrive out of order', () => {
  const entries = [
    {name: 'SLOW', score: 2401, createdAt: '2026-01-03'},
    {name: 'FAST', score: 4, createdAt: '2026-01-01'},
    {name: 'MID', score: 205, createdAt: '2026-01-02'},
  ];

  assert.deepEqual(
    Array.from(browser.window.ShelfLeaderboard.sortEntries(entries, 'asc'), entry => entry.score),
    [4, 205, 2401],
  );
});

test('descending boards retain highest-score-first ordering', () => {
  const entries = [
    {name: 'LOW', score: 4, createdAt: '2026-01-01'},
    {name: 'HIGH', score: 2401, createdAt: '2026-01-03'},
    {name: 'MID', score: 205, createdAt: '2026-01-02'},
  ];

  assert.deepEqual(
    Array.from(browser.window.ShelfLeaderboard.sortEntries(entries, 'desc'), entry => entry.score),
    [2401, 205, 4],
  );
});
