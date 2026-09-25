# Interpretable Pursuit and Evasion in Asteroids

**HVN Games · Technical report · 25 September 2026 · `asteroids-intercept-cem-v1`**

## Abstract

This paper presents a structured controller for the native three-wave Asteroids game. It leads shots toward moving rocks, estimates projected collision approach, and selects rotation and thrust while continuously firing. CEM tunes six tactical coefficients over 16 generations, 20 candidates per generation, and 8 common training seeds. Evaluation pairs the initial and selected policies on 48 unseen seeds with a 60-second cap. Mean score rises from 2,803.75 to 3,083.75 and mean waves cleared from 0.854 to 0.938. The paired score difference is 280 points (95% bootstrap interval −22.71 to 587.50), which includes zero. Mean survival falls by 0.64 seconds, with a 95% interval from −3.17 to 2.06 seconds. Neither policy completes three waves on the holdout. These results are descriptive simulator outcomes, not a demonstrated general performance gain.

## 1. Environment

The seeded environment implements the current toroidal field and three-wave rules. Ship thrust and rotation have inertia; bullets have finite lifetime; large rocks split into smaller rocks; collisions consume one of three ships; and invulnerability follows a hit. The deterministic transitions in `games/asteroids/simulation.mjs` are shared by training and the live browser policy display. The browser rendering layer is not part of the learned controller.

## 2. Observation and action

The observation includes ship position, heading, velocity, current wave, lives, bullets, and every asteroid’s position, velocity, and size. The action chooses left or right rotation, thrust, and Space fire. It is held for six 60 Hz simulation ticks before the next policy decision. The controller reads structured game state rather than pixels.

## 3. Policy and objective

For each candidate action, the controller scores target rocks by value and firing alignment, leads its aim using target motion, and projects the ship’s motion against asteroid trajectories. If projected clearance falls below the learned panic threshold, it prioritizes evasion; otherwise it steers toward a learned cruise speed while firing. CEM searches aim strength, collision aversion, cruise speed, turn deadband, panic threshold, and lead time. Episode return combines score, wave progress, survival, remaining lives, and a completion bonus.

This is optimization over an interpretable pursuit-and-evasion rule set. It is not a neural policy or a pixel-based learner.

## 4. Search and evaluation protocol

Training seed is 20260925. Each of the 16 generations evaluates 20 candidates on the same 8 training seeds; the top 20% update the search distribution. Episodes stop on ship loss or after 3,600 ticks (60 seconds). Holdout uses 48 disjoint seeds beginning at `seed + 1,000,003` with stride 7,919. The initial hand-set weights and selected weights are paired on each seed. Percentile intervals use 3,000 paired bootstrap resamples.

## 5. Held-out results

| Metric | Initial policy | Selected policy | Paired change (95% interval) |
| --- | ---: | ---: | ---: |
| Score | 2,803.75 | 3,083.75 | +280.00 [−22.71, 587.50] |
| Waves cleared | 0.854 | 0.938 | +0.084 |
| Survival (s) | 58.34 | 57.70 | −0.64 [−3.17, 2.06] |
| Lives remaining | 1.896 | 1.833 | −0.063 |
| Collision end rate | 12.5% | 14.6% | +2.1 pp |
| Three-wave clear rate | 0% | 0% | 0 pp |

Score and wave-clear means increase modestly, but the paired score interval includes zero. Survival is slightly lower on average, with an interval that also includes zero, while the collision-end rate is higher. No three-wave completion occurred. The data do not establish a robust performance gain.

## 6. Limitations

The agent observes exact state and is evaluated on a 60-second cap. The study does not measure a human baseline, visual perception, input latency, altered asteroid physics, or play beyond the third-wave objective. Mean score, survival, and completion are separate outcomes and should not be collapsed into a claim of “better play.” The live demonstration uses the same simulation module as training, but browser frame timing and rendering remain outside the experiment.

## 7. Reproduction

From the repository root, run:

```sh
node tools/asteroids_rl/train.mjs --iterations 16 --population 20 --episodes 8 --holdout-episodes 48
```

The trainer writes `games/asteroids/policy.json`. Its selected coefficients and the training and holdout protocol are shown in the live paper at `?game=asteroids-rl`.

## Reference

Rubinstein, R. Y., and Kroese, D. P. *The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning*. Springer, 2004. [doi:10.1007/978-1-4757-4321-0](https://doi.org/10.1007/978-1-4757-4321-0).
