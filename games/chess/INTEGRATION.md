# Integration contract

- **Trigger:** open Chess from the HVN Games shelf or its direct `?game=shelf&play=chess` route.
- **Input:** pointer/touch squares, arrow keys and Enter, P for pause, and the optional name form after a ladder run.
- **Output:** per-browser best run and an optional shared leaderboard record under game id `chess`; normal game-play telemetry uses the existing shelf tracker.
- **Next action:** start a new ladder run or return to the shared Games list.
- **Adoption point:** `SHELF_GAMES` and `mountNativeShelfGame` in `site/src/shelf.js`; leaderboard selector in `site/src/main.js`.
- **Manual fallback:** `npm ci && npm run dev`, then open `/hvn-games/?game=shelf&play=chess` on the local Vite server.
- **Disable/rollback:** remove the Chess catalog entry, mount branch, leaderboard selector and `games/chess/` module; leave shared shelf data untouched.
- **Proof:** `npm test`, `npm run build`, and browser checks of ladder moves, local checkmate, pause/resume, mobile layout and the live route.
