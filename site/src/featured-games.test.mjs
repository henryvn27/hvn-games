import assert from "node:assert/strict";
import { hiddenGames, hiddenGamesLabel, rankFeaturedGames } from "./featured-games.js";

const catalog = Array.from({ length: 15 }, (_, index) => ({ id: `game-${index + 1}`, name: `Game ${index + 1}` }));
const baseline = rankFeaturedGames(catalog, []);
assert.equal(baseline.games.length, 10);
assert.equal(hiddenGames(catalog, baseline.games).length, 5);
assert.equal(new Set(baseline.games.map((game) => game.id)).size, 10);
assert.equal(hiddenGamesLabel(catalog.length - baseline.games.length), "Browse 5 more games");
assert.equal(hiddenGamesLabel(0), "Browse all games");

const ranked = rankFeaturedGames(catalog, [
  { gameId: "game-15", seconds: 950 },
  { gameId: "game-14", seconds: 120 },
  { gameId: "game-13", seconds: 510 },
]);
assert.equal(ranked.ranked, true);
assert.deepEqual(ranked.games.slice(0, 3).map((game) => game.id), ["game-15", "game-13", "game-14"]);
assert.equal(ranked.games.length, 10);
assert.equal(hiddenGames(catalog, ranked.games).length, 5);
assert.equal(hiddenGamesLabel(catalog.length - ranked.games.length), "Browse 5 more games");
const requested = rankFeaturedGames(catalog, [{ gameId: "game-15", seconds: 950 }], 10, [{ gameId: "game-1", count: 1 }]);
assert.equal(requested.games[0].id, "game-1", "a request promotes the game to the shared featured list");
assert.equal(requested.games.length, 10);
console.log("Featured-games ranking checks passed.");
