import Phaser from "phaser";

const COLORS = { field: 0x1b1822, ink: 0xf4f0e6, pink: 0xff729f, mint: 0x79f0d3, gold: 0xffc857 };

export function startLastcall(options = {}) {
  class LastcallScene extends Phaser.Scene {
    constructor() { super("Lastcall"); }
  }

  Object.assign(LastcallScene.prototype, {
    create() {
      this.mode = "menu";
      this.preview = Boolean(options.preview);
      this.score = 0;
      this.streak = 0;
      this.shots = 0;
      this.target = 10;
      this.timeLeft = 30;
      this.energy = 100;
      this.cursor = 0;
      this.cursorSpeed = 1.4;
      this.shootClock = 0;
      this.createBackdrop();
      this.createInput();
      this.publish();
      if (this.preview) this.startRun();
    },

    createBackdrop() {
      this.add.rectangle(480, 270, 960, 540, COLORS.field);
      this.art = this.add.graphics();
      this.drawDial();
    },

    createInput() {
      this.input.keyboard.on("keydown-SPACE", () => this.shoot());
      this.input.keyboard.on("keydown-ENTER", () => this.shoot());
      this.input.keyboard.on("keydown-P", () => this.togglePause());
      this.input.keyboard.on("keydown-R", () => { if (this.mode === "result" || this.mode === "menu") this.startRun(); });
      this.input.on("pointerdown", () => this.shoot());
    },

    startRun() {
      this.mode = "active";
      this.score = 0;
      this.streak = 0;
      this.shots = 0;
      this.timeLeft = 30;
      this.energy = 100;
      this.cursor = 0;
      this.shootClock = 0;
      this.publish();
    },

    shoot() {
      if (this.mode !== "active") return;
      const distance = Math.abs(Math.atan2(Math.sin(this.cursor - 0), Math.cos(this.cursor - 0)));
      const hit = distance < 0.22;
      this.shots += 1;
      if (hit) {
        this.score += 100 + this.streak * 40;
        this.streak += 1;
        this.energy = Math.min(100, this.energy + 10);
      } else {
        this.streak = 0;
        this.energy = Math.max(0, this.energy - 22);
      }
      this.cursor = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      this.cursorSpeed = Phaser.Math.FloatBetween(1.1, 2.2);
      if (this.shots >= this.target) this.endRun(hit ? "won" : "lost");
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
      this.drawDial();
      if (this.mode !== "active") return;
      this.timeLeft -= dt;
      this.cursor += this.cursorSpeed * dt;
      if (this.cursor > Math.PI) this.cursor -= Math.PI * 2;
      this.shootClock += dt;
      if (this.preview && this.shootClock > 0.2 && Math.abs(this.cursor) < 0.12) { this.shootClock = 0; this.shoot(); }
      if (this.timeLeft <= 0) this.endRun("lost");
      this.publish();
    },

    drawDial() {
      this.art.clear();
      const centerX = 480;
      const centerY = 270;
      const radius = 150;
      this.art.lineStyle(2, COLORS.mint, 0.2);
      this.art.strokeCircle(centerX, centerY, radius + 40);
      this.art.lineStyle(18, COLORS.pink, 0.2);
      this.art.beginPath();
      this.art.arc(centerX, centerY, radius, -0.22, 0.22, false);
      this.art.strokePath();
      this.art.lineStyle(4, COLORS.pink, 0.96);
      this.art.beginPath();
      this.art.arc(centerX, centerY, radius, -0.22, 0.22, false);
      this.art.strokePath();
      this.art.lineStyle(2, COLORS.ink, 0.18);
      this.art.strokeCircle(centerX, centerY, radius);
      const handX = centerX + Math.cos(this.cursor) * radius;
      const handY = centerY + Math.sin(this.cursor) * radius;
      this.art.lineStyle(5, COLORS.gold, 1);
      this.art.lineBetween(centerX, centerY, handX, handY);
      this.art.fillStyle(COLORS.ink, 1).fillCircle(centerX, centerY, 8);
      this.art.fillStyle(COLORS.mint, 0.8).fillCircle(handX, handY, 10);
      this.art.fillStyle(COLORS.ink, 0.65);
      this.art.fillCircle(centerX, centerY, 3);
    },

    endRun(result) {
      if (this.mode !== "active") return;
      this.mode = "result";
      this.result = result;
      this.publish();
    },

    publish() {
      options.onState?.({ mode: this.mode, result: this.result, score: this.score, streak: this.streak, packets: this.shots, timeLeft: this.timeLeft, energy: this.energy, phase: "ready" });
    },
  });

  const game = new Phaser.Game({ type: Phaser.AUTO, width: 960, height: 540, parent: options.parent, backgroundColor: "#1b1822", scene: LastcallScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
  const getScene = () => game.scene.getScene("Lastcall");
  return { start: () => getScene()?.startRun(), resume: () => getScene()?.resume(), shoot: () => getScene()?.shoot(), destroy: () => game.destroy(true) };
}
