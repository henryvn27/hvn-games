(function () {
  "use strict";
const config = window.HVN_LEADERBOARD_CONFIG || {};
const baseUrl = String(config.supabaseUrl || "");
const anonKey = String(config.supabaseAnonKey || "");
const configured = Boolean(baseUrl && anonKey);
function cleanName(value) {
  const raw = String(value || "").trim().replace(/\s+/g, " ").slice(0, 16);
  return /^[a-zA-Z]{3}$/.test(raw) ? raw.toUpperCase() : raw;
}
function submissionId() {
  return globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}
function normalize(row) {
  return { name: cleanName(row.display_name), score: Math.max(0, Math.round(Number(row.score) || 0)), packets: Math.max(0, Math.round(Number(row.packets) || 0)), seconds: Math.max(0, Math.round(Number(row.seconds) || 0)), createdAt: row.created_at || new Date().toISOString() };
}
function request(path, options) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  const init = Object.assign({}, options || {}, {
    signal: controller.signal,
    headers: Object.assign({ apikey: anonKey, Authorization: "Bearer " + anonKey, "Content-Type": "application/json" }, (options && options.headers) || {}),
  });
  return fetch(baseUrl + "/rest/v1/" + path, init)
    .then((response) => { if (!response.ok) throw new Error("leaderboard request failed (" + response.status + ")"); return response; })
    .finally(() => window.clearTimeout(timeout));
}
function get(gameId, options) {
  if (!configured) return Promise.resolve({ status: "unconfigured", entries: [] });
  const ascending = options && options.order === "asc";
  const query = new URLSearchParams({
    select: "display_name,score,packets,seconds,created_at",
    game_id: "eq." + gameId,
    order: ascending ? "score.asc,created_at.asc" : "score.desc,created_at.asc",
    limit: "10",
  });
  return request("leaderboard_scores?" + query)
    .then((response) => response.json())
    .then((rows) => ({ status: "online", entries: rows.map(normalize).filter((entry) => entry.name) }))
    .catch((error) => ({ status: "unavailable", entries: [], error }));
}
function submit(gameId, payload) {
  if (!configured) return Promise.resolve({ status: "unconfigured", ok: false });
  const displayName = cleanName(payload && payload.name);
  const numericScore = Math.max(0, Math.round(Number(payload && payload.score) || 0));
  if (!displayName || !gameId || numericScore < 1) return Promise.resolve({ status: "invalid", ok: false });
  return request("leaderboard_scores", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      game_id: String(gameId).slice(0, 40),
      display_name: displayName,
      score: numericScore,
      packets: Math.max(0, Math.round(Number(payload.packets) || 0)),
      seconds: Math.max(0, Math.round(Number(payload.seconds) || 0)),
      submission_id: submissionId(),
    }),
  }).then(() => ({ status: "online", ok: true })).catch((error) => ({ status: "unavailable", ok: false, error }));
}
window.HVNOnlineLeaderboard = Object.freeze({ configured, get, submit });
})();
