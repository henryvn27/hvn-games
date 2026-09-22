(function () {
  "use strict";
const config = window.HVN_LEADERBOARD_CONFIG || {};
const baseUrl = String(config.endpoint || "");
const configured = Boolean(baseUrl);
const MIGRATION_KEY = "hvn-games:leaderboard-migration:v1";
function cleanName(value) {
  const raw = String(value || "").trim().replace(/\s+/g, " ").slice(0, 16);
  return /^[a-zA-Z]{3}$/.test(raw) ? raw.toUpperCase() : raw;
}
function submissionId() {
  return globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}
function normalize(row) {
  return { name: cleanName(row.name || row.display_name), score: Math.max(0, Math.round(Number(row.score) || 0)), packets: Math.max(0, Math.round(Number(row.packets) || 0)), seconds: Math.max(0, Math.round(Number(row.seconds) || 0)), createdAt: row.createdAt || row.created_at || new Date().toISOString() };
}
function request(path, options) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  const init = Object.assign({}, options || {}, {
    signal: controller.signal,
    headers: Object.assign({ "Content-Type": "text/plain;charset=utf-8" }, (options && options.headers) || {}),
  });
  return fetch(baseUrl + path, init)
    .then((response) => { if (!response.ok) throw new Error("leaderboard request failed (" + response.status + ")"); return response; })
    .finally(() => window.clearTimeout(timeout));
}
function get(gameId, options) {
  if (!configured) return Promise.resolve({ status: "unconfigured", entries: [] });
  const ascending = options && options.order === "asc";
  const query = new URLSearchParams({ game_id: gameId, order: ascending ? "asc" : "desc", limit: "10" });
  return request("?" + query)
    .then((response) => response.json())
    .then((payload) => ({ status: "online", entries: (payload.entries || []).map(normalize).filter((entry) => entry.name) }))
    .catch((error) => ({ status: "unavailable", entries: [], error }));
}
function submit(gameId, payload) {
  if (!configured) return Promise.resolve({ status: "unconfigured", ok: false });
  const displayName = cleanName(payload && payload.name);
  const numericScore = Math.max(0, Math.round(Number(payload && payload.score) || 0));
  if (!displayName || !gameId || numericScore < 1) return Promise.resolve({ status: "invalid", ok: false });
  return request("", {
    method: "POST",
    body: JSON.stringify({
      gameId: String(gameId).slice(0, 40),
      name: displayName,
      score: numericScore,
      packets: Math.max(0, Math.round(Number(payload.packets) || 0)),
      seconds: Math.max(0, Math.round(Number(payload.seconds) || 0)),
      submissionId: String(payload.submissionId || submissionId()).slice(0, 80),
    }),
  }).then(async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return { status: "online", ok: true };
    const payload = await response.json();
    return payload && payload.ok
      ? ({ status: "online", ok: true, duplicate: Boolean(payload.duplicate) })
      : ({ status: "unavailable", ok: false, error: new Error(payload && payload.error || "leaderboard write rejected") });
  })
    .catch((error) => ({ status: "unavailable", ok: false, error }));
}
function migrationState() {
  try { return JSON.parse(window.localStorage.getItem(MIGRATION_KEY) || "{}"); } catch { return {}; }
}
function migrationId(gameId, entry) {
  return ["local", gameId, entry.name || "YOU", entry.score || 0, entry.packets || 0, entry.seconds || 0, entry.createdAt || ""].join("-").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}
async function migrate(entriesByGame) {
  if (!configured) return { status: "unconfigured", migrated: 0, pending: 0 };
  const state = migrationState();
  let migrated = 0;
  let pending = 0;
  for (const [gameId, entries] of Object.entries(entriesByGame || {})) {
    for (const entry of Array.isArray(entries) ? entries : []) {
      const id = migrationId(gameId, entry);
      if (state[id]) continue;
      const result = await submit(gameId, Object.assign({}, entry, { submissionId: id }));
      if (result.status === "online") { state[id] = true; migrated += 1; }
      else pending += 1;
    }
  }
  try { window.localStorage.setItem(MIGRATION_KEY, JSON.stringify(state)); } catch { /* retry later */ }
  return { status: pending ? "partial" : "online", migrated, pending };
}
window.HVNOnlineLeaderboard = Object.freeze({ configured, get, submit, migrate, submissionId: migrationId });
})();
