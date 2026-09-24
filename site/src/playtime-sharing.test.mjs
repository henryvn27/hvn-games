import assert from "node:assert/strict";

const values = new Map();
const navigator = { doNotTrack: "0", globalPrivacyControl: false };
globalThis.CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
globalThis.window = {
  navigator,
  HVN_PLAYTIME_POLICY: { defaultSharingAllowed: true, requiresPriorConsent: false },
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
  dispatchEvent() {},
};

const { getPlaytimeSharing, hasPlaytimePrivacySignal, setPlaytimeSharing } = await import("./play-intelligence.js");

assert.equal(getPlaytimeSharing(), "yes", "sharing starts on for a new browser");
assert.equal(setPlaytimeSharing(false), true);
assert.equal(getPlaytimeSharing(), "no", "opt-out is saved and survives reloads");
assert.equal(values.get("hvn-games:share-playtime:v1"), "no");
assert.equal(setPlaytimeSharing(true), true);
assert.equal(getPlaytimeSharing(), "yes", "sharing can be turned back on");

window.localStorage.removeItem("hvn-games:share-playtime:v1");
navigator.globalPrivacyControl = true;
assert.equal(hasPlaytimePrivacySignal(), true);
assert.equal(getPlaytimeSharing(), "no", "GPC opts the browser out automatically");
assert.equal(setPlaytimeSharing(true), false, "the UI cannot override GPC");
navigator.globalPrivacyControl = false;
navigator.doNotTrack = "1";
assert.equal(getPlaytimeSharing(), "no", "Do Not Track opts the browser out automatically");

console.log("Playtime default and opt-out checks passed.");
