import Phaser from "phaser";

const COLORS = {
  cyan: 0x72f6e3,
  amber: 0xffc857,
  ink: 0xeff4ee,
  muted: 0x769094,
  danger: 0xff6e5b,
  field: 0x141b20,
};

const PHASES = ["cyan", "amber"];

export function startPhasebound(options = {}) {
  class PhaseboundScene extends Phaser.Scene {
    constructor() {
      super("Phasebound");
    }
  }

  Object.assign(PhaseboundScene.prototype, {
    create() {
      this.mode = "menu";
      this.preview = Boolean(options.preview);
      this.pacing = options.pacing === "busy" ? "busy" : "steady";
      this.phase = "cyan";
      this.result = null;
      this.score = 0;
      this.streak = 0;
      this.packetsCollected = 0;
      this.heat = 1;
      this.energy = 100;
      this.elapsed = 0;
      this.spawnClock = 0;
      this.publishClock = 0;
      this.hitCooldown = 0;
      this.dashTime = 0;
      this.dashCooldown = 0;
      this.touch = { up: false, down: false, left: false, right: false };
      this.packets = [];
      this.hazards = [];
      this.bursts = [];
      this.createBackdrop();
      this.createPlayer();
      this.createInput();
      this.createHazards();
      this.publish();
      if (this.preview) this.startRun();
    },

    createBackdrop() {
      this.backdrop = this.add.graphics();
      this.backdrop.fillStyle(COLORS.field, 1);
      this.backdrop.fillRect(0, 0, 960, 640);
      this.backdrop.lineStyle(1, 0x527077, 0.13);
      for (let x = 0; x <= 960; x += 48) this.backdrop.lineBetween(x, 0, x, 640);
      for (let y = 0; y <= 640; y += 48) this.backdrop.lineBetween(0, y, 960, y);
      this.backdrop.lineStyle(1, COLORS.cyan, 0.13);
      this.backdrop.strokeCircle(480, 320, 106);
      this.backdrop.strokeCircle(480, 320, 198);
      this.backdrop.lineStyle(1, COLORS.amber, 0.11);
      this.backdrop.strokeEllipse(480, 320, 610, 350);
      this.stars = [];
      for (let index = 0; index < 46; index += 1) {
        const star = this.add.circle(Phaser.Math.Between(20, 940), Phaser.Math.Between(18, 622), Phaser.Math.Between(1, 2), 0xb9d7d3, Phaser.Math.FloatBetween(0.12, 0.48));
        star.setDepth(0);
        this.stars.push({ object: star, phase: index * 0.7 });
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
      this.input.keyboard.on("keydown-R", () => {
        if (this.mode === "result" || this.mode === "menu") this.startRun();
      });
      this.input.on("pointerdown", (pointer) => {
        if (this.mode !== "active") return;
        this.pointerTarget = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      });
      this.input.on("pointermove", (pointer) => {
        if (this.mode === "active" && pointer.isDown) this.pointerTarget = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      });
      this.input.on("pointerup", () => { this.pointerTarget = null; });
    },

    createHazards() {
      for (let index = 0; index < 5; index += 1) this.addHazard(index);
    },

    addHazard(index) {
      this.hazards.push({
        angle: (Math.PI * 2 * index) / 5 + 0.35,
        radius: 130 + (index % 3) * 76,
        speed: 0.22 + index * 0.035,
        size: index % 2 === 0 ? 15 : 11,
        wobble: index * 0.8,
        art: this.add.graphics().setDepth(2),
      });
    },

    updateDifficulty() {
      this.heat = 1 + Math.floor(this.packetsCollected / 5);
      const desiredHazards = Math.min(10, 5 + Math.floor(this.packetsCollected / 7));
      while (this.hazards.length < desiredHazards) this.addHazard(this.hazards.length);
    },

    startRun() {
      this.clearPackets();
      this.clearBursts();
      this.mode = "active";
      this.result = null;
      this.phase = "cyan";
      this.score = 0;
      this.streak = 0;
      this.packetsCollected = 0;
      this.heat = 1;
      this.energy = 100;
      this.elapsed = 0;
      this.spawnClock = 0;
      this.hitCooldown = 0;
      this.dashTime = 0;
      this.dashCooldown = 0;
      this.player.setPosition(480, 320);
      this.playerVelocity.set(0, 0);
      this.pointerTarget = null;
      const openingPackets = this.pacing === "busy" ? 6 : 5;
      for (let index = 0; index < openingPackets; index += 1) this.spawnPacket();
      this.publish();
    },

    togglePhase() {
      if (this.mode !== "active") return;
      this.phase = this.phase === "cyan" ? "amber" : "cyan";
      this.burst(this.player.x, this.player.y, COLORS[this.phase], 8);
      this.drawPlayer();
      this.publish();
    },

    dash() {
      if (this.mode !== "active" || this.dashCooldown > 0 || this.energy < 20) return;
      this.dashTime = 0.24;
      this.dashCooldown = 1.3;
      this.energy -= 20;
      this.burst(this.player.x, this.player.y, COLORS[this.phase], 13);
      this.publish();
    },

    togglePause() {
      if (this.mode === "active") {
        this.mode = "pause";
        this.publish();
      } else if (this.mode === "pause") {
        this.resumeRun();
      }
    },

    resumeRun() {
      if (this.mode !== "pause") return;
      this.mode = "active";
      this.publish();
    },

    setTouchDirection(direction, pressed) {
      if (direction in this.touch) this.touch[direction] = pressed;
    },

    update(time, delta) {
      const dt = Math.min(delta / 1000, 0.04);
      for (const star of this.stars) star.object.setAlpha(0.16 + (Math.sin(time * 0.001 + star.phase) + 1) * 0.11);
      this.updateHazards(time, dt);
      this.updateBursts(dt);
      if (this.mode !== "active") return;

      this.elapsed += dt;
      this.hitCooldown = Math.max(0, this.hitCooldown - dt);
      this.dashTime = Math.max(0, this.dashTime - dt);
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      this.energy = Math.min(100, this.energy + dt * 2.4);
      this.updateMovement(dt);
      this.updatePackets(time);
      this.updateDifficulty();
      this.updateHazardCollision();
      this.drawPlayer();
      this.publishClock += dt;
      if (this.publishClock > 0.1) {
        this.publishClock = 0;
        this.publish();
      }
      if (this.energy <= 0) this.endRun("lost");
    },

    updateMovement(dt) {
      let x = 0;
      let y = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown || this.touch.left) x -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown || this.touch.right) x += 1;
      if (this.cursors.up.isDown || this.keys.W.isDown || this.touch.up) y -= 1;
      if (this.cursors.down.isDown || this.keys.S.isDown || this.touch.down) y += 1;
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
      this.player.x = Phaser.Math.Clamp(this.player.x + this.playerVelocity.x * dt, 34, 926);
      this.player.y = Phaser.Math.Clamp(this.player.y + this.playerVelocity.y * dt, 34, 606);
      if (this.playerVelocity.length() > 10) this.player.rotation = Math.atan2(this.playerVelocity.y, this.playerVelocity.x) + Math.PI / 2;
    },

    updatePackets(time) {
      for (const packet of [...this.packets]) {
        packet.angle += packet.spin;
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, packet.x, packet.y);
        this.drawPacket(packet, time);
        if (distance > 30) continue;
        if (packet.phase === this.phase) {
          this.score += 100 + this.streak * 25 + this.heat * 12;
          this.streak += 1;
          this.packetsCollected += 1;
          this.energy = Math.min(100, this.energy + 8);
          this.burst(packet.x, packet.y, COLORS[packet.phase], 18);
        } else {
          this.streak = 0;
          this.energy -= 18;
          this.burst(packet.x, packet.y, COLORS.danger, 10);
        }
        this.removePacket(packet);
        this.spawnPacket();
      }
    },

    updateHazards(time, dt) {
      for (const hazard of this.hazards) {
        const speed = hazard.speed * (1 + Math.min(4.2, this.packetsCollected * 0.11 + this.elapsed * 0.018));
        hazard.angle += speed * dt;
        const wobble = Math.sin(time * 0.0012 + hazard.wobble) * 22;
        hazard.x = 480 + Math.cos(hazard.angle) * (hazard.radius + wobble);
        hazard.y = 320 + Math.sin(hazard.angle) * (hazard.radius + wobble) * 0.58;
        hazard.art.clear();
        hazard.art.fillStyle(COLORS.danger, 0.1);
        hazard.art.fillCircle(hazard.x, hazard.y, hazard.size + 12);
        hazard.art.lineStyle(2, COLORS.danger, 0.78);
        hazard.art.strokeCircle(hazard.x, hazard.y, hazard.size);
        hazard.art.fillStyle(COLORS.danger, 0.9);
        hazard.art.fillCircle(hazard.x, hazard.y, 4);
      }
    },

    updateHazardCollision() {
      if (this.dashTime > 0 || this.hitCooldown > 0) return;
      for (const hazard of this.hazards) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y) < hazard.size + 17) {
          this.energy = 0;
          this.streak = 0;
          this.hitCooldown = 0.8;
          this.burst(this.player.x, this.player.y, COLORS.danger, 16);
          this.playerVelocity.scale(-0.6);
          this.endRun("lost");
          break;
        }
      }
    },

    spawnPacket() {
      let x = 480;
      let y = 320;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        x = Phaser.Math.Between(64, 896);
        y = Phaser.Math.Between(70, 570);
        if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 120) break;
      }
      const packet = {
        x,
        y,
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
      packet.art.fillStyle(color, 0.1);
      packet.art.fillCircle(packet.x, packet.y, 22 * pulse);
      packet.art.lineStyle(2, color, 0.86);
      packet.art.strokeCircle(packet.x, packet.y, 10 * pulse);
      packet.art.lineBetween(packet.x - 4, packet.y, packet.x + 4, packet.y);
      packet.art.lineBetween(packet.x, packet.y - 4, packet.x, packet.y + 4);
    },

    drawPlayer() {
      const color = COLORS[this.phase];
      this.playerArt.clear();
      this.playerArt.fillStyle(color, this.dashTime > 0 ? 0.18 : 0.1);
      this.playerArt.fillCircle(0, 0, this.dashTime > 0 ? 34 : 27);
      this.playerArt.lineStyle(2, color, 0.9);
      this.playerArt.strokeCircle(0, 0, 17);
      this.playerArt.fillStyle(COLORS.ink, 1);
      this.playerArt.fillTriangle(0, -15, -10, 10, 10, 10);
      this.playerArt.lineStyle(2, color, 1);
      this.playerArt.lineBetween(-6, 5, 6, 5);
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

    endRun(result) {
      if (this.mode !== "active") return;
      this.mode = "result";
      this.result = result;
      this.playerVelocity.set(0, 0);
      this.pointerTarget = null;
      this.publish();
    },

    publish() {
      options.onState?.({ mode: this.mode, result: this.result, phase: this.phase, score: this.score, streak: this.streak, packets: this.packetsCollected, heat: this.heat, energy: this.energy, dashCooldown: this.dashCooldown, elapsed: this.elapsed });
    },
  });

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: options.parent,
    width: 960,
    height: 640,
    backgroundColor: "#141b20",
    render: { antialias: true, pixelArt: false, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: PhaseboundScene,
  });

  const getScene = () => game.scene.getScene("Phasebound");
  return {
    start: () => getScene()?.startRun(),
    resume: () => getScene()?.resumeRun(),
    togglePhase: () => getScene()?.togglePhase(),
    dash: () => getScene()?.dash(),
    setTouchDirection: (direction, pressed) => getScene()?.setTouchDirection(direction, pressed),
    destroy: () => game.destroy(true),
  };
}
