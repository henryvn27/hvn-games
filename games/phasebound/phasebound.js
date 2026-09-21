import Phaser from "phaser";
import { createOrbitPolicy } from "./orbit-policy.js";

const COLORS = {
  cyan: 0x72f6e3,
  amber: 0xffc857,
  life: 0xff7ad9,
  ink: 0xf5f7ff,
  muted: 0x8e9bb4,
  danger: 0xff5f61,
  field: 0x071124,
};

const PHASES = ["cyan", "amber"];
const EXTRA_LIFE_FIRST_SCORE = 1800;
const EXTRA_LIFE_SCORE_STEP = 3000;
const PHASE_SCORE_STEP = 3000;
const PHASE_WARNING_SCORE = 550;
const PHASE_WARNING_MIN_DURATION = 1.3;
const PHASE_TURN_SLOWDOWN_DURATION = 0.95;
const PHASE_TURN_DURATION = 2.4;
const HIT_FREEZE_DURATION = 0.5;
const HIT_FLASH_DURATION = 420;
const WRONG_COLOR_FREEZE_DURATION = 0.18;
const WRONG_COLOR_FLASH_DURATION = 160;
const HAZARD_PLAYER_CLEARANCE = 64;
const HAZARD_HAZARD_CLEARANCE = 58;
const HAZARD_SPAWN_GRACE = 0.9;
const HAZARD_POSITION_ATTEMPTS = 32;
const PHASE_SPEED_STEP = 0.14;
const MAX_PHASE_SPEED_BONUS = 1.35;
const PACKET_SPEED_STEP = 0.05;
const TIME_SPEED_STEP = 0.008;
const MAX_RUN_SPEED_BONUS = 2.25;
const SLOW_MODE_TIME_SCALE = 0.45;
const SLOW_MODE_DEFAULT_SCORE_RATE = 500;
const SLOW_MODE_RATE_SAMPLE_DURATION = 1;
const PLAYER_EDGE_MARGIN = 18;
const PHASE_LABELS = ["steady", "turnaround", "tight orbit", "fast orbit", "rough orbit"];
const ORBIT_RINGS = [[300, 132, 0.16, 2], [470, 220, 0.12, 1], [660, 320, 0.1, 1], [880, 430, 0.08, 1], [1_100, 540, 0.06, 1]];
const ORBIT_FOCI = [
  { x: 480, y: 320, scale: 1, color: 0x5c789f },
  { x: 245, y: 220, scale: 0.58, color: 0x72f6e3 },
  { x: 735, y: 250, scale: 0.64, color: 0xffc857 },
  { x: 590, y: 470, scale: 0.72, color: 0xff7ad9 },
];

export function startPhasebound(options = {}) {
  class HotDotScene extends Phaser.Scene {
    constructor() {
      super("HotDot");
    }
  }

  Object.assign(HotDotScene.prototype, {
    create() {
      this.mode = options.tutorial ? "tutorial" : "menu";
      this.preview = Boolean(options.preview);
      this.autoplay = Boolean(options.autoplay);
      this.policy = options.policy ?? createOrbitPolicy();
      this.pacing = options.pacing === "busy" ? "busy" : "steady";
      this.phase = "cyan";
      this.phaseNumber = 1;
      this.phaseLabel = PHASE_LABELS[0];
      this.phaseWarning = false;
      this.phaseWarningStartedAt = 0;
      this.phaseTransition = null;
      this.result = null;
      this.score = 0;
      this.streak = 0;
      this.packetsCollected = 0;
      this.lives = 0;
      this.nextLifeScore = EXTRA_LIFE_FIRST_SCORE;
      this.lifePickup = null;
      this.heat = 1;
      this.energy = 100;
      this.elapsed = 0;
      this.orbitTime = 0;
      this.slowMode = false;
      this.normalScoreRate = SLOW_MODE_DEFAULT_SCORE_RATE;
      this.normalScoreSampleElapsed = 0;
      this.normalScoreSamplePoints = 0;
      this.spawnClock = 0;
      this.publishClock = 0;
      this.hitCooldown = 0;
      this.hitFreeze = 0;
      this.spawnGrace = 0;
      this.dashTime = 0;
      this.dashCooldown = 0;
      this.autoplayClock = 0;
      this.autoplayDirection = new Phaser.Math.Vector2();
      this.touch = { up: false, down: false, left: false, right: false };
      this.packets = [];
      this.hazards = [];
      this.bursts = [];
      this.createBackdrop();
      this.createPlayer();
      this.createInput();
      this.createHazards();
      this.publish();
      if (this.preview || this.autoplay) this.startRun();
      else if (options.tutorial) this.startTutorial();
    },

    createBackdrop() {
      this.backdrop = this.add.graphics();
      this.backdrop.fillStyle(COLORS.field, 1);
      this.backdrop.fillRect(0, 0, 960, 640);

      this.orbitMap = this.add.graphics().setDepth(0);
      this.drawOrbitMap();

      // A few fixed pinpricks make the field feel like space without looking
      // like a particle effect or competing with the pickup colors.
      const stars = [
        [62, 92, 1.5, 0.28], [146, 118, 1, 0.2], [274, 72, 1.5, 0.25],
        [682, 86, 1, 0.2], [824, 116, 1.5, 0.3], [912, 196, 1, 0.22],
        [88, 332, 1, 0.2], [146, 512, 1.5, 0.25], [306, 584, 1, 0.22],
        [644, 576, 1.5, 0.26], [810, 508, 1, 0.2], [900, 392, 1.5, 0.28],
        [350, 106, 1, 0.18], [592, 124, 1.5, 0.22], [756, 332, 1, 0.18],
        [202, 430, 1, 0.18],
      ];
      for (const [x, y, radius, opacity] of stars) {
        this.backdrop.fillStyle(0xb5d0f2, opacity);
        this.backdrop.fillCircle(x, y, radius);
      }

      this.stars = [];
    },

    getActiveOrbitCount() {
      return Math.min(ORBIT_FOCI.length, this.phaseNumber);
    },

    drawOrbitMap() {
      this.orbitMap.clear();
      const activeOrbitCount = this.getActiveOrbitCount();
      for (let focusIndex = 0; focusIndex < activeOrbitCount; focusIndex += 1) {
        const focus = ORBIT_FOCI[focusIndex];
        const focusOpacity = focusIndex === 0 ? 1 : 0.72;
        for (const [width, height, opacity, lineWidth] of ORBIT_RINGS) {
          this.orbitMap.lineStyle(lineWidth, focus.color, opacity * focusOpacity);
          this.orbitMap.strokeEllipse(focus.x, focus.y, width * focus.scale, height * focus.scale);
        }
        this.orbitMap.fillStyle(focus.color, focusIndex === 0 ? 0.14 : 0.1);
        this.orbitMap.fillCircle(focus.x, focus.y, focusIndex === 0 ? 4 : 3);
      }
    },

    createPlayer() {
      this.player = this.add.container(480, 320).setDepth(4);
      this.playerArt = this.add.graphics();
      this.player.add(this.playerArt);
      this.playerVelocity = new Phaser.Math.Vector2();
      this.drawPlayer();
    },

    createInput() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys("W,A,S,D");
      this.input.keyboard.on("keydown-SPACE", () => this.togglePhase());
      this.input.keyboard.on("keydown-SHIFT", () => this.dash());
      this.input.keyboard.on("keydown-P", () => this.togglePause());
      this.input.keyboard.on("keydown-Q", () => this.toggleSlowMode());
      this.input.keyboard.on("keydown-R", () => {
        if (this.mode === "result" || this.mode === "menu") this.startRun();
      });
      this.input.on("pointerdown", (pointer) => {
        if (this.mode !== "active" && this.mode !== "tutorial") return;
        options.onInput?.("move");
        this.pointerTarget = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      });
      this.input.on("pointermove", (pointer) => {
        if ((this.mode === "active" || this.mode === "tutorial") && pointer.isDown) {
          options.onInput?.("move");
          this.pointerTarget = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
        }
      });
      this.input.on("pointerup", () => { this.pointerTarget = null; });
    },

    createHazards() {
      for (let index = 0; index < 5; index += 1) this.addHazard(index);
    },

    addHazard(index) {
      const focusIndex = index % this.getActiveOrbitCount();
      const focus = ORBIT_FOCI[focusIndex];
      const hazard = {
        angle: (Math.PI * 2 * index) / 5 + 0.35,
        radius: 130 + (index % 3) * 76,
        speed: 0.22 + index * 0.035,
        direction: this.phaseNumber % 2 === 0 ? -1 : 1,
        focusIndex,
        centerX: focus.x,
        centerY: focus.y,
        size: index % 2 === 0 ? 15 : 11,
        wobble: index * 0.8,
        art: this.add.graphics().setDepth(2),
      };
      this.hazards.push(hazard);
      this.positionHazardSafely(hazard, 0);
      if (this.mode === "active" || this.mode === "tutorial") this.spawnGrace = Math.max(this.spawnGrace, HAZARD_SPAWN_GRACE);
    },

    getHazardPosition(hazard, time, angle = hazard.angle) {
      const focus = ORBIT_FOCI[hazard.focusIndex];
      const wobble = Math.sin(time * 0.0012 + hazard.wobble) * 22 * focus.scale;
      const orbitRadius = hazard.radius * focus.scale + wobble;
      return {
        x: hazard.centerX + Math.cos(angle) * orbitRadius,
        y: hazard.centerY + Math.sin(angle) * orbitRadius * 0.58,
      };
    },

    positionHazardSafely(hazard, time) {
      const current = this.getHazardPosition(hazard, time);
      let bestAngle = hazard.angle;
      let bestPosition = current;
      let bestScore = this.hazardPositionScore(hazard, current);

      for (let attempt = 0; attempt < HAZARD_POSITION_ATTEMPTS; attempt += 1) {
        const angle = hazard.angle + (Math.PI * 2 * attempt) / HAZARD_POSITION_ATTEMPTS;
        const candidate = this.getHazardPosition(hazard, time, angle);
        const score = this.hazardPositionScore(hazard, candidate);
        if (score > bestScore) {
          bestScore = score;
          bestAngle = angle;
          bestPosition = candidate;
        }
        if (score >= 1) break;
      }

      hazard.angle = bestAngle;
      hazard.x = bestPosition.x;
      hazard.y = bestPosition.y;
    },

    hazardPositionScore(hazard, position) {
      const playerDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, position.x, position.y);
      const otherHazards = this.hazards.filter((other) => other !== hazard && Number.isFinite(other.x) && Number.isFinite(other.y));
      const hazardDistance = otherHazards.length === 0
        ? HAZARD_HAZARD_CLEARANCE
        : Math.min(...otherHazards.map((other) => Phaser.Math.Distance.Between(position.x, position.y, other.x, other.y)));
      return Math.min(playerDistance / HAZARD_PLAYER_CLEARANCE, hazardDistance / HAZARD_HAZARD_CLEARANCE);
    },

    resetHazardsForRun() {
      const activeOrbitCount = this.getActiveOrbitCount();
      for (const [index, hazard] of this.hazards.entries()) {
        const focusIndex = index % activeOrbitCount;
        const focus = ORBIT_FOCI[focusIndex];
        hazard.focusIndex = focusIndex;
        hazard.centerX = focus.x;
        hazard.centerY = focus.y;
        hazard.angle = (Math.PI * 2 * index) / 5 + 0.35;
        hazard.direction = 1;
        this.positionHazardSafely(hazard, 0);
      }
    },

    updateDifficulty() {
      this.heat = 1 + Math.floor(this.packetsCollected / 5);
      const desiredHazards = Math.min(10, 5 + Math.floor(this.packetsCollected / 7));
      while (this.hazards.length < desiredHazards) this.addHazard(this.hazards.length);
    },

    updatePhase() {
      const threshold = this.phaseNumber * PHASE_SCORE_STEP;
      if (!this.phaseWarning && this.score >= threshold - PHASE_WARNING_SCORE) {
        this.phaseWarning = true;
        this.phaseWarningStartedAt = this.elapsed;
        this.publish();
      }
      if (this.score < threshold || this.elapsed - this.phaseWarningStartedAt < PHASE_WARNING_MIN_DURATION) return;

      this.phaseNumber += 1;
      this.phaseLabel = PHASE_LABELS[Math.min(this.phaseNumber - 1, PHASE_LABELS.length - 1)] || `phase ${this.phaseNumber}`;
      this.phaseWarning = false;
      this.phaseTransition = { elapsed: 0, switched: false };
      this.spawnGrace = Math.max(this.spawnGrace, HAZARD_SPAWN_GRACE);
      const activeOrbitCount = this.getActiveOrbitCount();
      for (const [index, hazard] of this.hazards.entries()) hazard.focusIndex = index % activeOrbitCount;
      this.drawOrbitMap();
      this.burst(this.player.x, this.player.y, COLORS.ink, 12);
      this.publish();
    },

    startRun() {
      this.clearPackets();
      this.clearBursts();
      this.mode = "active";
      this.result = null;
      this.phase = "cyan";
      this.phaseNumber = 1;
      this.phaseLabel = PHASE_LABELS[0];
      this.phaseWarning = false;
      this.phaseWarningStartedAt = 0;
      this.phaseTransition = null;
      this.score = 0;
      this.streak = 0;
      this.packetsCollected = 0;
      this.lives = 0;
      this.nextLifeScore = EXTRA_LIFE_FIRST_SCORE;
      this.clearLifePickup();
      this.heat = 1;
      this.energy = 100;
      this.elapsed = 0;
      this.orbitTime = 0;
      this.slowMode = false;
      this.normalScoreRate = SLOW_MODE_DEFAULT_SCORE_RATE;
      this.normalScoreSampleElapsed = 0;
      this.normalScoreSamplePoints = 0;
      this.spawnClock = 0;
      this.publishClock = 0;
      this.hitCooldown = 0;
      this.hitFreeze = 0;
      this.spawnGrace = HAZARD_SPAWN_GRACE;
      this.dashTime = 0;
      this.dashCooldown = 0;
      this.autoplayClock = 0;
      this.autoplayDirection.set(0, 0);
      this.touch.up = false;
      this.touch.down = false;
      this.touch.left = false;
      this.touch.right = false;
      this.player.setPosition(480, 320);
      this.player.rotation = 0;
      this.cameras.main.resetFX();
      this.cameras.main.setZoom(1);
      this.playerVelocity.set(0, 0);
      this.pointerTarget = null;
      this.resetHazardsForRun();
      const openingPackets = this.pacing === "busy" ? 6 : 5;
      for (let index = 0; index < openingPackets; index += 1) this.spawnPacket();
      this.publish();
    },

    startTutorial() {
      this.clearPackets();
      this.clearBursts();
      this.mode = "tutorial";
      this.result = null;
      this.phase = "cyan";
      this.phaseNumber = 1;
      this.phaseLabel = PHASE_LABELS[0];
      this.phaseWarning = false;
      this.phaseWarningStartedAt = 0;
      this.phaseTransition = null;
      this.score = 0;
      this.streak = 0;
      this.packetsCollected = 0;
      this.lives = 0;
      this.nextLifeScore = EXTRA_LIFE_FIRST_SCORE;
      this.clearLifePickup();
      this.heat = 1;
      this.energy = 100;
      this.elapsed = 0;
      this.orbitTime = 0;
      this.slowMode = false;
      this.normalScoreRate = SLOW_MODE_DEFAULT_SCORE_RATE;
      this.normalScoreSampleElapsed = 0;
      this.normalScoreSamplePoints = 0;
      this.spawnClock = 0;
      this.publishClock = 0;
      this.hitCooldown = 0;
      this.hitFreeze = 0;
      this.spawnGrace = HAZARD_SPAWN_GRACE;
      this.dashTime = 0;
      this.dashCooldown = 0;
      this.player.setPosition(480, 320);
      this.player.rotation = 0;
      this.touch.up = false;
      this.touch.down = false;
      this.touch.left = false;
      this.touch.right = false;
      this.cameras.main.resetFX();
      this.cameras.main.setZoom(1);
      this.playerVelocity.set(0, 0);
      this.pointerTarget = null;
      this.resetHazardsForRun();
      this.drawPlayer();
      this.publish();
    },

    togglePhase() {
      if (this.mode !== "active" && this.mode !== "tutorial") return;
      this.phase = this.phase === "cyan" ? "amber" : "cyan";
      options.onInput?.("phase");
      this.burst(this.player.x, this.player.y, COLORS[this.phase], 8);
      this.drawPlayer();
      this.publish();
    },

    dash() {
      if ((this.mode !== "active" && this.mode !== "tutorial") || this.dashCooldown > 0 || this.energy < 20) return;
      this.dashTime = 0.24;
      this.dashCooldown = 1.3;
      this.energy -= 20;
      options.onInput?.("dash");
      this.burst(this.player.x, this.player.y, COLORS[this.phase], 13);
      this.publish();
    },

    togglePause() {
      if (this.mode === "active") {
        this.mode = "pause";
        this.tweens.pauseAll();
        this.publish();
      } else if (this.mode === "pause") {
        this.resumeRun();
      }
    },

    toggleSlowMode() {
      if (this.mode !== "active") return;
      this.slowMode = !this.slowMode;
      this.publish();
    },

    resumeRun() {
      if (this.mode !== "pause") return;
      this.mode = "active";
      this.tweens.resumeAll();
      this.publish();
    },

    setTouchDirection(direction, pressed) {
      if (direction in this.touch) this.touch[direction] = pressed;
    },

    update(time, delta) {
      const realDt = Math.min(delta / 1000, 0.04);
      if (this.mode === "tutorial") {
        this.dashTime = Math.max(0, this.dashTime - realDt);
        this.dashCooldown = Math.max(0, this.dashCooldown - realDt);
        this.energy = Math.min(100, this.energy + realDt * 2.4);
        this.orbitTime += realDt * 1000;
        this.updateHazards(this.orbitTime, realDt);
        this.updateMovement(realDt);
        this.drawPlayer();
        return;
      }
      if (this.mode !== "active") return;
      for (const star of this.stars) star.object.setAlpha(0.16 + (Math.sin(time * 0.001 + star.phase) + 1) * 0.11);
      this.updateBursts(realDt);
      if (this.hitFreeze > 0) {
        this.hitFreeze = Math.max(0, this.hitFreeze - realDt);
        return;
      }
      const dt = realDt * (this.slowMode ? SLOW_MODE_TIME_SCALE : 1);
      this.spawnGrace = Math.max(0, this.spawnGrace - realDt);
      const scoreBefore = this.score;
      this.orbitTime += dt * 1000;
      this.updateHazards(this.orbitTime, dt);

      this.elapsed += dt;
      this.updatePhaseTransition(dt);
      this.updateCamera(dt);
      this.hitCooldown = Math.max(0, this.hitCooldown - dt);
      this.dashTime = Math.max(0, this.dashTime - dt);
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      this.energy = Math.min(100, this.energy + dt * 2.4);
      this.applyAutoplay(dt);
      this.updateMovement(dt);
      this.updatePackets(time);
      this.updateLifePickup(time);
      this.updateDifficulty();
      this.updateHazardCollision();
      this.updateSlowMode(realDt, scoreBefore);
      this.drawPlayer();
      this.publishClock += realDt;
      if (this.publishClock > 0.1) {
        this.publishClock = 0;
        this.publish();
      }
      if (this.energy <= 0) this.endRun("lost");
    },

    updateSlowMode(realDt, scoreBefore) {
      if (this.slowMode) {
        this.score = Math.max(0, this.score - this.normalScoreRate * realDt);
        return;
      }

      const scoreGain = Math.max(0, this.score - scoreBefore);
      this.normalScoreSampleElapsed += realDt;
      this.normalScoreSamplePoints += scoreGain;
      if (this.normalScoreSampleElapsed < SLOW_MODE_RATE_SAMPLE_DURATION) return;

      const measuredRate = this.normalScoreSamplePoints / this.normalScoreSampleElapsed;
      this.normalScoreRate = Phaser.Math.Linear(this.normalScoreRate, measuredRate, 0.55);
      this.normalScoreSampleElapsed = 0;
      this.normalScoreSamplePoints = 0;
    },

    updateMovement(dt) {
      let x = 0;
      let y = 0;
      if (this.autoplay && this.autoplayDirection.lengthSq() > 0.001) {
        x = this.autoplayDirection.x;
        y = this.autoplayDirection.y;
      } else {
        if (this.cursors.left.isDown || this.keys.A.isDown || this.touch.left) x -= 1;
        if (this.cursors.right.isDown || this.keys.D.isDown || this.touch.right) x += 1;
        if (this.cursors.up.isDown || this.keys.W.isDown || this.touch.up) y -= 1;
        if (this.cursors.down.isDown || this.keys.S.isDown || this.touch.down) y += 1;
      }
      if (x || y) {
        const length = Math.hypot(x, y) || 1;
        const runSpeed = 235 + Math.min(90, this.packetsCollected * 2.2);
        this.playerVelocity.x = Phaser.Math.Linear(this.playerVelocity.x, (x / length) * (this.dashTime > 0 ? 520 : runSpeed), 0.24);
        this.playerVelocity.y = Phaser.Math.Linear(this.playerVelocity.y, (y / length) * (this.dashTime > 0 ? 520 : runSpeed), 0.24);
      } else if (this.pointerTarget) {
        const direction = new Phaser.Math.Vector2(this.pointerTarget.x - this.player.x, this.pointerTarget.y - this.player.y);
        if (direction.length() > 10) {
          direction.normalize();
          this.playerVelocity.x = Phaser.Math.Linear(this.playerVelocity.x, direction.x * 235, 0.24);
          this.playerVelocity.y = Phaser.Math.Linear(this.playerVelocity.y, direction.y * 235, 0.24);
        }
      } else {
        this.playerVelocity.scale(0.82);
      }
      this.player.x = Phaser.Math.Clamp(this.player.x + this.playerVelocity.x * dt, PLAYER_EDGE_MARGIN, 960 - PLAYER_EDGE_MARGIN);
      this.player.y = Phaser.Math.Clamp(this.player.y + this.playerVelocity.y * dt, PLAYER_EDGE_MARGIN, 640 - PLAYER_EDGE_MARGIN);
      if (this.playerVelocity.length() > 10) this.player.rotation = Math.atan2(this.playerVelocity.y, this.playerVelocity.x) + Math.PI / 2;
    },

    applyAutoplay(dt) {
      if (!this.autoplay || !this.policy) return;
      this.autoplayClock -= dt;
      if (this.autoplayClock > 0) return;
      const action = this.policy.act(this.getPolicyObservation());
      this.autoplayClock = 0.05;
      this.autoplayDirection.x = Phaser.Math.Clamp(Number(action.dx) || 0, -1, 1);
      this.autoplayDirection.y = Phaser.Math.Clamp(Number(action.dy) || 0, -1, 1);
      if (action.toggle) this.togglePhase();
      if (action.dash) this.dash();
    },

    getPolicyObservation() {
      return {
        player: { x: this.player.x, y: this.player.y },
        phase: this.phase,
        phaseNumber: this.phaseNumber,
        score: this.score,
        energy: this.energy,
        lives: this.lives,
        elapsed: this.elapsed,
        packets: this.packets.map((packet) => ({ x: packet.x, y: packet.y, phase: packet.phase })),
        hazards: this.hazards.map((hazard) => ({ x: hazard.x, y: hazard.y, size: hazard.size })),
        lifePickup: this.lifePickup ? { x: this.lifePickup.x, y: this.lifePickup.y } : null,
      };
    },

    updatePackets(time) {
      for (const packet of [...this.packets]) {
        packet.angle += packet.spin;
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, packet.x, packet.y);
        this.drawPacket(packet, time);
        if (distance > 30) continue;
        if (packet.phase === this.phase) {
          this.score += 100 + this.streak * 25 + this.heat * 12;
          this.updatePhase();
          this.streak += 1;
          this.packetsCollected += 1;
          this.energy = Math.min(100, this.energy + 8);
          this.burst(packet.x, packet.y, COLORS[packet.phase], 18);
          this.maybeSpawnLifePickup();
        } else {
          this.streak = 0;
          this.energy -= 18;
          this.hitFreeze = Math.max(this.hitFreeze, WRONG_COLOR_FREEZE_DURATION);
          this.cameras.main.flash(WRONG_COLOR_FLASH_DURATION, 255, 255, 255, false);
          this.burst(packet.x, packet.y, COLORS.danger, 10);
        }
        this.removePacket(packet);
        this.spawnPacket();
      }
    },

    updateHazards(time, dt) {
      const phaseSpeed = 1 + Math.min(MAX_PHASE_SPEED_BONUS, (this.phaseNumber - 1) * PHASE_SPEED_STEP);
      let transitionSpeed = 1;
      if (this.phaseTransition) {
        if (this.phaseTransition.elapsed < PHASE_TURN_SLOWDOWN_DURATION) {
          transitionSpeed = 1 - this.phaseTransition.elapsed / PHASE_TURN_SLOWDOWN_DURATION;
        } else {
          transitionSpeed = Math.min(1, (this.phaseTransition.elapsed - PHASE_TURN_SLOWDOWN_DURATION) / (PHASE_TURN_DURATION - PHASE_TURN_SLOWDOWN_DURATION));
        }
      }
      const runSpeed = 1 + Math.min(MAX_RUN_SPEED_BONUS, this.packetsCollected * PACKET_SPEED_STEP + this.elapsed * TIME_SPEED_STEP);
      for (const hazard of this.hazards) {
        const focus = ORBIT_FOCI[hazard.focusIndex];
        hazard.centerX = Phaser.Math.Linear(hazard.centerX, focus.x, Math.min(1, dt * 2.2));
        hazard.centerY = Phaser.Math.Linear(hazard.centerY, focus.y, Math.min(1, dt * 2.2));
        const speed = hazard.speed * phaseSpeed * transitionSpeed * runSpeed;
        hazard.angle += speed * hazard.direction * dt;
        this.positionHazardSafely(hazard, time);
        hazard.art.clear();
        const size = hazard.size;
        hazard.art.fillStyle(COLORS.danger, 0.96);
        hazard.art.fillCircle(hazard.x, hazard.y, size);
        hazard.art.fillStyle(0xa83f4f, 0.85);
        hazard.art.fillCircle(hazard.x - size * 0.35, hazard.y - size * 0.2, size * 0.22);
        hazard.art.fillCircle(hazard.x + size * 0.28, hazard.y + size * 0.3, size * 0.16);
        hazard.art.lineStyle(1, 0xff9a8f, 0.34);
        hazard.art.strokeCircle(hazard.x, hazard.y, size * 0.78);
      }
    },

    updateCamera(dt) {
      const targetZoom = Math.max(0.72, 1 - (this.phaseNumber - 1) * 0.09);
      this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, Math.min(1, dt * 3));
    },

    updatePhaseTransition(dt) {
      if (!this.phaseTransition) return;
      this.phaseTransition.elapsed += dt;
      if (!this.phaseTransition.switched && this.phaseTransition.elapsed >= PHASE_TURN_SLOWDOWN_DURATION) {
        for (const hazard of this.hazards) hazard.direction *= -1;
        this.phaseTransition.switched = true;
      }
      if (this.phaseTransition.elapsed >= PHASE_TURN_DURATION) {
        this.phaseTransition = null;
        this.publish();
      }
    },

    updateHazardCollision() {
      if (this.spawnGrace > 0 || this.dashTime > 0 || this.hitCooldown > 0) return;
      for (const hazard of this.hazards) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y) < hazard.size + 17) {
          this.streak = 0;
          this.hitCooldown = 0.8;
          this.burst(this.player.x, this.player.y, COLORS.danger, 16);
          this.playerVelocity.scale(-0.6);
          if (this.lives > 0) {
            this.lives -= 1;
            this.energy = 100;
            this.hitFreeze = HIT_FREEZE_DURATION;
            this.cameras.main.flash(HIT_FLASH_DURATION, 255, 95, 97, false);
            this.publish();
          } else {
            this.energy = 0;
            this.endRun("lost");
          }
          break;
        }
      }
    },

    maybeSpawnLifePickup() {
      if (this.lifePickup || this.score < this.nextLifeScore) return;
      this.spawnLifePickup();
      this.nextLifeScore += EXTRA_LIFE_SCORE_STEP;
    },

    spawnLifePickup() {
      const minPacketSpacing = 76;
      const minPlayerSpacing = 140;
      const minHazardSpacing = 70;
      const liveHazards = this.hazards.filter((hazard) => Number.isFinite(hazard.x) && Number.isFinite(hazard.y));
      let bestPosition = { x: 480, y: 320 };
      let bestClearance = -Infinity;

      for (let attempt = 0; attempt < 80; attempt += 1) {
        const candidate = {
          x: Phaser.Math.Between(64, 896),
          y: Phaser.Math.Between(70, 570),
        };
        const playerClearance = Phaser.Math.Distance.Between(candidate.x, candidate.y, this.player.x, this.player.y) - minPlayerSpacing;
        const packetClearance = this.packets.length === 0
          ? Infinity
          : Math.min(...this.packets.map((packet) => Phaser.Math.Distance.Between(candidate.x, candidate.y, packet.x, packet.y))) - minPacketSpacing;
        const hazardClearance = liveHazards.length === 0
          ? Infinity
          : Math.min(...liveHazards.map((hazard) => Phaser.Math.Distance.Between(candidate.x, candidate.y, hazard.x, hazard.y))) - minHazardSpacing;
        const clearance = Math.min(playerClearance, packetClearance, hazardClearance);

        if (clearance > bestClearance) {
          bestClearance = clearance;
          bestPosition = candidate;
        }
        if (clearance >= 0) break;
      }

      this.lifePickup = {
        x: bestPosition.x,
        y: bestPosition.y,
        angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
        spin: Phaser.Math.FloatBetween(0.008, 0.018),
        art: this.add.graphics().setDepth(3),
      };
      this.drawLifePickup(this.lifePickup, 0);
    },

    updateLifePickup(time) {
      if (!this.lifePickup) return;
      this.lifePickup.angle += this.lifePickup.spin;
      this.drawLifePickup(this.lifePickup, time);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lifePickup.x, this.lifePickup.y) > 30) return;
      this.lives += 1;
      this.burst(this.lifePickup.x, this.lifePickup.y, COLORS.life, 18);
      this.removeLifePickup();
      this.publish();
    },

    drawLifePickup(pickup, time) {
      const pulse = 1 + Math.sin(time * 0.005 + pickup.angle) * 0.12;
      const size = 15 * pulse;
      pickup.art.clear();
      pickup.art.fillStyle(COLORS.life, 1);
      pickup.art.fillTriangle(pickup.x, pickup.y - size, pickup.x + size, pickup.y, pickup.x, pickup.y + size);
      pickup.art.fillTriangle(pickup.x, pickup.y - size, pickup.x - size, pickup.y, pickup.x, pickup.y + size);
      pickup.art.fillStyle(COLORS.ink, 0.95);
      pickup.art.fillRect(pickup.x - 2, pickup.y - 7, 4, 14);
      pickup.art.fillRect(pickup.x - 7, pickup.y - 2, 14, 4);
    },

    spawnPacket() {
      const minPacketSpacing = 58;
      const minPlayerSpacing = 120;
      let bestPosition = { x: 480, y: 320 };
      let bestClearance = -Infinity;

      for (let attempt = 0; attempt < 80; attempt += 1) {
        const candidate = {
          x: Phaser.Math.Between(64, 896),
          y: Phaser.Math.Between(70, 570),
        };
        const playerClearance = Phaser.Math.Distance.Between(candidate.x, candidate.y, this.player.x, this.player.y) - minPlayerSpacing;
        const packetClearance = this.packets.length === 0
          ? Infinity
          : Math.min(...this.packets.map((packet) => Phaser.Math.Distance.Between(candidate.x, candidate.y, packet.x, packet.y))) - minPacketSpacing;
        const clearance = Math.min(playerClearance, packetClearance);

        if (clearance > bestClearance) {
          bestClearance = clearance;
          bestPosition = candidate;
        }
        if (clearance >= 0) break;
      }
      const packet = {
        x: bestPosition.x,
        y: bestPosition.y,
        phase: PHASES[Phaser.Math.Between(0, 1)],
        angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
        spin: Phaser.Math.FloatBetween(0.008, 0.018),
        art: this.add.graphics().setDepth(3),
      };
      this.packets.push(packet);
      this.drawPacket(packet, 0);
    },

    drawPacket(packet, time) {
      const color = COLORS[packet.phase];
      const pulse = 1 + Math.sin(time * 0.004 + packet.angle) * 0.15;
      packet.art.clear();
      const size = 12 * pulse;
      packet.art.fillStyle(color, 1);
      packet.art.fillCircle(packet.x, packet.y, size);
    },

    drawPlayer() {
      const color = COLORS[this.phase];
      this.playerArt.clear();
      const radius = this.dashTime > 0 ? 18 : 14;
      const halfWidth = Math.sqrt(3) * radius / 2;
      this.playerArt.fillStyle(color, 1);
      // These vertices share the same circumradius, making all three sides
      // equal while the point stays at the top of the local coordinate space.
      this.playerArt.fillTriangle(0, -radius, halfWidth, radius / 2, -halfWidth, radius / 2);
    },

    burst(x, y, color, count) {
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + Phaser.Math.FloatBetween(-0.2, 0.2);
        const distance = Phaser.Math.Between(14, 34);
        const object = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.8).setDepth(5);
        this.bursts.push(object);
        this.tweens.add({ targets: object, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, scale: 0.1, duration: Phaser.Math.Between(260, 480), ease: "Cubic.easeOut", onComplete: () => object.destroy() });
      }
    },

    updateBursts(dt) {
      this.bursts = this.bursts.filter((burst) => burst.active);
      void dt;
    },

    clearBursts() {
      for (const burst of this.bursts) burst.destroy();
      this.bursts = [];
    },

    removePacket(packet) {
      packet.art.destroy();
      this.packets = this.packets.filter((item) => item !== packet);
    },

    clearPackets() {
      for (const packet of this.packets) packet.art.destroy();
      this.packets = [];
    },

    removeLifePickup() {
      this.lifePickup?.art.destroy();
      this.lifePickup = null;
    },

    clearLifePickup() {
      this.removeLifePickup();
    },

    endRun(result) {
      if (this.mode !== "active") return;
      this.mode = "result";
      this.result = result;
      this.slowMode = false;
      this.phaseWarning = false;
      this.phaseTransition = null;
      this.playerVelocity.set(0, 0);
      this.pointerTarget = null;
      this.publish();
    },

    publish() {
      options.onState?.({ mode: this.mode, result: this.result, phase: this.phase, phaseNumber: this.phaseNumber, phaseLabel: this.phaseLabel, phaseWarning: this.phaseWarning, phaseTurning: Boolean(this.phaseTransition), score: this.score, streak: this.streak, packets: this.packetsCollected, lives: this.lives, heat: this.heat, energy: this.energy, dashCooldown: this.dashCooldown, elapsed: this.elapsed, slowMode: this.slowMode, slowModeRate: this.normalScoreRate, autoplay: this.autoplay, policy: this.policy?.name || null });
    },
  });

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: options.parent,
    width: 960,
    height: 640,
    backgroundColor: "#071124",
    render: { antialias: true, pixelArt: false, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: HotDotScene,
  });

  const getScene = () => game.scene.getScene("HotDot");
  return {
    start: () => getScene()?.startRun(),
    startTutorial: () => getScene()?.startTutorial(),
    resume: () => getScene()?.resumeRun(),
    togglePhase: () => getScene()?.togglePhase(),
    togglePause: () => getScene()?.togglePause(),
    toggleSlowMode: () => getScene()?.toggleSlowMode(),
    dash: () => getScene()?.dash(),
    setTouchDirection: (direction, pressed) => getScene()?.setTouchDirection(direction, pressed),
    destroy: () => game.destroy(true),
  };
}
