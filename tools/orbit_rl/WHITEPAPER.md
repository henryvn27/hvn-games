# A Phase-Aware Collection Policy for Orbit

**HVN Games · Technical report · 25 September 2026 · `orbit-human-controls-v2`**

## Abstract

This report documents a structured controller for Orbit, a two-phase collection game with moving hazards, an energy meter, collision lives, and score-triggered extra-life pickups. Cross-entropy method (CEM) search tunes six policy coefficients in a compact Python simulator; the browser policy applies the resulting parameters in the Phaser game loop. The policy expresses movement as WASD, phase changes as Space, and evasive bursts as Shift. A phase-cooldown gate prevents routing toward an opposite-color packet until a switch can be applied. On 12 paired held-out simulator episodes, the selected policy collected more extra lives on average than the initial coefficient vector (1.67 vs. 1.08), while mean score and survival were lower (7,314 vs. 7,635 points; 37.15 vs. 40.00 seconds). Wrong-color pickups were zero for both policies on this holdout. The results show a life-collection tradeoff, not an overall performance gain or a human-play comparison.

## 1. Environment

The browser game uses a 960 × 640 field. The player collects cyan or amber packets; a packet is safe only when its phase matches the player. Matching increases score, streak, and energy. A wrong-phase packet breaks the streak and removes 18 energy. Moving planets consume a life on collision; a collision with no remaining life ends the run. Energy depletion is also terminal. Reaching score thresholds spawns a collectible extra life. Phaser owns the authoritative live rules and rendering.

The training environment models seeded packet placement, movement inertia, phase switching and its 450 ms action cadence, dashes and their cooldown, wrong-color penalties, score thresholds, extra-life collection, moving hazards, collision lives, and energy loss. It is a compact approximation of the browser implementation, not a shared runtime module. Spawn placement, evolving hazard layouts, and frame scheduling can still differ. This simulator boundary is a principal threat to external validity.

## 2. Observation and action

The observation contains player position and velocity, current phase, phase number, packet positions and phases, hazard positions and sizes, energy, lives, elapsed time, phase-toggle time, dash cooldown, and any active extra-life pickup. The policy does not consume pixels or browser DOM.

The action is a normalized direction quantized to W, A, S, and D, plus optional Space and Shift actions. The browser queries the policy at 20 Hz and lets the game apply movement inertia and collision rules. During phase cooldown, the candidate set excludes packets of the other phase; when a phase change is selected and available, it occurs before the corresponding movement is applied. This gate prevents a nearby wrong-color target from being approached while a switch is still unavailable.

## 3. Policy and objective

Each packet is scored by phase match, distance, local hazard clearance, and wrong-phase packets intersecting the direct travel segment. A shallow route offset and local repulsion provide clearance around wrong-phase packets; hazard avoidance, edge correction, and life-pickup value influence the movement vector and target selection. The live decision trace exposes the selected target, intended keys, nearby hazard, and short rationale. A player may take control at any time.

The Python trainer uses CEM to search match, proximity, hazard-risk, extra-life, avoidance, and wrong-phase-route coefficients. Candidate episodes receive shared seeded initial conditions within each generation. The episode return rewards matching packets and extra lives and applies fixed costs for wrong-phase pickups, collision deaths, life loss, and energy death. This is black-box policy search over an interpretable hand-designed controller; it is not a neural network and uses no human demonstrations.

## 4. Training and evaluation

The recorded training configuration uses seed 20260925, 24 generations, 24 candidates per generation, 4 episodes per candidate, and a 1,000-step episode limit. The initial hand-set vector is the reference. Evaluation uses the same 12 held-out seeds for both vectors, beginning at seed 21260928 with stride 997. Reported values are per-episode means. The held-out sample is small, and the evaluation is deterministic conditional on its seeds; no population-level confidence interval is reported.

## 5. Results

| Metric | Initial policy | Selected policy | Change |
| --- | ---: | ---: | ---: |
| Score | 7,635.0 | 7,313.5 | −321.5 |
| Matching pickups | 19.58 | 18.83 | −0.75 |
| Extra lives collected | 1.08 | 1.67 | +0.58 |
| Survival (s) | 40.00 | 37.15 | −2.85 |
| Energy remaining | 85.52 | 77.36 | −8.15 |
| Wrong-color pickups | 0.00 | 0.00 | 0.00 |
| Collision deaths | 0.00 | 0.08 | +0.08 |
| Energy deaths | 0.00 | 0.00 | 0.00 |

The selected vector collected more extra lives on these episodes but did not improve score, survival, or matching pickups. Neither policy collected a wrong-color packet in this holdout, so these data cannot quantify the cooldown fix’s effect. The browser cooldown gate addresses a runtime action-safety path directly; a larger, browser-aligned evaluation is still needed to measure its impact.

## 6. Limitations and interpretation

These measurements do not establish human-equivalent play, improved overall performance, or reliable behavior under altered rules. The agent observes exact structured state rather than visual input. The Python simulator approximates Phaser behavior, the holdout contains only 12 episodes, and the selected coefficients trade some survival and score for extra-life collection. The live panel reports why a run ends as energy depletion or a final planet collision, but that explanation does not make the simulator and browser dynamics identical.

## 7. Reproduction

From the repository root, run:

```sh
python3 tools/orbit_rl/train.py
```

The trainer writes `games/phasebound/orbit-policy.json`, including the selected coefficients, search configuration, simulator description, and paired holdout means. The browser reads that artifact through `games/phasebound/orbit-policy.js`. The interactive paper and decision display are available at `?game=orbit-rl`.

## Reference

Rubinstein, R. Y., and Kroese, D. P. *The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning*. Springer, 2004. [doi:10.1007/978-1-4757-4321-0](https://doi.org/10.1007/978-1-4757-4321-0).
