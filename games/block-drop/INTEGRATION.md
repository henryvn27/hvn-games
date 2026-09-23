# Block Drop integration

- Trigger: choose Block Drop from the hidden-games page or open `?game=shelf&play=block-drop`.
- Input: keyboard actions (left/right, rotate, hold, drop, pause) or the four on-screen touch controls.
- Output: score and cleared-row count; local best; optional local and shared score submission under the distinct `block-drop` board; shared playtime only when the site's playtime setting is enabled.
- Next action: restart immediately or return to the gallery. The home page ranking can feature it after shared playtime or a feature request; it does not displace the existing top ten by default.
- Adoption point: `SHELF_GAMES`, native mount routing in `site/src/shelf.js`, and the per-game leaderboard picker in `site/src/main.js`.
- Manual fallback: direct route `?game=shelf&play=block-drop`; all gameplay remains local if the leaderboard service is unavailable.
- Rollback: revert the additive Block Drop commit. No shared game runtime or existing game rules are replaced.
- Proof: `node games/block-drop/simulation.test.mjs`, `npm test`, `npm run build`, and desktop/mobile browser playtests at the native shelf route.
