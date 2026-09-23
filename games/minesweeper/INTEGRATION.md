# Minesweeper integration

- Trigger: choose **Minesweeper** from the HVN Games shelf, or open `?game=shelf&play=minesweeper`.
- Input: anonymous pointer/touch and keyboard actions on semantic grid buttons; no account or user text is read during play.
- Invocation: shelf Play route dynamically imports `games/minesweeper/runtime.js`; the rules live in `games/minesweeper/rules.js`.
- Output: a clear/loss state and a per-difficulty local best. A clear may save a score under the existing `minesweeper` per-game leaderboard key. The existing shared display-name prompt is reused; no score is sent until a round is won.
- Next action: replay or return to all games. When browser-local playtime sharing is enabled, the existing tracker counts this route as `minesweeper`.
- Adoption point: `site/src/shelf.js`, shelf item id `minesweeper`.
- Privacy: anonymous play stays in the browser unless the visitor has opted into grouped playtime or submits a winning score. No new service or tracking library is added.
- Manual fallback: run `npm run dev` and open `http://127.0.0.1:5173/hvn-games/?game=shelf&play=minesweeper`.
- Disable/rollback: remove the one active shelf entry and dynamic mount branch in a normal additive revert; the rest of the catalog is untouched.
- Proof: `node games/minesweeper/rules.test.mjs`, `npm test`, `npm run build`, then desktop/mobile browser play through opening, flag, keyboard, safe move, loss, clear, leaderboard save fallback, and restart.
