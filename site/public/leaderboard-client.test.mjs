import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import test from "node:test";

function loadClient(preference) {
  const requests = [];
  let nextReceipt = 1;
  const window = {
    HVN_LEADERBOARD_CONFIG: {endpoint: "https://scores.example.test"},
    HVNPlaytimePreferences: {getPlaytimeSharing: () => preference.value},
    setTimeout,
    clearTimeout,
  };
  const context = {
    window,
    URLSearchParams,
    AbortController,
    crypto: {randomUUID: () => `playtime-receipt-${String(nextReceipt++).padStart(4, "0")}`},
    fetch: async (url, options) => {
      requests.push({url, options});
      return {ok: true, json: async () => ({ok: true})};
    },
  };
  runInNewContext(readFileSync(new URL('./leaderboard-client.js', import.meta.url), 'utf8'), context);
  return {api: window.HVNOnlineLeaderboard, requests};
}

test('playtime request sends a one-time receipt with game id and duration after consent', async () => {
  const {api, requests} = loadClient({value: "yes"});
  const result = await api.reportPlaytime({gameId: "snake", seconds: 15, submissionId: "must-not-leave-browser"});
  assert.equal(result.status, "online");
  assert.deepEqual(JSON.parse(requests[0].options.body), {action: "playtime", gameId: "snake", seconds: 15, submissionId: "playtime-receipt-0001"});
  await api.reportPlaytime({gameId: "snake", seconds: 20, submissionId: "must-not-leave-browser"});
  assert.deepEqual(JSON.parse(requests[1].options.body), {action: "playtime", gameId: "snake", seconds: 20, submissionId: "playtime-receipt-0002"});
});

test('playtime request is suppressed at the network client after opt-out', async () => {
  const preference = {value: "no"};
  const {api, requests} = loadClient(preference);
  const result = await api.reportPlaytime({gameId: "snake", seconds: 15});
  assert.equal(result.status, "disabled");
  assert.equal(requests.length, 0);
});
