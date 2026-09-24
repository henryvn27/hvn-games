import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import test from "node:test";

test("public site config enables aggregate sharing by default without a prior-consent gate", () => {
  const window = {};
  runInNewContext(readFileSync(new URL('./leaderboard-config.js', import.meta.url), 'utf8'), {window});
  assert.equal(window.HVN_PLAYTIME_POLICY.defaultSharingAllowed, true);
  assert.equal(window.HVN_PLAYTIME_POLICY.requiresPriorConsent, false);
});
