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

from orbit_env import default_weights, run_episode, run_episode_metrics


def mean_metrics(rows: list[dict[str, float]]) -> dict[str, float]:
    if not rows:
        return {}
    keys = rows[0]
    return {key: round(sum(row[key] for row in rows) / len(rows), 3) for key in keys}


def train(iterations: int, population: int, episodes: int, seed: int, steps: int, holdout_episodes: int) -> tuple[dict[str, float], dict]:
    randomizer = random.Random(seed)
    names = ["match", "near", "risk", "life", "avoid", "wrong"]
    bounds = {"match": (0.0, 8.0), "near": (0.0, 4.0), "risk": (-8.0, 0.0), "life": (0.0, 8.0), "avoid": (0.0, 8.0), "wrong": (3.2, 10.0)}
    mean = default_weights()
    spread = {name: abs(mean[name]) * 0.35 + 0.25 for name in names}
    best = (-float("inf"), dict(mean))

    for iteration in range(iterations):
        candidates = []
        for candidate_index in range(population):
            candidate = {name: max(bounds[name][0], min(bounds[name][1], randomizer.gauss(mean[name], spread[name]))) for name in names}
            score = sum(run_episode(candidate, seed + iteration * population + candidate_index + episode * 997, steps) for episode in range(episodes)) / episodes
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

    heldout_seeds = [seed + 1_000_003 + index * 997 for index in range(holdout_episodes)]
    baseline_rows = [run_episode_metrics(default_weights(), heldout_seed, steps) for heldout_seed in heldout_seeds]
    trained_rows = [run_episode_metrics(best[1], heldout_seed, steps) for heldout_seed in heldout_seeds]
    metadata = {
        "algorithm": "cross-entropy policy search",
        "seed": seed,
        "iterations": iterations,
        "population": population,
        "episodes_per_candidate": episodes,
        "steps_per_episode": steps,
        "best_surrogate_return": round(best[0], 4),
        "holdout_seed_start": heldout_seeds[0] if heldout_seeds else None,
        "holdout_episode_count": len(heldout_seeds),
        "evaluation": {"baseline": mean_metrics(baseline_rows), "trained": mean_metrics(trained_rows)},
        "observation": "player position and velocity, packet positions and colors, orbiting hazards, extra-life pickup, energy, lives, phase, cooldowns, elapsed time",
        "action": "quantized WASD direction, Space phase switch, Shift dash",
        "simulator_rules": "matching and wrong-color pickups, 450 ms phase-switch cooldown with wrong-phase target gating, score-driven phases, extra-life thresholds and safe spawn, orbiting hazards, collision lives, energy and dash cooldowns, movement inertia, safe-spawn grace; fixed costs for wrong pickups and deaths, with clearance penalties around wrong-color packets",
    }
    return best[1], metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=24)
    parser.add_argument("--population", type=int, default=24)
    parser.add_argument("--episodes", type=int, default=4)
    parser.add_argument("--steps", type=int, default=1000)
    parser.add_argument("--holdout-episodes", type=int, default=12)
    parser.add_argument("--seed", type=int, default=20260925)
    parser.add_argument("--output", type=Path, default=Path("games/phasebound/orbit-policy.json"))
    args = parser.parse_args()
    weights, metadata = train(args.iterations, args.population, args.episodes, args.seed, args.steps, args.holdout_episodes)
    artifact = {"name": "orbit-human-controls-v3", "version": 3, "weights": {key: round(value, 6) for key, value in weights.items()}, "training": metadata}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
