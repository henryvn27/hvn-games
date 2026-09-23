# HVN games

A small browser game made to be played, not just shown.

The public page currently opens with [Orbit](https://henryvn27.github.io/hvn-games/?game=phasebound). [Neon Bastion](http://127.0.0.1:5173/hvn-games/?game=neon-bastion) is the separate Three.js tower-defense route; it has its own board, visual language, and input loop. Comet is archived and hidden from the gallery.

## Install and run

```bash
git clone https://github.com/henryvn27/hvn-games.git
cd hvn-games
npm install
npm run dev
```

Open the local URL Vite prints, then play Orbit or visit `?game=neon-bastion` for the tower-defense route. The public gallery is at <https://henryvn27.github.io/hvn-games/>.

## Play intelligence

The gallery keeps a local fallback board in this browser and can use a shared, anonymous leaderboard for the games. Scores use a player-chosen display name, score, game id, and a few game-specific counters; no account or gameplay analytics is required. The live board is a small Google Apps Script web app backed by a private Google Sheet. Its public web-app URL is the only value in [`site/public/leaderboard-config.js`](site/public/leaderboard-config.js), so no database key is shipped to the browser. When a browser first sees the live endpoint, it retries its previously cached local scores and marks each successful migration with a stable submission id, preventing duplicates.

The site also includes Google AdSense page-level Auto ads. Requests start paused and only resume after the visitor chooses “allow ads”; “ad settings” can reopen that choice. See [`site/public/privacy.html`](site/public/privacy.html) for the current data-flow note. Before public monetization, configure Google’s certified consent message in AdSense for any EEA, UK, or Swiss traffic.

Each game can opt into one small experiment at a time. Assignments stay stable on the browser, and the report keeps results separated by variant. This is directional product feedback for a single player, not a claim of statistically valid A/B testing. The daily scout uses the report when available, then combines it with privacy-safe Computer History signals to favor games you replay and improve games you skip.

## Structure

- `site/` is the shared gallery and browser entry point.
- `games/<slug>/` contains the current game runtime and design notes.
- `scripts/` contains repository smoke checks.

## Design read

The gallery is a small game index: a sky-blue flyer, navy ink, one coral action color, and a playable preview. Copy is literal. The game should explain itself in the first few seconds.

## License

MIT. See `LICENSE`.


## Driftlock

Turn gravity inside one orbital repair chamber. Gather three signal cells and steer into the airlock across six sectors. Your best time stays in this browser.

Play from the gallery at `?game=shelf&play=driftlock`. Controls: arrows or WASD to thrust, Space to rotate gravity, P or Escape to pause, and R to restart. Touch controls appear on narrow screens.

Mechanic research: [frankstop/ThisIsTheOnlyLevel](https://github.com/frankstop/ThisIsTheOnlyLevel), MIT. Driftlock uses the broad “same space, changed rules” idea; its game code, art, geometry, stages, and copy are original. See [games/driftlock/README.md](games/driftlock/README.md) and [games/driftlock/DESIGN.md](games/driftlock/DESIGN.md) for the implementation and design read.

Launch post draft: “Driftlock is a six-sector flight through one orbital repair chamber. Turn gravity, collect the signal cells, and make the airlock before the loose core catches up. Play in the HVN Games gallery; your best time stays in your browser.”
