# HVN games

A small browser game made to be played, not just shown.

The public page currently opens with [Phasebound](https://henryvn27.github.io/hvn-games/?game=phasebound). It is the only game in this repo for now; a second game should earn its own stack and point of view before it joins the page.

## Install and run

```bash
git clone https://github.com/henryvn27/hvn-games.git
cd hvn-games
npm install
npm run dev
```

Open the local URL Vite prints, then play Phasebound. The public gallery is at <https://henryvn27.github.io/hvn-games/>.

## Play intelligence

The gallery keeps a small play report and local Phasebound leaderboard in this browser only. It stores starts, completed runs, time played, wins, packets, experiment variants, optional run feedback, a score name, and scores you submit. Use `History` or `Best runs` to inspect or reset it. No analytics vendor, account, cookie, network call, or public score service is involved.

Each game can opt into one small experiment at a time. Assignments stay stable on the browser, and the report keeps results separated by variant. This is directional product feedback for a single player, not a claim of statistically valid A/B testing. The daily scout uses the report when available, then combines it with privacy-safe Computer History signals to favor games you replay and improve games you skip.

## Structure

- `site/` is the shared gallery and browser entry point.
- `games/<slug>/` contains the current game runtime and design notes.
- `scripts/` contains repository smoke checks.

## Design read

The gallery is a small game index: paper, ink, one lime action color, and playable previews. Copy is literal. The game should explain itself in the first few seconds.

## License

MIT. See `LICENSE`.
