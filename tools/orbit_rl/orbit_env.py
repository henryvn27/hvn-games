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
FOCI = ((480.0, 320.0, 1.0), (245.0, 220.0, 0.58), (735.0, 250.0, 0.64), (590.0, 470.0, 0.72))
LIFE_FIRST_SCORE = 1800
LIFE_SCORE_STEP = 3000
PHASE_SCORE_STEP = 3000
WRONG_COLOR_REWARD_COST = 8.0
COLLISION_REWARD_COST = 12.0
LIFE_LOSS_REWARD_COST = 2.0
EXTRA_LIFE_REWARD = 4.5
ENERGY_DEATH_REWARD_COST = 8.0


@dataclass
class Point:
    x: float
    y: float


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def distance(a: Point, b: Point) -> float:
    return math.hypot(a.x - b.x, a.y - b.y)


def default_weights() -> dict[str, float]:
    return {"match": 4.2, "near": 1.15, "risk": -2.8, "life": 2.2, "avoid": 2.15, "wrong": 3.2}


class OrbitEnv:
    """A compact episode simulator used by the policy-search trainer."""

    def __init__(self, seed: int = 0, dt: float = 0.04):
        self.random = random.Random(seed)
        self.dt = dt
        self.reset()

    def reset(self) -> dict:
        self.elapsed = 0.0
        self.score = 0
        self.streak = 0
        self.phase = 0
        self.phase_number = 1
        self.phase_transition = None
        self.energy = 100.0
        self.lives = 0
        self.next_life_score = LIFE_FIRST_SCORE
        self.life_pickup = None
        self.packets_collected = 0
        self.wrong_color_hits = 0
        self.lives_collected = 0
        self.collision_deaths = 0
        self.energy_deaths = 0
        self.player = Point(WIDTH / 2, HEIGHT / 2)
        self.velocity = Point(0, 0)
        self.dash_time = 0.0
        self.dash_cooldown = 0.0
        self.hit_cooldown = 0.0
        self.hit_freeze = 0.0
        self.spawn_grace = 0.9
        self.last_toggle = -1.0
        self.packets = []
        self.hazards = []
        for index in range(5):
            focus_index = index % 1
            self.hazards.append({
                "angle": index * math.tau / 5 + 0.35,
                "radius": 130 + (index % 3) * 76,
                "speed": 0.22 + index * 0.035,
                "direction": 1,
                "focus_index": focus_index,
                "center_x": FOCI[focus_index][0],
                "center_y": FOCI[focus_index][1],
                "wobble": index * 0.8,
                "size": 15 if index % 2 == 0 else 11,
                "x": 0.0,
                "y": 0.0,
            })
        self.update_hazards(0.0, 0.0)
        for _ in range(5):
            self.spawn_packet()
        return self.observe()

    def spawn_packet(self) -> None:
        for _ in range(80):
            packet = Point(self.random.uniform(64, 896), self.random.uniform(70, 570))
            if distance(packet, self.player) >= 120 and all(distance(packet, old["point"]) >= 58 for old in self.packets):
                break
        self.packets.append({"point": packet, "phase": self.random.randrange(2)})

    def update_hazards(self, now: float, dt: float | None = None) -> None:
        elapsed_step = self.dt if dt is None else dt
        transition_speed = 1.0
        if self.phase_transition:
            transition = self.phase_transition
            transition["elapsed"] += elapsed_step
            if not transition["switched"] and transition["elapsed"] >= 0.95:
                for hazard in self.hazards:
                    hazard["direction"] *= -1
                transition["switched"] = True
            if transition["elapsed"] < 0.95:
                transition_speed = max(0.0, 1 - transition["elapsed"] / 0.95)
            elif transition["elapsed"] < 2.4:
                transition_speed = min(1.0, (transition["elapsed"] - 0.95) / 1.45)
            else:
                self.phase_transition = None
        active_orbits = min(len(FOCI), self.phase_number)
        phase_speed = 1 + min(1.35, (self.phase_number - 1) * 0.14)
        run_speed = 1 + min(2.25, self.packets_collected * 0.05 + self.elapsed * 0.008)
        for index, hazard in enumerate(self.hazards):
            hazard["focus_index"] = index % active_orbits
            focus_x, focus_y, scale = FOCI[hazard["focus_index"]]
            lerp = min(1.0, elapsed_step * 2.2)
            hazard["center_x"] += (focus_x - hazard["center_x"]) * lerp
            hazard["center_y"] += (focus_y - hazard["center_y"]) * lerp
            hazard["angle"] += hazard["speed"] * phase_speed * transition_speed * run_speed * hazard["direction"] * elapsed_step
            wobble = math.sin(now * 1.2 + hazard["wobble"]) * 22 * scale
            radius = hazard["radius"] * scale + wobble
            hazard["x"] = hazard["center_x"] + math.cos(hazard["angle"]) * radius
            hazard["y"] = hazard["center_y"] + math.sin(hazard["angle"]) * radius * 0.58

    def spawn_life_pickup(self) -> None:
        best = Point(480.0, 320.0)
        best_clearance = -math.inf
        for _ in range(80):
            point = Point(self.random.uniform(64, 896), self.random.uniform(70, 570))
            player_clearance = distance(point, self.player) - 140
            packet_clearance = min((distance(point, item["point"]) - 76 for item in self.packets), default=math.inf)
            hazard_clearance = min((distance(point, Point(item["x"], item["y"])) - 70 for item in self.hazards), default=math.inf)
            clearance = min(player_clearance, packet_clearance, hazard_clearance)
            if clearance > best_clearance:
                best = point
                best_clearance = clearance
            if clearance >= 0:
                break
        self.life_pickup = best

    def observe(self) -> dict:
        return {
            "player": {"x": self.player.x, "y": self.player.y},
            "phase": PHASES[self.phase],
            "phase_number": self.phase_number,
            "energy": self.energy,
            "lives": self.lives,
            "elapsed": self.elapsed,
            "last_toggle": self.last_toggle,
            "packets_collected": self.packets_collected,
            "dash_cooldown": self.dash_cooldown,
            "life_pickup": {"x": self.life_pickup.x, "y": self.life_pickup.y} if self.life_pickup else None,
            "packets": [{"x": item["point"].x, "y": item["point"].y, "phase": PHASES[item["phase"]]} for item in self.packets],
            "hazards": [{"x": item["x"], "y": item["y"], "size": item["size"]} for item in self.hazards],
        }

    def step(self, action: dict, weights: dict[str, float]) -> tuple[dict, float, bool]:
        dt = max(0.0, min(float(self.dt), 0.04))
        if self.hit_freeze > 0:
            self.hit_freeze = max(0.0, self.hit_freeze - dt)
            return self.observe(), 0.0, False
        self.spawn_grace = max(0.0, self.spawn_grace - dt)
        self.hit_cooldown = max(0.0, self.hit_cooldown - dt)
        self.dash_time = max(0.0, self.dash_time - dt)
        self.dash_cooldown = max(0.0, self.dash_cooldown - dt)
        if action.get("space") or action.get("toggle"):
            if self.elapsed - self.last_toggle >= 0.45:
                self.phase = 1 - self.phase
                self.last_toggle = self.elapsed
        if (action.get("shift") or action.get("dash")) and self.dash_cooldown <= 0 and self.energy >= 20:
            self.dash_time = 0.24
            self.dash_cooldown = 1.3
            self.energy -= 20
        self.update_hazards(self.elapsed + dt, dt)

        move_x = clamp(float(action.get("dx", 0)), -1, 1)
        move_y = clamp(float(action.get("dy", 0)), -1, 1)
        move_length = math.hypot(move_x, move_y) or 1
        run_speed = 235 + min(90, self.packets_collected * 2.2)
        speed = 520 if self.dash_time > 0 else run_speed
        alpha = 1 - (1 - 0.24) ** (dt * 60)
        if move_x or move_y:
            self.velocity.x += ((move_x / move_length) * speed - self.velocity.x) * alpha
            self.velocity.y += ((move_y / move_length) * speed - self.velocity.y) * alpha
        else:
            drag = 0.82 ** (dt * 60)
            self.velocity.x *= drag
            self.velocity.y *= drag
        self.player.x = clamp(self.player.x + self.velocity.x * dt, 18, WIDTH - 18)
        self.player.y = clamp(self.player.y + self.velocity.y * dt, 18, HEIGHT - 18)
        self.energy = min(100, self.energy + dt * 2.4)
        self.elapsed += dt
        reward = 0.002

        for packet in list(self.packets):
            if distance(self.player, packet["point"]) > 30:
                continue
            self.packets.remove(packet)
            if packet["phase"] == self.phase:
                self.score += 100 + self.streak * 25 + 12
                self.streak += 1
                self.packets_collected += 1
                self.energy = min(100, self.energy + 8)
                reward += 1.0 + min(1.0, self.streak / 12)
                if self.score >= self.phase_number * PHASE_SCORE_STEP:
                    self.phase_number += 1
                    self.phase_transition = {"elapsed": 0.0, "switched": False}
                if self.score >= self.next_life_score and self.life_pickup is None:
                    self.spawn_life_pickup()
                    self.next_life_score += LIFE_SCORE_STEP
            else:
                self.streak = 0
                self.energy -= 18
                self.wrong_color_hits += 1
                self.hit_freeze = max(self.hit_freeze, 0.18)
                reward -= WRONG_COLOR_REWARD_COST
            self.spawn_packet()

        if self.life_pickup and distance(self.player, self.life_pickup) <= 30:
            self.lives += 1
            self.lives_collected += 1
            self.life_pickup = None
            reward += EXTRA_LIFE_REWARD

        if self.spawn_grace <= 0 and self.dash_time <= 0 and self.hit_cooldown <= 0:
            collision = next((hazard for hazard in self.hazards if distance(self.player, Point(hazard["x"], hazard["y"])) < hazard["size"] + 17), None)
            if collision:
                self.streak = 0
                self.hit_cooldown = 0.8
                if self.lives > 0:
                    self.lives -= 1
                    self.energy = 100
                    self.hit_freeze = 0.5
                    reward -= LIFE_LOSS_REWARD_COST
                else:
                    self.energy = 0
                    self.collision_deaths += 1
                    reward -= COLLISION_REWARD_COST
                    return self.observe(), reward, True
        if self.energy <= 0:
            self.energy_deaths += 1
            return self.observe(), reward - ENERGY_DEATH_REWARD_COST, True
        return self.observe(), reward, False


def choose_action(observation: dict, weights: dict[str, float]) -> dict:
    player = Point(observation["player"]["x"], observation["player"]["y"])
    hazards = [Point(item["x"], item["y"]) for item in observation["hazards"]]
    candidates = observation["packets"]
    now = float(observation["elapsed"])
    phase = observation["phase"]
    life_pickup = observation.get("life_pickup")

    def route_risk(packet: dict, target_phase: str) -> float:
        dx = packet["x"] - player.x
        dy = packet["y"] - player.y
        length_sq = dx * dx + dy * dy or 1
        risk = 0.0
        for crossing in candidates:
            if crossing is packet or crossing["phase"] == target_phase:
                continue
            t = clamp(((crossing["x"] - player.x) * dx + (crossing["y"] - player.y) * dy) / length_sq, 0, 1)
            closest = Point(player.x + dx * t, player.y + dy * t)
            clearance = distance(closest, Point(crossing["x"], crossing["y"]))
            if 0.08 < t < 0.94 and clearance < 66:
                risk += (66 - clearance) / 66 * (1 - t * 0.25)
        return risk

    def value(packet: dict) -> float:
        target = Point(packet["x"], packet["y"])
        target_distance = distance(player, target)
        danger = min((distance(target, hazard) for hazard in hazards), default=180)
        phase_value = weights["match"] if packet["phase"] == phase else -weights["wrong"]
        return phase_value + max(-1, 1 - target_distance / 500) * weights["near"] + max(-1, 1 - danger / 180) * weights["risk"] - route_risk(packet, packet["phase"]) * weights["wrong"]

    phase_switch_ready = now - float(observation.get("last_toggle", -1.0)) >= 0.45
    # Mirror the browser safety gate: don't route into an opposite-color packet
    # until the phase switch can be applied on this decision tick.
    packet_targets = [
        (value(packet), packet)
        for packet in candidates
        if packet["phase"] == phase or phase_switch_ready
    ]
    packet_value, packet_target = max(packet_targets, default=(-math.inf, None), key=lambda item: item[0])
    life_value = -math.inf
    life_target = None
    if life_pickup:
        life_target = {"x": life_pickup["x"], "y": life_pickup["y"], "kind": "life"}
        life_distance = distance(player, Point(life_target["x"], life_target["y"]))
        life_clearance = min((distance(Point(life_target["x"], life_target["y"]), hazard) for hazard in hazards), default=180)
        life_value = weights["life"] * (1.0 / (1 + observation["lives"] * 0.3)) + max(-1, 1 - life_distance / 500) * weights["near"] + max(-1, 1 - life_clearance / 180) * weights["risk"]
    target = life_target if life_target and life_value >= packet_value else packet_target
    if target is None:
        return {"dx": 0, "dy": 0, "toggle": False, "space": False, "dash": False, "shift": False, "keys": [], "target": "none", "reason": "Hold position until a target appears."}

    desired_phase = target.get("phase", phase)
    toggle = desired_phase != phase and now - float(observation.get("last_toggle", -1.0)) >= 0.45
    active_phase = desired_phase if toggle else phase
    move_x = target["x"] - player.x
    move_y = target["y"] - player.y
    move_length = math.hypot(move_x, move_y) or 1
    move_x /= move_length
    move_y /= move_length

    # Make a shallow detour around wrong-color pickups that lie on the direct route.
    route_blocker = None
    blocker_t = 1.0
    for packet in candidates:
        if packet.get("kind") == "life" or packet["phase"] == active_phase:
            continue
        dx = target["x"] - player.x
        dy = target["y"] - player.y
        length_sq = dx * dx + dy * dy or 1
        t = clamp(((packet["x"] - player.x) * dx + (packet["y"] - player.y) * dy) / length_sq, 0, 1)
        closest_x = player.x + dx * t
        closest_y = player.y + dy * t
        clearance = math.hypot(packet["x"] - closest_x, packet["y"] - closest_y)
        if 0.08 < t < 0.94 and clearance < 66 and t < blocker_t:
            route_blocker = packet
            blocker_t = t
    reason = "Follow the safest matching pickup route."
    if route_blocker:
        side_a = (move_y, -move_x)
        side_b = (-move_y, move_x)
        clearance_a = min((math.hypot(player.x + side_a[0] * 60 - h.x, player.y + side_a[1] * 60 - h.y) for h in hazards), default=999)
        clearance_b = min((math.hypot(player.x + side_b[0] * 60 - h.x, player.y + side_b[1] * 60 - h.y) for h in hazards), default=999)
        side = side_a if clearance_a >= clearance_b else side_b
        move_x += side[0] * 1.15
        move_y += side[1] * 1.15
        reason = "Curve around a wrong-color pickup crossing the direct path."

    near_wrong = False
    for packet in candidates:
        if packet["phase"] == active_phase:
            continue
        away_x = player.x - packet["x"]
        away_y = player.y - packet["y"]
        packet_distance = math.hypot(away_x, away_y) or 1
        if packet_distance >= 118:
            continue
        strength = ((118 - packet_distance) / 118) * weights["wrong"] * 1.35
        move_x += away_x / packet_distance * strength
        move_y += away_y / packet_distance * strength
        near_wrong = True
    if near_wrong and not route_blocker:
        reason = "Give the wrong-color pickup clearance before turning back toward the target."

    closest = min(((distance(player, hazard), hazard) for hazard in hazards), default=(999, None), key=lambda item: item[0])
    nearest_distance, nearest_hazard = closest
    if nearest_hazard is not None and nearest_distance < 170:
        away_x = player.x - nearest_hazard.x
        away_y = player.y - nearest_hazard.y
        away_length = math.hypot(away_x, away_y) or 1
        strength = ((170 - nearest_distance) / 170) ** 2 * weights["avoid"]
        move_x += away_x / away_length * strength
        move_y += away_y / away_length * strength
        if not route_blocker and not near_wrong:
            reason = "Arc away from the nearest moving planet before closing on the target."

    edge = 58
    if player.x < edge: move_x += (edge - player.x) / edge
    if player.x > WIDTH - edge: move_x -= (player.x - (WIDTH - edge)) / edge
    if player.y < edge: move_y += (edge - player.y) / edge
    if player.y > HEIGHT - edge: move_y -= (player.y - (HEIGHT - edge)) / edge
    length = math.hypot(move_x, move_y) or 1
    dx = move_x / length
    dy = move_y / length
    keys = []
    if abs(dx) > 0.24: keys.append("D" if dx > 0 else "A")
    if abs(dy) > 0.24: keys.append("S" if dy > 0 else "W")
    if not keys:
        keys = ["D" if dx > 0 else "A"]
    dash = nearest_distance < 94 and observation["energy"] > 28 and observation["dash_cooldown"] <= 0
    if target.get("kind") == "life":
        target_label = "Extra life"
        if not route_blocker and not near_wrong: reason = "Collect the extra life while its route is clear."
    else:
        target_label = f"{target['phase'].title()} pickup"
    if toggle:
        reason = f"Press Space to switch to {desired_phase.title()} for the selected pickup."
    elif dash:
        reason = "Press Shift to dash past the nearby planet."
    return {"dx": dx, "dy": dy, "toggle": toggle, "space": toggle, "dash": dash, "shift": dash, "keys": keys, "target": target_label, "reason": reason}


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


def run_episode_metrics(weights: dict[str, float], seed: int, steps: int = 1800) -> dict[str, float]:
    env = OrbitEnv(seed=seed)
    observation = env.observe()
    total = 0.0
    for _ in range(steps):
        observation, reward, done = env.step(choose_action(observation, weights), weights)
        total += reward
        if done:
            break
    return {
        "score": float(env.score),
        "matching_pickups": float(env.packets_collected),
        "extra_lives": float(env.lives_collected),
        "survival_seconds": float(env.elapsed),
        "energy": float(env.energy),
        "wrong_color_hits": float(env.wrong_color_hits),
        "collision_deaths": float(env.collision_deaths),
        "energy_deaths": float(env.energy_deaths),
        "return": float(total + env.score / 1000),
    }
