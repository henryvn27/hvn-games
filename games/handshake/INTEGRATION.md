# Integration contract

- **Trigger:** open `?game=shelf&play=handshake` from the Games list or hidden-games list.
- **Input:** Share/Keep and an optional saved player name. No external data is needed for play.
- **Output:** one completed 20-hand score, saved per-game and submitted to the existing shared board when configured. The existing opt-in playtime tracker remains unchanged.
- **Next action:** play again, open another game, or view the Handshake board.
- **Adoption:** `SHELF_GAMES` and native mount in `site/src/shelf.js`; leaderboard choice in `site/src/main.js`; shared achievement handling in `site/public/shelf/rewards.js`.
- **Invocation:** `npm ci && npm run dev`, then open `/hvn-games/?game=shelf&play=handshake`.
- **Fallback:** if the shared board is unavailable, keep the score in the existing local board and say so.
- **Rollback:** remove the catalog entry, native mount, leaderboard option, reward event, and `games/handshake/` directory. No shared data migration is used.
- **Proof:** deterministic rules tests, project smoke/build checks, and browser play through three tournaments at desktop and mobile widths.
