# Policy Search for Long-Horizon Snake

**HVN Games · Technical report · 25 September 2026 · `snake-route-cem-v1`**

## Abstract

We evaluate an interpretable route-scoring policy for classic Snake on a 20 × 20 grid. The controller uses collision-aware breadth-first search toward the apple, followed by local measures of reachable exits, forward runway, straight-line stability, and apple capture. Cross-entropy method (CEM) search tunes six coefficients over 18 generations, 22 candidates per generation, and 12 shared training seeds. On 48 paired held-out seeds, mean score increased from 52.29 to 54.79 apples, a paired difference of 2.50 with a 95% bootstrap interval from −0.73 to 5.71. Mean survival decreased slightly from 822.58 to 814.35 grid steps, and collision frequency increased from 37.5% to 41.7%. The score interval includes zero; the observed change is not conclusive evidence of a general improvement.

## 1. Environment

The evaluated mode is classic Snake on a 20 × 20 grid with one apple at a time. A grid step advances the head, shifts the body, and grows the tail when food is collected. Wall or body contact ends an episode. The deterministic module `games/snake/simulation.mjs` supplies the board transition used by the trainer and the browser demonstration. This study does not evaluate wrap, maze, feast, or other rule variants.

## 2. State and action

At each 125 ms grid step, the agent observes the ordered body coordinates, heading, and apple coordinate. It chooses straight, left, or right relative to its current direction. Direct reversal is excluded by the action interface. The browser pilot displays the selected direction, apple location, route rationale, and available safe space; WASD and arrow keys can take control.

## 3. Controller and objective

For each legal direction, the policy simulates the next cell and computes the reachable path to the apple while treating the body as occupied, with the tail cell treated according to whether it vacates on the current move. It scores food progress and capture opportunity alongside reachable exits, forward runway, and a straight-motion preference. The six coefficients are optimized by CEM. Episode return is twice the number of apples, plus 0.02 per survival step up to the 900-step cap, and a 25-point board-clear bonus. Collision ends an episode.

This is coefficient search over a hand-built controller. It is not a learned image model, neural policy, or imitation system.

## 4. Search and evaluation

Training uses seed 20260925, 18 generations, population 22, and 12 episodes per candidate. Training seed $i$ is `seed + 101 + 7,919i`; all candidates see the same training seeds. The selected coefficients maximize mean episode return during search. Evaluation uses 48 disjoint seeds beginning at `seed + 1,000,003` with stride 7,919. The initial hand-set coefficients and selected coefficients are paired on the same seeds. The reported 95% interval is a percentile interval from 3,000 deterministic paired bootstrap resamples.

## 5. Held-out results

| Metric | Initial policy | Selected policy | Paired change |
| --- | ---: | ---: | ---: |
| Mean apples | 52.29 | 54.79 | +2.50 [−0.73, 5.71] |
| Survival steps | 822.58 | 814.35 | −8.23 |
| Mean body length | 55.29 | 57.79 | +2.50 |
| Board-clear rate | 0% | 0% | 0 pp |
| Collision rate | 37.5% | 41.7% | +4.2 pp |

The mean score is higher for the selected policy on this sample, but its paired interval includes zero. It also collides somewhat more often and does not clear a board in either condition. The available evidence supports a modest descriptive score increase on these seeds, not a reliable safety or generalization claim.

## 6. Limitations

The agent observes exact grid state and uses deterministic rules. Results do not measure alternate Snake modes, rendering or input delays, a human baseline, or robustness to changed board dimensions and food rules. The bootstrap interval describes variability across this chosen seed set; it does not correct simulator mismatch or guarantee performance on future states. The policy is a research demonstration and should not be used to submit agent runs to scored play.

## 7. Reproduction

From the repository root, run:

```sh
node tools/snake_rl/train.mjs --iterations 18 --population 22 --episodes 12 --holdout-episodes 48
```

This writes `games/snake/policy.json` with the coefficients, seed protocol, search history, and holdout summary. The browser paper and live seeded pilot are available at `?game=snake-rl`.

## Reference

Rubinstein, R. Y., and Kroese, D. P. *The Cross-Entropy Method: A Unified Approach to Combinatorial Optimization, Monte-Carlo Simulation and Machine Learning*. Springer, 2004. [doi:10.1007/978-1-4757-4321-0](https://doi.org/10.1007/978-1-4757-4321-0).
