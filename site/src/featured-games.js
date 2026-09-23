export const INITIAL_FEATURED_IDS = [
  "phasebound", "2048", "snake", "golf", "reaction", "dodger", "memory", "word", "flappy", "tic",
];

export function rankFeaturedGames(games, usage, limit = 10, requests = []) {
  const seconds = new Map((Array.isArray(usage) ? usage : []).map((item) => [item.gameId, Math.max(0, Number(item.seconds) || 0)]));
  const requestCounts = new Map((Array.isArray(requests) ? requests : []).map((item) => [item.gameId, Math.max(0, Number(item.count) || 0)]));
  const requestTimes = new Map((Array.isArray(requests) ? requests : []).map((item) => [item.gameId, Date.parse(item.lastRequestedAt) || 0]));
  const hasData = [...seconds.values()].some((value) => value > 0);
  const order = new Map(games.map((game, index) => [game.id, index]));
  const hasRequests = [...requestCounts.values()].some((value) => value > 0);
  const ranked = [...games].sort((left, right) => (requestTimes.get(right.id) || 0) - (requestTimes.get(left.id) || 0)
    || (requestCounts.get(right.id) || 0) - (requestCounts.get(left.id) || 0)
    || (seconds.get(right.id) || 0) - (seconds.get(left.id) || 0)
    || order.get(left.id) - order.get(right.id));
  if (hasData || hasRequests) return { games: ranked.slice(0, limit), ranked: true };
  const initial = new Set(INITIAL_FEATURED_IDS);
  const defaults = games.filter((game) => initial.has(game.id));
  const fallback = defaults.concat(games.filter((game) => !initial.has(game.id)));
  return { games: fallback.slice(0, limit), ranked: false };
}

export function hiddenGames(games, featured) {
  const featuredIds = new Set(featured.map((game) => game.id));
  return games.filter((game) => !featuredIds.has(game.id));
}
