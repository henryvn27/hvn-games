import assert from "node:assert/strict";
import test from "node:test";

class FakeClock {
  now = 0;
  nextId = 1;
  timers = new Map();
  setTimeout(callback, delay) {
    const id = this.nextId++;
    this.timers.set(id, {at: this.now + delay, callback});
    return id;
  }
  clearTimeout(id) { this.timers.delete(id); }
  advance(milliseconds) {
    const target = this.now + milliseconds;
    while (true) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (!due) break;
      const [id, timer] = due;
      this.timers.delete(id);
      this.now = timer.at;
      timer.callback();
    }
    this.now = target;
  }
}

let moduleId = 0;
async function install({policy = {}, navigator = {}, storage = new Map(), failWrites = false} = {}) {
  const clock = new FakeClock();
  const windowEvents = new Map();
  const documentEvents = new Map();
  const calls = [];
  let cancellations = 0;
  const listeners = (map, type) => map.get(type) || new Set();
  const windowMock = {
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => { if (failWrites) throw new Error("storage unavailable"); storage.set(key, String(value)); },
      removeItem: (key) => storage.delete(key),
    },
    navigator,
    HVN_PLAYTIME_POLICY: policy,
    HVNOnlineLeaderboard: {
      configured: true,
      async reportPlaytime(payload) { calls.push({...payload}); return {status: "online"}; },
      cancelPlaytimeReports() { cancellations += 1; },
    },
    setTimeout: clock.setTimeout.bind(clock),
    clearTimeout: clock.clearTimeout.bind(clock),
    addEventListener(type, listener) { if (!windowEvents.has(type)) windowEvents.set(type, new Set()); windowEvents.get(type).add(listener); },
    removeEventListener(type, listener) { listeners(windowEvents, type).delete(listener); },
    dispatchEvent(event) { for (const listener of listeners(windowEvents, event.type)) listener(event); },
  };
  const documentMock = {
    visibilityState: "visible",
    addEventListener(type, listener) { if (!documentEvents.has(type)) documentEvents.set(type, new Set()); documentEvents.get(type).add(listener); },
    removeEventListener(type, listener) { listeners(documentEvents, type).delete(listener); },
  };
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    CustomEvent: globalThis.CustomEvent,
    dateNow: Date.now,
  };
  globalThis.window = windowMock;
  globalThis.document = documentMock;
  globalThis.CustomEvent = class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } };
  Date.now = () => clock.now;
  const url = new URL("./play-intelligence.js", import.meta.url);
  url.searchParams.set("test", String(++moduleId));
  const module = await import(url.href);
  return {
    module, storage, clock, calls,
    get cancellations() { return cancellations; },
    restore() {
      globalThis.window = previous.window;
      globalThis.document = previous.document;
      globalThis.CustomEvent = previous.CustomEvent;
      Date.now = previous.dateNow;
    },
  };
}

test("sharing defaults on under an explicitly allowed policy and an opt-out survives reload", async () => {
  const storage = new Map();
  const allowed = await install({policy: {defaultSharingAllowed: true, requiresPriorConsent: false}, storage});
  assert.equal(allowed.module.getPlaytimeSharing(), "yes");
  assert.equal(allowed.module.setPlaytimeSharing(false), true);
  assert.equal(allowed.module.getPlaytimeSharing(), "no");
  allowed.restore();

  const reloaded = await install({policy: {defaultSharingAllowed: true, requiresPriorConsent: false}, storage});
  assert.equal(reloaded.module.getPlaytimeSharing(), "no");
  assert.equal(reloaded.module.setPlaytimeSharing(true), true);
  assert.equal(reloaded.module.getPlaytimeSharing(), "yes");
  reloaded.restore();
});

test("a prior-consent policy blocks the default but permits a deliberate share action", async () => {
  const browser = await install({policy: {defaultSharingAllowed: true, requiresPriorConsent: true}});
  assert.equal(browser.module.getPlaytimeSharing(), "no");
  assert.equal(browser.module.setPlaytimeSharing(true), true);
  assert.equal(browser.module.getPlaytimeSharing(), "yes");
  browser.restore();
});

test("opt-out still takes effect in the current page when storage cannot save it", async () => {
  const browser = await install({policy: {defaultSharingAllowed: true, requiresPriorConsent: false}, failWrites: true});
  assert.equal(browser.module.getPlaytimeSharing(), "yes");
  assert.equal(browser.module.setPlaytimeSharing(false), true);
  assert.equal(browser.module.getPlaytimeSharing(), "no");
  assert.ok(browser.cancellations >= 1);
  browser.restore();
});

test("GPC and DNT cannot be overridden by the site preference", async () => {
  for (const navigator of [{globalPrivacyControl: true}, {doNotTrack: "1"}]) {
    const browser = await install({policy: {defaultSharingAllowed: true}, navigator});
    assert.equal(browser.module.getPlaytimeSharing(), "no");
    assert.equal(browser.module.setPlaytimeSharing(true), false);
    browser.module.createGamePlaytimeTracker("snake");
    browser.clock.advance(30000);
    assert.deepEqual(browser.calls, []);
    browser.restore();
  }
});

test("opt-out stops reports and discards queued in-memory seconds; opting back in resumes", async () => {
  const browser = await install({policy: {defaultSharingAllowed: true, requiresPriorConsent: false}});
  const stopFirst = browser.module.createGamePlaytimeTracker("snake");
  browser.clock.advance(15000);
  await Promise.resolve();
  assert.deepEqual(browser.calls.map(({gameId, seconds}) => [gameId, seconds]), [["snake", 15]]);

  browser.storage.set("hvn-games:playtime-pending:v1", "[{\"seconds\":5}]");
  browser.module.setPlaytimeSharing(false);
  stopFirst();
  browser.clock.advance(30000);
  assert.equal(browser.calls.length, 1);
  assert.ok(browser.cancellations >= 1);
  assert.equal(browser.storage.has("hvn-games:playtime-pending:v1"), false);

  browser.module.setPlaytimeSharing(true);
  const stopSecond = browser.module.createGamePlaytimeTracker("snake");
  browser.clock.advance(15000);
  await Promise.resolve();
  assert.deepEqual(browser.calls.map(({gameId, seconds}) => [gameId, seconds]), [["snake", 15], ["snake", 15]]);
  stopSecond();
  browser.restore();
});
