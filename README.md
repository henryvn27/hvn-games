# HVN games

A small shelf of focused browser games built to be played, not just shown.

The shelf opens with [Phasebound](https://henryvn27.github.io/hvn-games/?game=phasebound), a 60-second phase-shifting courier run. Match packets to your current phase, dash through the static, and get out before the relay collapses. [Echo Lantern](https://henryvn27.github.io/hvn-games/?game=echo-lantern) adds a pulse-to-reveal navigation run: find each beacon before its light fades.

## Install and run

```bash
git clone https://github.com/henryvn27/hvn-games.git
cd hvn-games
npm install
npm run dev
```

Open the local URL Vite prints, then choose a game from the shelf. The public gallery is at <https://henryvn27.github.io/hvn-games/>.

## Play intelligence

The gallery keeps a small play report in this browser only: starts, completed runs, time played, wins, packets, experiment variants, and optional run feedback. Use `My data` in the gallery to inspect, copy, or reset it. No analytics vendor, account, cookie, network call, or personal identifier is involved.

Each game can opt into one small experiment at a time. Assignments stay stable on the browser, and the report keeps results separated by variant. This is directional product feedback for a single player, not a claim of statistically valid A/B testing. The daily scout uses the report when available, then combines it with privacy-safe Computer History signals to favor games you replay and improve games you skip.

## Structure

- `site/` is the shared gallery and browser entry point.
- `games/<slug>/` contains each game runtime and design notes.
- `scripts/` contains repository smoke checks.

## Design read

The gallery is a midnight arcade shelf: quiet graphite surfaces, one warm signal accent, and real playable output as the visual anchor. The game UI stays low-chrome so the playfield gets the attention.

## License

MIT. See `LICENSE`.
