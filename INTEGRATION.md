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

## Proof run

The proof run must build the site, boot it through the intended local or Pages route, click Play, exercise the primary verbs, complete or fail a run, and verify the restart and back-to-shelf paths. Browser screenshots cover the gallery, active play, and result states on desktop and narrow mobile.

## Manual fallback and rollback

If the gallery route is unavailable, run the repo locally with `npm install` followed by `npm run dev`. A bad game can be disabled by removing its gallery entry and route while preserving the other games. Never rewrite history; revert the scoped commit if a published change needs to be withdrawn.
