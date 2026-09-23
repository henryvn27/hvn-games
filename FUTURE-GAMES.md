# Future games

The shared shelf is the product: every game has a native route, distinct rules, layout, HUD, and replay hook. The home page features the ten most-played games; the rest stay reachable from the full games list without displacing that ranking.

## Added in this pass

- **Block Drop** — falling-piece placement and line clearing, with seven-piece bags, hold, ghost landing preview, levels, and a per-game high-score board.
- Source study: [Tetr.js](https://github.com/simonlc/tetr.js), MIT licensed. Only mechanics were used as reference; the HVN game is fresh code and art.
- **Tidepool** — build a shoreline and keep kelp alive through three rising tides. It is an original local cellular simulation with its own score board.
- Source study: [Sandspiel](https://github.com/MaxBittker/sandspiel), MIT licensed. Only the broad falling-material sandbox idea informed the design; no upstream code or assets are used.
- **Chess** — play the quick ladder against a computer that gets stronger after each win, or pass the board for local two-player. The game uses the BSD-2-licensed [`chess.js`](https://github.com/jhlywa/chess.js) library for rules and legal moves; the board, opponent, ladder, and presentation are original.
- **Handshake** — play a 20-hand neighborhood tournament against four opponents with distinct response rules. The repeated-choice tournament structure was studied from Nicky Case’s [The Evolution of Trust](https://github.com/ncase/trust), released under CC0; all code, scoring, art, copy, and UI here are original.

## Next additions

Choose games with a distinct primary decision, meaningful replay, and a permissive source license. Rebuild the rules and presentation for the shared shelf rather than embedding an upstream site or copying its interface. Give each game a distinct route and leaderboard id.
