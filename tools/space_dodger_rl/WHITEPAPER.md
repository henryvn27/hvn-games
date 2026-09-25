# Learning a Survival Policy for Space Dodger

**HVN Games · Technical report 01 · 25 September 2026 · Policy 1**

## Abstract

We train and evaluate **mars-pilot-cem-v1**, a tactical policy-search controller for Space Dodger. The policy selects from nine WASD movement commands; the game’s weapon fires automatically. A deterministic rules engine shared by training and browser inference exposes structured game state. Cross-entropy method (CEM) search tunes interpretable action-scoring weights using 16 iterations, a population of 24, and 64 common training seeds per candidate. On 240 paired held-out seeds, mean survival changes by 8.30 seconds (95% paired-bootstrap interval 4.84 to 12.22); mean episode return changes by 19.72 (11.23 to 29.14). The task has a 120-second evaluation cap. These results measure the seeded simulator, not human play.

## 1. Environment

Space Dodger is a fixed-screen starfighter survival game. The ship starts with three hull points and a single-shot weapon. WASD or arrow keys move the ship at 260 pixels per second; movement is clamped to the playfield. Weapons fire automatically. Fighters and asteroids arrive in waves, and every fifth wave features a boss. Enemy projectiles and collisions remove hull, with a 1.5-second invulnerability period after a hit. Repair pickups restore one missing hull point; weapon pickups upgrade the gun to twin or triple fire. A repair reward is recorded only when a pickup restores missing hull. Episodes end when hull reaches zero or when the evaluation time limit is reached.

The browser game and trainer both use `games/space-dodger/simulation.mjs` for state transitions. The manual game retains its existing interface and run-recording path; pilot-only episodes do not write scores, achievements, shared playtime, or leaderboard results.

## 2. Policy

At each decision, the observation contains player position, hull and weapon level; enemy, boss, and hostile projectile positions and velocities; repair and upgrade positions; wave; score; and elapsed time. The policy does not read rendered pixels or the document tree.

The action space is hold, W, A, S, D, and the four diagonal key pairs. One action is held for five fixed simulation steps at 30 Hz, so the policy chooses at 6 Hz. The game continues to auto-fire. For each action, a short-horizon evaluator estimates pickup progress, firing alignment, boundary exposure, and closest approach to hazards. CEM tunes eight weights in that evaluator. At every generation, all candidates see the same 64 training seeds; the top floor of 20% (4 of 24 candidates at this setting) updates the next sampling distribution. This is optimization-based policy learning over a hand-designed controller; it is not a neural network or an imitation model.

## 3. Objective

The episode return is

$$G = T + S/360 + 7R + 1.4U + 11W + 18B - 6D - 14I_{death}.$$

Here, $T$ is seconds survived, $S$ is score, $R$ is repair pickups collected, $U$ is weapon upgrades collected, $W$ is waves cleared, $B$ is bosses defeated, and $D$ is hull hits. $I_{death}$ is one when hull depletion ends the episode and zero otherwise. The action evaluator separately raises its hazard penalty as hull is lost.

## 4. Training and evaluation protocol

The training seed is 60260925. Training episodes use seed $60360925 + 7{,}919i$ for $i=0,\ldots,63$. Each candidate is scored on this same set to reduce noise from different spawns. Search evaluates 384 candidates (24576 candidate-episodes), then selects the highest mean-return policy observed during search.

Evaluation uses 240 seeds starting at 70260925 with stride 7919; none are training seeds. The initial tactical policy and selected policy are paired on identical holdout seeds, with a 120-second cap. Means are compared per episode. Percentile intervals use 5,000 deterministic paired bootstrap resamples. The “reference” is the initial policy-weight configuration, not a human benchmark.

## 5. Results

Training-set mean return is 198.99 for the initial policy and 238.44 for the selected policy. Held-out summary:

| Metric | Reference | Trained | Paired change (95% interval) |
|---|---:|---:|---:|
| Survival (s) | 110.93 | 119.23 | 8.30 [4.84, 12.22] |
| Score | 6476.0 | 6369.0 | -107.1 [-361.1, 172.8] |
| Waves reached | 6.49 | 6.90 | 0.41 |
| Hull hits | 2.35 | 1.12 | -1.23 [-1.39, -1.06] |
| Effective repairs | 1.91 | 1.07 | -0.84 [-1.01, -0.67] |
| Weapon upgrades | 8.69 | 10.64 | 1.95 [1.50, 2.41] |
| Episode return | 215.99 | 235.71 | 19.72 [11.23, 29.14] |

The trained policy survives longer, takes fewer hull hits, and collects more weapon upgrades on these seeds. Its count of effective repairs is lower because it loses less hull and therefore has fewer useful repair opportunities. Mean score is slightly lower; its paired interval includes zero. 99.17% of trained episodes reach the time cap, so the survival measure is close to its ceiling and does not describe performance beyond 120 seconds.

## 6. Selected policy coefficients

| Coefficient | Value |
|---|---:|
| repair | 3.448979 |
| upgrade | 2.449146 |
| danger | 4.682214 |
| hullRisk | 1.976992 |
| aim | 0.897057 |
| lane | 0.430398 |
| edge | 2.668080 |
| smooth | 0.311837 |

## 7. Interactive interpretation and limitations

The browser pilot exposes its selected WASD keys, current tactical intent, projected path, and estimated near-term danger. A player can take control with WASD, arrows, direction buttons, or pointer steering, then return control to the policy. Pausing and restarting do not create scored runs.

The policy uses structured state and a short look-ahead. It receives no human demonstrations and does not learn directly from screenshots. The holdout samples the same procedural mechanics as training; it does not establish robustness to rule changes, equivalence to human skill, or leaderboard performance. Browser rendering is variable-rate while policy actions follow the fixed-step engine.

## 8. Reproduction

From the repository root, run:

```sh
node tools/space_dodger_rl/train.mjs --seed 60260925
```

The command writes `games/space-dodger/policy.json` and this paper. The JSON artifact records weights, full search history, training and held-out seed protocols, aggregate metrics, and paired confidence intervals. The online paper is available at `?game=space-dodger-rl`; the opt-in pilot is `?game=shelf&play=dodger&agent=1`.

## References

Rubinstein, R. Y., and Kroese, D. P. *The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning.* Springer, 2004. [https://doi.org/10.1007/978-1-4757-4321-0](https://doi.org/10.1007/978-1-4757-4321-0).
