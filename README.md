# HVN games

A small shelf of focused browser games built to be played, not just shown.

The first game is [Phasebound](https://henryvn27.github.io/hvn-games/?game=phasebound), a 60-second phase-shifting courier run. Match packets to your current phase, dash through the static, and get out before the relay collapses.

## Install and run

```bash
git clone https://github.com/henryvn27/hvn-games.git
cd hvn-games
npm install
npm run dev
```

Open the local URL Vite prints, then choose a game from the shelf. The public gallery is at <https://henryvn27.github.io/hvn-games/>.

## Structure

- `site/` is the shared gallery and browser entry point.
- `games/<slug>/` contains each game runtime and design notes.
- `scripts/` contains repository smoke checks.

## Design read

The gallery is a midnight arcade shelf: quiet graphite surfaces, one warm signal accent, and real playable output as the visual anchor. The game UI stays low-chrome so the playfield gets the attention.

## License

MIT. See `LICENSE`.
