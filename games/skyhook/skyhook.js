import Phaser from "phaser";

const COLORS = { sky: 0x91d2df, cream: 0xfff4d2, mint: 0x164d5a, coral: 0xe85f50, gold: 0xf5a623 };

export function startSkyhook(options = {}) {
  class SkyhookScene extends Phaser.Scene {
    constructor() { super("Skyhook"); }
  }

  Object.assign(SkyhookScene.prototype, {
    create() {
      this.mode = "menu";
      this.preview = Boolean(options.preview);
      this.score = 0;
      this.streak = 0;
      this.flightTime = 0;
      this.elapsed = 0;
      this.spawnClock = 0;
      this.nextGap = 275;
      this.player = { x: 190, y: 270, velocity: 0, art: this.add.graphics().setDepth(4) };
      this.gates = [];
      this.createBackdrop();
      this.createInput();
      this.publish();
      if (this.preview) this.startRun();
    },

    createBackdrop() {
      this.backdrop = this.add.graphics();
      this.backdrop.fillStyle(COLORS.sky, 1).fillRect(0, 0, 960, 540);
      this.backdrop.fillStyle(COLORS.gold, 0.9).fillCircle(790, 92, 42);
      this.backdrop.fillStyle(0x5bb5a7, 0.9).fillRect(0, 474, 960, 66);
      this.backdrop.lineStyle(2, COLORS.cream, 0.22);
      for (let y = 120; y < 450; y += 82) this.backdrop.lineBetween(0, y, 960, y + 28);
      this.clouds = Array.from({ length: 6 }, (_, index) => ({ x: index * 190 + 30, y: 80 + (index % 3) * 125, width: 90 + (index % 2) * 48 }));
      this.cloudArt = this.add.graphics().setDepth(1);
      this.drawPlayer();
    },

    createInput() {
      this.keys = this.input.keyboard.addKeys("SPACE,W,UP");
      this.input.keyboard.on("keydown-SPACE", () => this.flap());
      this.input.keyboard.on("keydown-W", () => this.flap());
      this.input.keyboard.on("keydown-UP", () => this.flap());
      this.input.keyboard.on("keydown-P", () => this.togglePause());
      this.input.keyboard.on("keydown-R", () => { if (this.mode === "result" || this.mode === "menu") this.startRun(); });
      this.input.on("pointerdown", () => this.flap());
    },

    startRun() {
      this.mode = "active";
      this.score = 0;
      this.streak = 0;
      this.flightTime = 0;
      this.elapsed = 0;
      this.spawnClock = 0;
      this.nextGap = 275;
      this.player.y = 270;
      this.player.velocity = 0;
      this.gates.forEach((gate) => gate.art.destroy());
      this.gates = [];
      for (let index = 0; index < 3; index += 1) this.spawnGate(650 + index * 270);
      this.flap();
      this.publish();
    },

    flap() {
      if (this.mode !== "active") return;
      this.player.velocity = -350;
      this.publish();
    },

    togglePause() {
      if (this.mode === "active") this.mode = "pause";
      else if (this.mode === "pause") this.mode = "active";
      this.publish();
    },

    resume() { if (this.mode === "pause") { this.mode = "active"; this.publish(); } },

    update(time, delta) {
      const dt = Math.min(delta / 1000, 0.04);
      this.drawClouds(time);
      if (this.mode !== "active") return;
      this.elapsed += dt;
      this.flightTime += dt;
      this.player.velocity += 950 * dt;
      this.player.y += this.player.velocity * dt;
      this.player.rotation = Phaser.Math.Clamp(this.player.velocity / 1100, -0.45, 0.8);
      this.drawPlayer();
      if (this.player.y < 18 || this.player.y > 522) return this.endRun("lost");
      for (const gate of this.gates) {
        gate.x -= (235 + Math.min(90, this.elapsed * 2.1)) * dt;
        gate.art.x = gate.x;
        if (!gate.passed && gate.x < this.player.x) {
          gate.passed = true;
          this.score += 1;
          this.streak += 1;
          this.publish();
        }
        const withinX = Math.abs(gate.x - this.player.x) < 34;
        const outsideGap = this.player.y < gate.gap - 70 || this.player.y > gate.gap + 70;
        if (withinX && outsideGap) return this.endRun("lost");
      }
      this.gates = this.gates.filter((gate) => {
        if (gate.x < -80) { gate.art.destroy(); return false; }
        return true;
      });
      this.spawnClock += dt;
      if (this.spawnClock > 1.75) { this.spawnClock = 0; this.spawnGate(1030); }
      if (this.preview && this.player.y > 360) this.flap();
      this.publish();
    },

    spawnGate(x) {
      const gap = Phaser.Math.Between(145, 390);
      const art = this.add.graphics().setDepth(2);
      art.fillStyle(COLORS.coral, 0.92);
      art.fillRect(-22, 0, 44, gap - 70);
      art.fillRect(-22, gap + 70, 44, 540 - gap - 70);
      art.lineStyle(2, COLORS.gold, 0.75);
      art.strokeRect(-25, 0, 50, gap - 70);
      art.strokeRect(-25, gap + 70, 50, 540 - gap - 70);
      art.x = x;
      this.gates.push({ x, gap, art, passed: false });
    },

    drawClouds(time) {
      this.cloudArt.clear();
      for (const cloud of this.clouds) {
        const x = ((cloud.x - time * 0.018) % 1100 + 1100) % 1100 - 80;
        this.cloudArt.fillStyle(COLORS.cream, 0.08);
        this.cloudArt.fillRoundedRect(x, cloud.y, cloud.width, 14, 7);
        this.cloudArt.fillCircle(x + 24, cloud.y, 18);
        this.cloudArt.fillCircle(x + 52, cloud.y - 7, 25);
      }
    },

    drawPlayer() {
      this.player.art.clear();
      this.player.art.fillStyle(COLORS.mint, 1);
      this.player.art.fillTriangle(-18, 14, 19, 0, -18, -14);
      this.player.art.lineStyle(2, COLORS.cream, 0.8);
      this.player.art.strokeTriangle(-18, 14, 19, 0, -18, -14);
      this.player.art.x = this.player.x;
      this.player.art.y = this.player.y;
      this.player.art.rotation = this.player.rotation || 0;
    },

    endRun(result) {
      if (this.mode !== "active") return;
      this.mode = "result";
      this.result = result;
      this.publish();
    },

    publish() {
      options.onState?.({ mode: this.mode, result: this.result, score: this.score, streak: this.streak, packets: this.score, elapsed: this.flightTime, flightTime: this.flightTime, phase: "sky" });
    },
  });

  const game = new Phaser.Game({ type: Phaser.AUTO, width: 960, height: 540, parent: options.parent, backgroundColor: "#12232a", scene: SkyhookScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
  const getScene = () => game.scene.getScene("Skyhook");
  return { start: () => getScene()?.startRun(), resume: () => getScene()?.resume(), flap: () => getScene()?.flap(), destroy: () => game.destroy(true) };
}
