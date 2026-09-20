"""Train Orbit's compact browser policy with episode-based policy search.

This is intentionally small and reproducible. It uses a cross-entropy method
over the steering/value coefficients instead of a heavyweight framework, then
exports the learned artifact consumed by the Phaser demo.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

from orbit_env import default_weights, run_episode


def train(iterations: int, population: int, episodes: int, seed: int) -> tuple[dict[str, float], dict]:
    randomizer = random.Random(seed)
    names = ["match", "near", "risk", "life", "avoid"]
    mean = default_weights()
    spread = {name: abs(mean[name]) * 0.35 + 0.25 for name in names}
    best = (-float("inf"), dict(mean))

    for iteration in range(iterations):
        candidates = []
        for candidate_index in range(population):
            candidate = {name: randomizer.gauss(mean[name], spread[name]) for name in names}
            score = sum(run_episode(candidate, seed + iteration * population + candidate_index + episode * 997, 700) for episode in range(episodes)) / episodes
            candidates.append((score, candidate))
            if score > best[0]:
                best = (score, dict(candidate))
        candidates.sort(key=lambda item: item[0], reverse=True)
        elite = candidates[: max(2, population // 5)]
        for name in names:
            values = [candidate[name] for _, candidate in elite]
            mean[name] = sum(values) / len(values)
            spread[name] = max(0.05, (sum((value - mean[name]) ** 2 for value in values) / len(values)) ** 0.5 * 0.9)
        print(f"iteration {iteration + 1:02d}/{iterations}: best={best[0]:.3f} mean={mean}")

    metadata = {
        "algorithm": "cross-entropy policy search",
        "seed": seed,
        "iterations": iterations,
        "population": population,
        "episodes_per_candidate": episodes,
        "best_surrogate_return": round(best[0], 4),
        "observation": "player, packet positions/colors, hazard positions, energy, lives, elapsed time",
        "action": "continuous steering plus color toggle and dash",
    }
    return best[1], metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=24)
    parser.add_argument("--population", type=int, default=24)
    parser.add_argument("--episodes", type=int, default=4)
    parser.add_argument("--seed", type=int, default=20260919)
    parser.add_argument("--output", type=Path, default=Path("games/phasebound/orbit-policy.json"))
    args = parser.parse_args()
    weights, metadata = train(args.iterations, args.population, args.episodes, args.seed)
    artifact = {"name": "orbit-steer-v1", "version": 1, "weights": {key: round(value, 6) for key, value in weights.items()}, "training": metadata}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
