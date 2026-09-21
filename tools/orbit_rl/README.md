# Orbit policy

This folder contains the small Python training environment used by the Orbit autoplay page.

Run a short policy-search pass from the repository root:

```sh
python3 tools/orbit_rl/train.py --iterations 24 --population 24 --episodes 4
```

The command writes `games/phasebound/orbit-policy.json`. The browser imports that
artifact and uses it through `games/phasebound/orbit-policy.js`.

The exported policy is intentionally compact. It chooses a target and steering
direction from the live game state; the game itself still owns collision,
scoring, phase changes, and rendering.
