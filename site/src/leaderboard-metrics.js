export const LEADERBOARD_METRICS = Object.freeze({
  phasebound: Object.freeze({ order: "desc", unit: "points" }),
  "neon-bastion": Object.freeze({ order: "desc", unit: "points" }),
  reaction: Object.freeze({ order: "asc", unit: "ms" }),
  "2048": Object.freeze({ order: "desc", unit: "points" }),
  dockside: Object.freeze({ order: "desc", unit: "points" }),
  invaders: Object.freeze({ order: "desc", unit: "points" }),
  "hex-stack": Object.freeze({ order: "desc", unit: "points" }),
  minesweeper: Object.freeze({ order: "desc", unit: "points" }),
  "block-drop": Object.freeze({ order: "desc", unit: "points" }),
  tidepool: Object.freeze({ order: "desc", unit: "points" }),
  chess: Object.freeze({ order: "desc", unit: "wins" }),
  handshake: Object.freeze({ order: "desc", unit: "points" }),
  "maze-chase": Object.freeze({ order: "desc", unit: "points" }),
  asteroids: Object.freeze({ order: "desc", unit: "points" }),
  mahjong: Object.freeze({ order: "desc", unit: "points" }),
  klondike: Object.freeze({ order: "desc", unit: "points" }),
  spookyball: Object.freeze({ order: "desc", unit: "points" }),
});

export function getLeaderboardMetric(gameId) {
  return LEADERBOARD_METRICS[gameId] || { order: "desc", unit: "points" };
}

export function sortLeaderboardEntries(entries, gameId) {
  const direction = getLeaderboardMetric(gameId).order === "asc" ? 1 : -1;
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && Number.isFinite(entry.score))
    .slice()
    .sort((left, right) => direction * (left.score - right.score)
      || (Number(right.packets) || 0) - (Number(left.packets) || 0)
      || String(left.createdAt || "").localeCompare(String(right.createdAt || "")));
}

export function formatLeaderboardScore(score, gameId) {
  return `${score} ${getLeaderboardMetric(gameId).unit}`;
}
