# Integration contract

## Host flow

The host flow is the public `HVN games` page. A visitor opens the page and the Play action loads Phasebound in the same Pages deployment. It is the only game route currently shipped.

## Trigger and input

- Trigger: open the gallery or use a game link such as `?game=phasebound`.
- Input: keyboard, pointer, or touch controls inside the game.
- Authorized data: none. The game is local-only and uses no accounts, tracking, uploads, or network calls at runtime.

## Output and next action

- Output: a playable run, a visible result state, and a fast restart path.
- Next action: play again, return to the page, or share the public Pages URL.
- Adoption point: `site/src/main.js` owns gallery routing; `games/phasebound/` owns the game runtime.

## Play intelligence contract

- Storage: browser `localStorage` under `hvn-games:play-intelligence:v1`.
- Events: gallery view, run start, completed run, win or loss, time played, packets collected, experiment variant, and optional feedback (`keep`, `hard`, or `skip`).
- Privacy boundary: local-only and resettable. No analytics vendor, account, cookie, network request, or identifier is used.
- Decision use: the gallery shows the local report. High replay signals identify favorites; low starts, short sessions, repeated losses, and negative feedback create improvement candidates.
- Experiment rule: one clearly named variable per game at a time, stable assignment per browser, and variant results kept separate. Treat the results as directional for one player until a consented multi-player data path exists.
- Adoption point: `site/src/play-intelligence.js` is the shared client layer.

The current public shelf has one game: Phasebound, with color matching and escalating hazards. New games should add a new verb or decision, not another skin for the same loop.

## Phasebound proof contract

The gallery preview and `?game=phasebound` route both call `startPhasebound`. The route uses button-triggered 3/2/1/GO countdowns, records a completed score only after the player chooses to save it, and exposes `mode`, `score`, `packets`, `heat`, `energy`, `dashCooldown`, and `elapsed`. It has no packet target or time limit.

## Leaderboard boundary

Scores and the remembered three-letter code or name currently live in the browser that saved them. The UI asks before saving a finished run and prevents the same result frame from writing twice. A shared board needs a hosted write API with rate limits, validation, and abuse handling; GitHub Pages alone cannot safely provide that write path.

## Proof run

The proof run must build the site, boot it through the intended local or Pages route, click Play, verify the 3/2/1 countdown, exercise the primary verbs, complete or fail a run, choose whether to save the result, and verify the restart and back-to-shelf paths. Browser screenshots cover the gallery, active play, result prompt, and narrow mobile layout.

## Manual fallback and rollback

If the gallery route is unavailable, run the repo locally with `npm install` followed by `npm run dev`. A bad game can be disabled by removing its gallery entry and route while preserving Phasebound. Never rewrite history; revert the scoped commit if a published change needs to be withdrawn.
