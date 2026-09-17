# Integration contract

## Host flow

The host flow is the public `HVN games` gallery. A visitor opens the gallery, chooses a game, and the Play action loads the selected game in the same Pages deployment. This keeps every game discoverable from one durable URL instead of scattering small projects across separate repositories.

## Trigger and input

- Trigger: open the gallery or use a game link such as `?game=phasebound`.
- Input: keyboard, pointer, or touch controls inside the selected game.
- Authorized data: none. The game is local-only and uses no accounts, tracking, uploads, or network calls at runtime.

## Output and next action

- Output: a playable run, a visible result state, and a fast restart path.
- Next action: play again, return to the shelf, or share the public Pages URL.
- Adoption point: `site/src/main.js` owns gallery routing; `games/<slug>/` owns game runtime code.

## Play intelligence contract

- Storage: browser `localStorage` under `hvn-games:play-intelligence:v1`.
- Events: gallery view, run start, completed run, win or loss, time played, packets delivered, experiment variant, and optional feedback (`keep`, `hard`, or `skip`).
- Privacy boundary: local-only and resettable. No analytics vendor, account, cookie, network request, or identifier is used.
- Decision use: the gallery shows the local report; the daily scout reads it when a browser session exposes it and uses Computer History route frequency as a coarse fallback. High replay signals identify favorites. Low starts, short sessions, repeated losses, and negative feedback create improvement candidates.
- Experiment rule: one clearly named variable per game at a time, stable assignment per browser, and variant results kept separate. Treat the results as directional for one player until a consented multi-player data path exists.
- Adoption point: `site/src/play-intelligence.js` is the shared client layer. New games call `createGameTracker` and register one experiment only when the change is meaningful.

The current shelf has four intentionally different loops: Phasebound (movement and phase matching), Skyhook (one-button altitude and gate threading), Last Call (timed precision shots), and Echo Lantern (pulse-to-reveal navigation). New games should add a new verb or decision, not another skin for an existing loop.

Echo Lantern proof contract: the gallery preview and `?game=echo-lantern` route both call `startEchoLantern`; the DOM action button invokes `light`, while keyboard Space and pointer input invoke the same pulse action. A run exposes `mode`, `score`, `streak`, `packets`, `timeLeft`, and `energy` to the shared tracker and ends in a visible win or loss state with R/restart and Back to shelf paths.

## Echo Lantern touch path

- Trigger: open `?game=echo-lantern` on a narrow viewport and start a run.
- Input: hold the four directional touch controls to move; use Pulse to reveal a beacon; use Pause to suspend the run.
- Output: the same movement, pulse, pause, result, and restart states as keyboard play.
- Adoption point: `site/src/main.js` renders the narrow controls and `games/echo-lantern/echo-lantern.js` maps them into the runtime.
- Privacy boundary: no new data or browser permission; controls only change in-memory run state.
- Rollback: remove the `arcade-touch-controls` block and `setTouchDirection` bridge to restore the previous route.
- Proof run: smoke checks confirm the bridge and markers; browser QA must hold each direction, pulse, pause, restart, and return to shelf on desktop and narrow viewports.

## Proof run

The proof run must build the site, boot it through the intended local or Pages route, click Play, exercise the primary verbs, complete or fail a run, and verify the restart and back-to-shelf paths. Browser screenshots cover the gallery, active play, and result states on desktop and narrow mobile.

## Manual fallback and rollback

If the gallery route is unavailable, run the repo locally with `npm install` followed by `npm run dev`. A bad game can be disabled by removing its gallery entry and route while preserving the other games. Never rewrite history; revert the scoped commit if a published change needs to be withdrawn.
