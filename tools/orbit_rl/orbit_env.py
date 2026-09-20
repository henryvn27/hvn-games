"""Small, dependency-free training environment for the Orbit policy.

The browser game remains authoritative at runtime. This environment keeps the
same useful contract for training: two-color pickups, orbiting hazards, a
limited energy pool, lives, and reward for safe matching pickups.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

WIDTH = 960.0
HEIGHT = 640.0
PHASES = ("cyan", "amber")


@dataclass
class Point:
    x: float
    y: float


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def distance(a: Point, b: Point) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def default_weights() -> dict[str, float]:
    return {"match": 4.2, "near": 1.15, "risk": -2.8, "life": 0.5, "avoid": 2.15}


class OrbitEnv:
    """A compact episode simulator used by the policy-search trainer."""

    def __init__(self, seed: int = 0, dt: float = 0.05):
        self.random = random.Random(seed)
        self.dt = dt
        self.reset()

    def reset(self) -> dict:
        self.elapsed = 0.0
        self.score = 0
        self.streak = 0
        self.phase = 0
        self.energy = 100.0
        self.lives = 0
        self.player = Point(WIDTH / 2, HEIGHT / 2)
        self.packets = []
        self.hazards = []
        for index in range(5):
            self.hazards.append({
                "angle": index * math.tau / 5 + 0.35,
                "radius": 130 + (index % 3) * 76,
                "speed": 0.22 + index * 0.035,
                "direction": 1,
                "size": 15 if index % 2 == 0 else 11,
                "x": self.player.x,
                "y": self.player.y,
            })
        for _ in range(5):
            self.spawn_packet()
        return self.observe()

    def spawn_packet(self) -> None:
        for _ in range(80):
            packet = Point(self.random.uniform(64, 896), self.random.uniform(70, 570))
            if distance(packet, self.player) >= 120 and all(distance(packet, old["point"]) >= 58 for old in self.packets):
                break
        self.packets.append({"point": packet, "phase": self.random.randrange(2)})

    def update_hazards(self) -> None:
        for hazard in self.hazards:
            hazard["angle"] += hazard["speed"] * hazard["direction"] * self.dt
            hazard["x"] = 480 + math.cos(hazard["angle"]) * hazard["radius"]
            hazard["y"] = 320 + math.sin(hazard["angle"]) * hazard["radius"] * 0.58

    def observe(self) -> dict:
        return {
            "player": {"x": self.player.x, "y": self.player.y},
            "phase": PHASES[self.phase],
            "phase_number": 1 + self.score // 3000,
            "energy": self.energy,
            "lives": self.lives,
            "elapsed": self.elapsed,
            "packets": [{"x": item["point"].x, "y": item["point"].y, "phase": PHASES[item["phase"]]} for item in self.packets],
            "hazards": [{"x": item["x"], "y": item["y"], "size": item["size"]} for item in self.hazards],
        }

    def step(self, action: dict, weights: dict[str, float]) -> tuple[dict, float, bool]:
        if action.get("toggle"):
            self.phase = 1 - self.phase
        self.update_hazards()

        move_x = clamp(float(action.get("dx", 0)), -1, 1)
        move_y = clamp(float(action.get("dy", 0)), -1, 1)
        move_length = math.hypot(move_x, move_y) or 1
        speed = 235 + min(90, self.score * 0.0022)
        if action.get("dash") and self.energy >= 20:
            speed = 520
            self.energy -= 20
        self.player.x = clamp(self.player.x + move_x / move_length * speed * self.dt, 34, WIDTH - 34)
        self.player.y = clamp(self.player.y + move_y / move_length * speed * self.dt, 34, HEIGHT - 34)
        self.energy = min(100, self.energy + self.dt * 2.4)
        self.elapsed += self.dt
        reward = -0.002

        for packet in list(self.packets):
            if distance(self.player, packet["point"]) > 30:
                continue
            self.packets.remove(packet)
            if packet["phase"] == self.phase:
                self.score += 100 + self.streak * 25
                self.streak += 1
                self.energy = min(100, self.energy + 8)
                reward += 1.0 + min(1.0, self.streak / 12)
            else:
                self.streak = 0
                self.energy -= 18
                reward -= 1.5
            self.spawn_packet()

        for hazard in self.hazards:
            if distance(self.player, Point(hazard["x"], hazard["y"])) >= hazard["size"] + 17:
                continue
            if self.lives:
                self.lives -= 1
                self.energy = 100
                reward -= 0.8
            else:
                self.energy = 0
                reward -= 3
                return self.observe(), reward, True

        return self.observe(), reward, self.energy <= 0


def choose_action(observation: dict, weights: dict[str, float]) -> dict:
    player = Point(observation["player"]["x"], observation["player"]["y"])
    hazards = [Point(item["x"], item["y"]) for item in observation["hazards"]]
    candidates = observation["packets"]

    def value(packet: dict) -> float:
        target = Point(packet["x"], packet["y"])
        target_distance = distance(player, target)
        danger = min((distance(target, hazard) for hazard in hazards), default=180)
        matching = 1 if packet["phase"] == observation["phase"] else 0
        return matching * weights["match"] + max(-1, 1 - target_distance / 500) * weights["near"] + max(-1, 1 - danger / 180) * weights["risk"]

    matching = [packet for packet in candidates if packet["phase"] == observation["phase"]]
    pool = matching or candidates
    target = max(pool, key=value, default=None)
    if target is None:
        return {"dx": 0, "dy": 0, "toggle": False, "dash": False}

    move_x = target["x"] - player.x
    move_y = target["y"] - player.y
    closest = min(((distance(player, hazard), hazard) for hazard in hazards), default=(999, None), key=lambda item: item[0])
    if closest[1] is not None and closest[0] < 170:
        away_x = player.x - closest[1].x
        away_y = player.y - closest[1].y
        away_length = math.hypot(away_x, away_y) or 1
        strength = ((170 - closest[0]) / 170) ** 2 * weights["avoid"]
        move_x += away_x / away_length * strength * 100
        move_y += away_y / away_length * strength * 100
    return {
        "dx": move_x,
        "dy": move_y,
        "toggle": not matching,
        "dash": closest[0] < 74 and observation["energy"] > 28,
    }


def run_episode(weights: dict[str, float], seed: int, steps: int = 1800) -> float:
    env = OrbitEnv(seed=seed)
    observation = env.observe()
    total = 0.0
    for _ in range(steps):
        observation, reward, done = env.step(choose_action(observation, weights), weights)
        total += reward
        if done:
            break
    return total + env.score / 1000
