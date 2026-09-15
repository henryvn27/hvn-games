# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Friends looking for a quick browser game to start together, compare, and replay without an account or download.

## Product Purpose

HVN games is one public shelf for small browser games made by HVN. It should help a visitor understand the hook, start playing immediately, and find a reason to take another run. Success means a friend can open one link, play without setup, and want to send the link to someone else.

## Positioning

Small authored games with a clear point of view, real playable previews, and an honest feedback loop. The shelf improves from actual play and direct player feedback rather than invented popularity claims.

## Operating Context

The gallery and every game are deployed together from the public `hvn-games` GitHub repository through GitHub Pages. The daily vibecode automation adds or improves games in that repository. Visitors use desktop or mobile browsers and may arrive from a shared link.

## Capabilities and Constraints

- The gallery links to playable routes in the same Pages deployment.
- Each game must have a distinct mechanic, clear first action, readable outcome, and fast restart.
- The current game is Phasebound, a one-minute phase matching run with movement, dash, hazards, score, and streak.
- The gallery may store resettable aggregate play signals in browser localStorage only: starts, runs, time, outcomes, progress, experiment assignment, and explicit feedback.
- No account, third-party analytics, advertising, cookies, fingerprinting, public personal-data endpoint, or external runtime asset dependency.
- Install, setup, verification, and run commands must remain copyable when shown.

## Brand Commitments

- Product name: HVN games.
- The experience is friends-first and game-first, inspired by the useful discovery and instant-play behavior of Poki without copying its brand, assets, layout, wording, or claims.
- The actual shipped game runtime is the gallery preview. Decorative demo canvases and fake screenshots are not acceptable substitutes.
- Direct feedback about game feel, clarity, difficulty, performance, visuals, and replay value becomes a reusable regression rule.
- No AI-slop visual patterns, empty icon slots, or generic marketing filler.

## Evidence on Hand

- Phasebound is a live browser game in `games/phasebound/`.
- The shared gallery is in `site/` and the integration contract is in `INTEGRATION.md`.
- The current public deployment is <https://henryvn27.github.io/hvn-games/>.

## Product Principles

- Put the game before the pitch.
- Make the first action obvious and the next run tempting.
- Use real play signals and direct feedback as evidence, not as a substitute for judgment.
- Keep the data boundary small, local, and resettable.
- Make every game earn its place in the shelf.

## Accessibility & Inclusion

Support keyboard and touch play where relevant, visible focus, readable contrast in light and dark preference modes, reduced-motion behavior, no horizontal overflow, and accessible names for controls. Do not make color the only way to understand a game state.
