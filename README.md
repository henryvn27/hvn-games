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

The gallery keeps a small local Orbit leaderboard and play report in this browser only. It stores starts, completed runs, time played, wins, packets, experiment variants, optional run feedback, a score name, and scores you submit. The play report itself uses no analytics vendor, account, or public score service.

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
