# Neon Bastion — design brief

## Player promise

Neon Bastion is a compact, readable tower-defense game about making a few good placements before a wave arrives. The player protects a bright core on a small orbital grid, spends energy on towers, watches the route, and adapts when tougher enemies join the line.

## Product read

- Tone: late-night arcade cabinet, not military command software.
- Visual language: dark blue-black space, warm amber build pads, cyan/coral team colors, quiet grid lines, one bright core.
- Camera: fixed three-quarter orthographic view so the route and tower ranges remain readable on desktop and phone.
- UI: short labels, one primary action, no decorative telemetry that does not change a decision.

## Constraints

- Vite + Three.js, no external runtime services or API keys.
- Procedural meshes and Web Audio keep the game self-contained and fast to load.
- Pointer/touch and keyboard controls must share the same game intents.
- Seeded gameplay randomness and test hooks are part of the runtime, not test-only fakes.
- The build must work at narrow mobile widths and wide laptop ratios.

## Success bar

The first wave should be playable in under 20 seconds: choose a tower, tap a pad, launch a wave, and see a shot or a leak. A player can understand the loss condition from the screen without reading documentation. The board should create at least two plausible placement choices rather than one obviously correct tile.
