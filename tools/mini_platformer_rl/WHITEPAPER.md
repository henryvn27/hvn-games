# A Receding-Horizon Policy for Mini Platformer

**HVN Games · Technical report · 25 September 2026 · market-trail-cem-v1**

## Abstract

This paper describes market-trail-cem-v1, a compact policy-search controller for Mini Platformer. It observes structured state from the game rules, chooses left/right/jump inputs at 10 Hz, and acts through the same 120 Hz simulation used by manual play. Cross-entropy method (CEM) search tunes twelve interpretable route and movement coefficients on 8 fixed courses. Evaluation holds out 4 different courses, one or more from each world. On these deterministic holdout courses, the initial policy completes 100.0% and the selected policy completes 100.0%; mean completion time changes by -2.54 seconds, mean stars by 0.25, and mean retries by -0.25. The sample is four fixed courses, so these measurements are descriptive of this course set rather than a population-level claim.

## 1. Task and rules

Mini Platformer has three worlds and twelve short courses. A player moves horizontally with acceleration toward a maximum speed of 220 px/s. Gravity is 1,100 px/s², ordinary jump impulse is −440 px/s, and releasing Space early cuts upward velocity to −180 px/s. The game includes a 120 ms jump buffer, 100 ms coyote window, spring pads, sinusoidally moving platforms, ledges that crumble after 0.6 s and return after 2.5 s, three collectible stars, a checkpoint, patrolling enemies, retries, and a finish flag. A player can stomp an enemy from above; a side collision or a fall below the course respawns the player. Collected stars persist across retries within a human attempt.

Training and the in-browser pilot import the same course builder and transition function from **games/mini-platformer/simulation.mjs**. Browser rendering and human key handling remain separate from the transition rules.

## 2. Observation and action

The policy reads player position, velocity, current support, jump grace timers, elapsed time, checkpoint state, collected stars, all platform positions/types/timers, and moving-enemy state. Its action is a held subset of A, D, and Space. Decisions are refreshed every 12 fixed steps (10 Hz at 120 Hz). The policy selects a reachable next surface, then steers toward its landing region. It does not read pixels or browser DOM. Shift has no game mechanic and is therefore not an action.

## 3. Policy and objective

The controller ranks reachable surfaces using forward progress, nearby uncollected stars, patrol exposure, surface stability, springs, checkpoint value, gap distance, and elevation. It commits to a target until landing or respawn, times a jump near the edge, holds it for a searched duration, and brakes toward the target's landing area. The learned vector contains eight route utility coefficients and four movement parameters: look-ahead distance, jump lead, jump hold time, and braking lead. This is policy search over an interpretable controller; it is not a neural network, an imitation model, or a learned visual perception system.

Episode return is computed as

> G = 150 I[finish] + 40 progress + 4 stars - 0.05 seconds - 16 retries - 4 falls - 10 enemy hits

The finish term rewards completion; the remaining terms reward forward travel and route markers while charging for time and failures.

## 4. Search and evaluation protocol

The trainer runs CEM with seed 20260925, 14 generations, a population of 20, and 4 elite candidates per generation. Every candidate sees the same 8 training courses. The next sampling mean and spread are updated from the elites. Search evaluates 2240 candidate-course episodes. The reference is the initial hand-set coefficient vector. Holdout courses are disjoint from search courses and are evaluated from identical initial states; the simulation is deterministic, so there are no repeated random-seed trials or confidence intervals.

## 5. Holdout results

| Course | Reference finished | Selected finished | Reference seconds | Selected seconds | Reference stars | Selected stars | Reference retries | Selected retries |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 3. Canal shortcut | yes | yes | 8.54 | 7.60 | 3 | 3 | 0 | 0 |
| 6. Moving cargo | yes | yes | 14.10 | 8.10 | 3 | 3 | 1 | 0 |
| 9. Garden roof | yes | yes | 8.65 | 8.02 | 3 | 3 | 0 | 0 |
| 12. The final climb | yes | yes | 19.82 | 17.22 | 2 | 3 | 2 | 2 |

Across the 4 holdout courses, completion changes from 100.0% to 100.0%; mean course time changes by -2.54 seconds, stars by 0.25, retries by -0.25, falls by 0.00, and enemy hits by -0.25 per course. The table is the primary evidence; averages over four courses should not be generalized to arbitrary platform games.

## 6. Live decision display

The playable route shows the active key combination, selected surface, planned landing area, a connecting path marker, and the policy's concise reason. The player can take control immediately using A/D, arrows, or Space. Agent-assisted play is a research demonstration and does not update saved progression, stars, best times, achievements, daily challenges, scores, or shared playtime.

## 7. Limitations

The policy sees exact game state, not pixels, and uses a hand-designed route-ranking structure. Its learned parameters optimize a small fixed course set. Only four courses are held out; moving-platform and enemy timing still follow the same deterministic rules, and there is no independent randomized physics perturbation. The evaluation does not establish human-equivalent skill, broad generalization, or performance after the rules change.

## 8. Reproduction

From the repository root, run **node tools/mini_platformer_rl/train.mjs**. The command rewrites **games/mini-platformer/policy.json** and **tools/mini_platformer_rl/WHITEPAPER.md** with the selected coefficients, search history, course split, and paired per-course measurements. Optional arguments are **--iterations**, **--population**, **--seed**, and **--output**.

## References

Rubinstein, R. Y., and Kroese, D. P. *The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning*. Springer, 2004. <https://doi.org/10.1007/978-1-4757-4321-0>.
