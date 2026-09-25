# Shot Search for Pocket Greens

**HVN Games · Technical report · 25 September 2026 · `pocket-greens-shot-cem-v1`**

## Abstract

We evaluate a shot-selection controller for Pocket Greens, a six-course putting game with banks, sand, water returns, and a ten-stroke pickup rule. The policy searches discrete angle and power candidates using a short-horizon simulation and learned value coefficients. CEM uses 14 generations, 20 candidates per generation, and 4 episodes over rotating subsets of the first four holes. The final comparison uses the two remaining course layouts: The Garden Gates and The Clubhouse. Reference and trained policies both average 6.0 strokes per hole, sink one of two holes, incur no water penalties, and complete one course episode. They tie on each held-out course. The experiment therefore provides no evidence of a holdout performance improvement.

## 1. Environment

Pocket Greens is a fixed course putting game. Each settled ball lie is evaluated against the cup and the fixed wall, sand, and water geometry. Walls reflect the ball; sand increases drag; water returns it to the previous lie and applies a penalty stroke; and a sufficiently slow ball inside the cup is sunk. A hole ends when the ball is sunk or the ten-stroke pickup limit is reached. `games/mini-golf/simulation.mjs` supplies the fixed-step shot transitions used by the trainer and live pilot.

## 2. State and action

The policy observes the ball lie, cup position, current course geometry, and stroke count. Its action is one angle and launch-power pair. Once the ball settles, it observes the new lie and chooses again. In the browser demonstration, a shot is animated from the sampled trajectory points; the player may take control between shots using the offered keyboard controls.

## 3. Candidate evaluation and search

The controller samples candidate angles and powers, simulates each shot, and ranks the results using predicted sink, distance progress, water return, overshoot, time in sand, and stroke cost. CEM tunes the six corresponding coefficients. Search uses holes 1–4, drawing episodes from four fixed three-hole training subsets. The Garden Gates and The Clubhouse are held out. This is optimization-based search over a short-horizon evaluator, not a learned perception model.

## 4. Evaluation protocol

The recorded run uses seed 20260925, 14 generations, a population of 20, and 4 episodes per candidate. The reference is the initial hand-set coefficient vector. Because the holdout consists of two fixed layouts and each game is deterministic, the comparison reports course-level outcomes rather than an episode-level confidence interval. Repeating the same layout would not create additional independent courses.

## 5. Held-out results

| Course | Reference strokes | Selected strokes | Reference outcome | Selected outcome |
| --- | ---: | ---: | --- | --- |
| The Garden Gates | 10 | 10 | Picked up | Picked up |
| The Clubhouse | 2 | 2 | Sunk | Sunk |
| **Mean / total** | **6.0 per hole** | **6.0 per hole** | **1 of 2 sunk** | **1 of 2 sunk** |

Both policies incur zero water penalties and reach the course episode’s completion condition, which includes the pickup limit. The policy search does not improve either held-out course over the reference. That tie is the principal result; coefficient optimization on training layouts is not evidence of generalization.

## 6. Limitations

The holdout contains only two hand-authored layouts, and the policy has access to exact course geometry. There are no randomized courses, turf perturbations, hidden obstacles, human comparison, or confidence interval across a course population. The experiment does not show an advantage over the reference controller. Further work should test new layouts and physics perturbations before making broader claims.

## 7. Reproduction

From the repository root, run:

```sh
node tools/mini_golf_rl/train.mjs --iterations 14 --population 20 --episodes 4
```

This writes `games/mini-golf/policy.json` with the selected coefficients, fixed training/holdout split, course-level results, and search history. The interactive demo and paper are available at `?game=mini-golf-rl`.

## Reference

Rubinstein, R. Y., and Kroese, D. P. *The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning*. Springer, 2004. [doi:10.1007/978-1-4757-4321-0](https://doi.org/10.1007/978-1-4757-4321-0).
