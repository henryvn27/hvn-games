# Future games

The shared shelf is the product: every game has a native route, distinct rules, layout, HUD, and replay hook. The home page features the ten most-played games; the rest stay reachable from the full games list without displacing that ranking.

## Added in this pass

- **Block Drop** — falling-piece placement and line clearing, with seven-piece bags, hold, ghost landing preview, levels, and a per-game high-score board.
- Source study: [Tetr.js](https://github.com/simonlc/tetr.js), MIT licensed. Only mechanics were used as reference; the HVN game is fresh code and art.
- **Tidepool** — build a shoreline and keep kelp alive through three rising tides. It is an original local cellular simulation with its own score board.
- Source study: [Sandspiel](https://github.com/MaxBittker/sandspiel), MIT licensed. Only the broad falling-material sandbox idea informed the design; no upstream code or assets are used.
- **Chess** — play the quick ladder against a computer that gets stronger after each win, or pass the board for local two-player. The game uses the BSD-2-licensed [`chess.js`](https://github.com/jhlywa/chess.js) library for rules and legal moves; the board, opponent, ladder, and presentation are original.
- **Handshake** — play a 20-hand neighborhood tournament against four opponents with distinct response rules. The repeated-choice tournament structure was studied from Nicky Case’s [The Evolution of Trust](https://github.com/ncase/trust), released under CC0; all code, scoring, art, copy, and UI here are original.

## Added in this pass

GitHub popularity, license, and last-pushed metadata checked 2026-09-24. Star counts change over time; push dates describe the upstream repositories, not this implementation.

- **Maze Chase** — a Pac-Man-style maze game with dot collection, one pathfinding pursuer, power orbs, lives, and a clear/win state. Reference: [`mumuy/pacman`](https://github.com/mumuy/pacman), MIT, 1,644 stars, last pushed 2026-05-07. Map/pellet, power-up, and pursuit mechanics informed a fresh simulation; no source code, maps, or assets were copied. This is the single Pac-Man-like addition in this pass.
- **Asteroids** — steer, thrust, fire, split rocks, and clear three waves. Reference: [dmcinnes/HTML5-Asteroids](https://github.com/dmcinnes/HTML5-Asteroids), MIT, 355 stars, last pushed 2024-04-19. Asteroids rules informed a fresh simulation and canvas presentation; no upstream code or assets were copied.
- **Mahjong Solitaire** — a compact layered 40-tile matching board with free-side rules, hints, reshuffle, and replay. Reference: [`ffalt/mah`](https://github.com/ffalt/mah), MIT, 148 stars, last pushed 2026-09-18. The tile availability and pair-removal rules informed a simplified original layout; no code, layouts, or art were copied.
- **Klondike** — a native seven-column deal with stock/waste cycling, tableau runs, foundations, and scoring. Reference: [`gcedo/react-solitaire`](https://github.com/gcedo/react-solitaire), MIT, 182 stars, last pushed 2019-10-28. This replaces the weaker 81-star reference with a real playable browser game. Its older activity is recorded explicitly; standard Klondike rules informed the model, and no upstream code, interface, or card art is used.
- **Spookyball** — a native 2D paddle-and-ball game with angled rebounds, lives, a brick wall, and local/shared score entry. Reference: [`toji/spookyball`](https://github.com/toji/spookyball), MIT, 144 stars, last pushed 2026-06-09. Only the broad Breakout-style loop was studied; this version uses original 2D canvas rendering and fresh code, with none of the upstream WebGPU or 3D assets.

## Next additions

Choose games with a distinct primary decision, meaningful replay, and a permissive source license. Rebuild the rules and presentation for the shared shelf rather than embedding an upstream site or copying its interface. Give each game a distinct route and leaderboard id.
