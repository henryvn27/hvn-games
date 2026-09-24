# Driftlock

Six runs through one orbital repair chamber whose gravity keeps turning. Gather three signal cells, then steer into the hatch before the loose core reaches you.

## Play

Open HVN Games and choose **Driftlock**, or open `?game=shelf&play=driftlock` from the gallery route.

- Arrow keys or WASD: thrust
- Space: rotate gravity (cells restore a pulse)
- P or Escape: pause
- R: restart
- On touch screens, use the four thrust controls and Pulse below the chamber

A complete run crosses six sectors. Your best time is stored in this browser only.

## Build on the shared site

```sh
git clone https://github.com/henryvn27/hvn-games.git
cd hvn-games
npm ci
npm test && npm run build
npm run dev
```

The gallery route is `http://localhost:5173/?game=shelf&play=driftlock`.

## Design and implementation

The playfield is rendered with Phaser 3 and original vector shapes. `simulation.js` owns fixed-step movement, gravity, cells, hazard contact, docking, and run state. `driftlock.js` adapts keyboard and touch controls and renders the state. No external assets, network calls, accounts, analytics, or leaderboard writes are used.

Mechanic research: [frankstop/ThisIsTheOnlyLevel](https://github.com/frankstop/ThisIsTheOnlyLevel). GitHub reports no declared license for that repository, so it was used only to study the broad idea of changing rules around one shared space. Driftlock uses original code, art, geometry, level design, and copy; no upstream code or assets are included.

## Launch post draft

> Driftlock is a six-sector flight through one orbital repair chamber. Turn gravity, collect the signal cells, and make the airlock before the loose core catches up. It’s free to play in the HVN Games gallery; your best time stays in your browser.
