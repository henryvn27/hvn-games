# Integration contract

## Host flow

The host flow is the public `HVN games` page. A visitor opens the gallery and a Play action loads one of the visible games in the same Pages deployment. Comet is archived and hidden from the gallery; its native route remains in the repository for recoverability.

## Trigger and input

- Trigger: open the gallery and use a visible game link such as `?game=orbit`.
- Input: Orbit uses keyboard, pointer, or touch controls. Comet uses keyboard arrows/WASD, Space/P pause, and visible touch direction buttons.
- Authorized data: gameplay is anonymous. If the optional shared board is configured, only a player-chosen display name, score, game id, counters, submission id, and server timestamp are sent to Supabase. Google AdSense is a separate third-party request after the visitor chooses to allow ads.

## Output and next action

- Output: a playable run, a visible result state, a browser-local fallback score, and, when configured, a shared per-game top-10 board.
- Next action: play again, return to the page, or share the public Pages URL.
- Adoption point: `site/src/main.js` owns gallery routing; `games/phasebound/` and `games/comet/` own the game runtimes.

## Play intelligence contract

- Storage: browser `localStorage` under `hvn-games:play-intelligence:v1`.
- Events: gallery view, run start, completed run, win or loss, time played, packets collected, experiment variant, and optional feedback (`keep`, `hard`, or `skip`).
- Privacy boundary: the play-intelligence report is local-only and resettable. It does not send gameplay events to an analytics vendor or server; the separate AdSense integration is documented below.
- Decision use: the gallery shows the local report. High replay signals identify favorites; low starts, short sessions, repeated losses, and negative feedback create improvement candidates.
- Experiment rule: one clearly named variable per game at a time, stable assignment per browser, and variant results kept separate. Treat the results as directional for one player until a consented multi-player data path exists.
- Adoption point: `site/src/play-intelligence.js` is the shared client layer.

The gallery now features Orbit and the other visible game routes. Comet remains archived in source but is not presented as a playable gallery choice. New games should add a new verb or decision, not another skin for the same loop.

## Comet source boundary

- Source selected: https://github.com/adrianov/snake
- License: MIT, copyright Peter Adrianov (2025)
- Adaptation: native Phaser implementation, new board, copy, visuals, controls, and game shell. No upstream source, assets, or interface are copied into the runtime.
- Browser boundary: local-only best score under `hvn-games:comet-best:v1`; no game account, gameplay tracking, or external runtime assets.
- Proof run: local `?game=comet` route, gallery link, start countdown, keyboard steering, touch direction buttons, pause/resume, collision result, and restart.

## Advertising boundary

- Publisher: Google AdSense `ca-pub-1123012671033143`, loaded once from `site/index.html` for page-level Auto ads.
- Consent: requests begin paused; `site/src/ads.js` resumes non-personalized requests only after the visitor chooses “allow ads” and provides an “ad settings” reset.
- Placement: page-level Auto ads keep the game canvas unobstructed; no ad is manually overlaid on the playfield and no ad slot ID was invented because the supplied snippet is the Auto ads snippet.
- Policy gap: Google’s certified CMP and regional privacy messages still need to be configured in the AdSense account before serving personalized ads to EEA, UK, or Swiss visitors. This code does not claim that account-side setup is complete.
- Privacy page: `site/public/privacy.html` documents local game storage and the AdSense data flow.

## Orbit proof contract

The gallery preview and `?game=orbit` route both call `startPhasebound`. The legacy `?game=phasebound` route remains accepted for old links. The route uses button-triggered 3/2/1/GO countdowns, records a completed score only after the player chooses to save it, and exposes `mode`, `score`, `packets`, `heat`, `energy`, `dashCooldown`, and `elapsed`. It has no packet target or time limit.

## Leaderboard boundary

`site/public/leaderboard-client.js` uses a small Google Apps Script web app without adding a client dependency. `site/public/leaderboard-config.js` contains only the public web-app URL. The script validates game ids, display names, numeric bounds, and stable submission ids, then stores rows in a private Google Sheet with a script lock for concurrent writes. The client falls back to local storage if the service is unconfigured or unavailable. On first connection it migrates cached local entries once per browser; the stable submission id makes retries idempotent. Public scores are not verified achievements, so the sheet needs moderation or stronger server-side validation before treating it as authoritative competition.

## Proof run

The proof run must build the site, boot it through the intended local or Pages route, click Play, verify the 3/2/1 countdown, exercise the primary verbs, complete or fail a run, choose whether to save the result, and verify the restart and back-to-shelf paths. Browser screenshots cover the gallery, active play, result prompt, and narrow mobile layout.

## Manual fallback and rollback

If the gallery route is unavailable, run the repo locally with `npm install` followed by `npm run dev`. A bad game can be disabled by removing its gallery entry and route while preserving Orbit. Never rewrite history; revert the scoped commit if a published change needs to be withdrawn.
