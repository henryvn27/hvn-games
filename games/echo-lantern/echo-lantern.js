import Phaser from "phaser";

const COLORS = { field: 0x080d12, grid: 0x5f7a78, ink: 0xf5f0dd, mint: 0x79f3d1, amber: 0xffc857, coral: 0xff7d6c, violet: 0xa997ff };

export function startEchoLantern(options = {}) {
  class EchoLanternScene extends Phaser.Scene { constructor() { super("EchoLantern"); } }
  Object.assign(EchoLanternScene.prototype, {
    create() {
      this.mode = "menu"; this.preview = Boolean(options.preview); this.score = 0; this.streak = 0; this.timeLeft = 45; this.energy = 100; this.collected = 0; this.target = 9; this.elapsed = 0; this.pulseCooldown = 0; this.pulseId = 0; this.hitCooldown = 0;
      this.touch = { up: false, down: false, left: false, right: false }; this.player = { x: 480, y: 270, vx: 0, vy: 0, art: this.add.graphics().setDepth(5) }; this.beacons = []; this.echoes = []; this.bursts = []; this.hazards = [];
      this.createBackdrop(); this.createPlayer(); this.createHazards(); this.createInput(); this.publish(); if (this.preview) this.startRun();
    },
    createBackdrop() {
      this.backdrop = this.add.graphics().setDepth(0); this.beaconArt = this.add.graphics().setDepth(2); this.echoArt = this.add.graphics().setDepth(1); this.hazardArt = this.add.graphics().setDepth(3);
      this.stars = Array.from({ length: 34 }, (_, index) => ({ x: Phaser.Math.Between(18, 942), y: Phaser.Math.Between(16, 524), r: Phaser.Math.Between(1, 2), phase: index * 0.72 })); this.drawStars(0);
    },
    createPlayer() { this.drawPlayer(); },
    createHazards() { for (let index = 0; index < 4; index += 1) this.hazards.push({ angle: index * 1.55 + 0.3, radius: 105 + index * 58, speed: 0.38 + index * 0.08, wobble: index * 1.7, x: 480, y: 270 }); },
    createInput() {
      this.cursors = this.input.keyboard.createCursorKeys(); this.keys = this.input.keyboard.addKeys("W,A,S,D"); this.input.keyboard.on("keydown-SPACE", () => this.pulse()); this.input.keyboard.on("keydown-P", () => this.togglePause()); this.input.keyboard.on("keydown-R", () => { if (this.mode === "result" || this.mode === "menu") this.startRun(); }); this.input.on("pointerdown", () => this.pulse());
    },
    startRun() {
      this.mode = "active"; this.score = 0; this.streak = 0; this.timeLeft = 45; this.energy = 100; this.collected = 0; this.elapsed = 0; this.pulseCooldown = 0; this.pulseId = 0; this.beacons = []; this.echoes = []; this.bursts = []; this.spawnBeacon(true); this.pulse(); this.publish();
    },
    spawnBeacon(first = false) {
      let x = 0; let y = 0; do { x = Phaser.Math.Between(72, 888); y = Phaser.Math.Between(66, 474); } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < (first ? 150 : 170));
      const phase = ["mint", "amber", "coral", "violet"][this.beacons.length % 4]; this.beacons.push({ x, y, phase, revealedBy: -1, revealedUntil: first ? 1.9 : 0, collected: false });
    },
    pulse() {
      if (this.mode !== "active" || this.pulseCooldown > 0 || this.energy < 8) return; this.energy -= 8; this.pulseCooldown = 0.72; this.pulseId += 1; this.echoes.push({ x: this.player.x, y: this.player.y, radius: 0, id: this.pulseId, life: 1 }); this.burst(this.player.x, this.player.y, COLORS.mint, 12); this.publish();
    },
    togglePause() { if (this.mode === "active") this.mode = "pause"; else if (this.mode === "pause") this.mode = "active"; this.publish(); },
    resume() { if (this.mode === "pause") { this.mode = "active"; this.publish(); } },
    update(time, delta) {
      const dt = Math.min(delta / 1000, 0.04); if (this.mode === "active") this.elapsed += dt; this.pulseCooldown = Math.max(0, this.pulseCooldown - dt); this.drawStars(time); this.drawEchoes(dt); this.drawBursts(dt); this.drawHazards(dt); this.drawBeacons(time); if (this.mode !== "active") return;
      this.timeLeft -= dt; this.energy = Math.min(100, this.energy + dt * 5.4); this.updateMovement(dt); this.updateBeaconState(); this.updateHazardCollision(); this.drawPlayer(); if (this.collected >= this.target) this.endRun("won"); else if (this.timeLeft <= 0 || this.energy <= 0) this.endRun("lost"); this.publish();
    },
    updateMovement(dt) {
      let x = 0; let y = 0; if (this.cursors.left.isDown || this.keys.A.isDown || this.touch.left) x -= 1; if (this.cursors.right.isDown || this.keys.D.isDown || this.touch.right) x += 1; if (this.cursors.up.isDown || this.keys.W.isDown || this.touch.up) y -= 1; if (this.cursors.down.isDown || this.keys.S.isDown || this.touch.down) y += 1;
      if (x || y) { const length = Math.hypot(x, y) || 1; this.player.vx = Phaser.Math.Linear(this.player.vx, (x / length) * 245, 0.2); this.player.vy = Phaser.Math.Linear(this.player.vy, (y / length) * 245, 0.2); } else { this.player.vx *= 0.84; this.player.vy *= 0.84; }
      this.player.x = Phaser.Math.Clamp(this.player.x + this.player.vx * dt, 34, 926); this.player.y = Phaser.Math.Clamp(this.player.y + this.player.vy * dt, 34, 506);
    },
    updateBeaconState() {
      for (const beacon of this.beacons) {
        if (beacon.collected) continue;
        for (const echo of this.echoes) { const distance = Phaser.Math.Distance.Between(echo.x, echo.y, beacon.x, beacon.y); if (beacon.revealedBy !== echo.id && Math.abs(distance - echo.radius) < 22) { beacon.revealedBy = echo.id; beacon.revealedUntil = this.elapsed + 1.8; this.burst(beacon.x, beacon.y, COLORS[beacon.phase], 7); } }
        if (beacon.revealedUntil <= this.elapsed) continue;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, beacon.x, beacon.y) < 34) { beacon.collected = true; this.collected += 1; this.score += 120 + this.streak * 35; this.streak += 1; this.energy = Math.min(100, this.energy + 17); this.burst(beacon.x, beacon.y, COLORS[beacon.phase], 20); this.spawnBeacon(); this.publish(); }
      }
      this.beacons = this.beacons.filter((beacon) => !beacon.collected);
    },
    updateHazardCollision() {
      if (this.hitCooldown > 0) { this.hitCooldown -= 0.04; return; }
      for (const hazard of this.hazards) if (Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y) < 25) { this.hitCooldown = 0.8; this.energy = Math.max(0, this.energy - 24); this.streak = 0; this.burst(this.player.x, this.player.y, COLORS.coral, 10); break; }
    },
    drawStars(time) {
      this.backdrop.clear(); this.backdrop.fillStyle(COLORS.field, 1).fillRect(0, 0, 960, 540); this.backdrop.lineStyle(1, COLORS.grid, 0.16); for (let x = 0; x <= 960; x += 48) this.backdrop.lineBetween(x, 0, x, 540); for (let y = 0; y <= 540; y += 48) this.backdrop.lineBetween(0, y, 960, y); this.backdrop.lineStyle(1, COLORS.violet, 0.12); this.backdrop.strokeCircle(480, 270, 112); this.backdrop.strokeCircle(480, 270, 220); for (const star of this.stars) { this.backdrop.fillStyle(COLORS.ink, 0.12 + (Math.sin(time * 0.002 + star.phase) + 1) * 0.08); this.backdrop.fillCircle(star.x, star.y, star.r); }
    },
    drawEchoes(dt) {
      this.echoArt.clear(); for (const echo of this.echoes) { echo.radius += 520 * dt; echo.life -= dt * 0.38; this.echoArt.lineStyle(3, COLORS.mint, Math.max(0, echo.life) * 0.62); this.echoArt.strokeCircle(echo.x, echo.y, echo.radius); this.echoArt.lineStyle(1, COLORS.ink, Math.max(0, echo.life) * 0.18); this.echoArt.strokeCircle(echo.x, echo.y, Math.max(0, echo.radius - 10)); } this.echoes = this.echoes.filter((echo) => echo.radius < 690);
    },
    drawBeacons(time) {
      this.beaconArt.clear(); for (const beacon of this.beacons) { if (beacon.revealedUntil <= this.elapsed) continue; const color = COLORS[beacon.phase]; const pulse = 1 + Math.sin(time * 0.006 + beacon.x) * 0.12; this.beaconArt.fillStyle(color, 0.1); this.beaconArt.fillCircle(beacon.x, beacon.y, 27 * pulse); this.beaconArt.lineStyle(2, color, 0.92); this.beaconArt.strokeCircle(beacon.x, beacon.y, 15 * pulse); this.beaconArt.fillStyle(color, 0.95); this.beaconArt.fillTriangle(beacon.x, beacon.y - 11, beacon.x + 11, beacon.y, beacon.x, beacon.y + 11); this.beaconArt.fillTriangle(beacon.x, beacon.y - 11, beacon.x - 11, beacon.y, beacon.x, beacon.y + 11); }
    },
    drawHazards(dt) {
      this.hazardArt.clear(); for (const hazard of this.hazards) { hazard.angle += hazard.speed * dt; const wobble = Math.sin(this.elapsed * 2 + hazard.wobble) * 18; hazard.x = 480 + Math.cos(hazard.angle) * (hazard.radius + wobble); hazard.y = 270 + Math.sin(hazard.angle) * (hazard.radius + wobble) * 0.58; this.hazardArt.fillStyle(COLORS.coral, 0.1); this.hazardArt.fillCircle(hazard.x, hazard.y, 25); this.hazardArt.lineStyle(2, COLORS.coral, 0.76); this.hazardArt.strokeCircle(hazard.x, hazard.y, 11); this.hazardArt.fillStyle(COLORS.coral, 0.9); this.hazardArt.fillCircle(hazard.x, hazard.y, 3); }
    },
    drawPlayer() { this.player.art.clear(); this.player.art.fillStyle(COLORS.mint, 0.08); this.player.art.fillCircle(0, 0, 38); this.player.art.lineStyle(2, COLORS.mint, 0.94); this.player.art.strokeCircle(0, 0, 13); this.player.art.lineStyle(3, COLORS.ink, 0.88); this.player.art.lineBetween(-7, 0, 7, 0); this.player.art.lineBetween(0, -7, 0, 7); this.player.art.x = this.player.x; this.player.art.y = this.player.y; this.player.art.rotation = Math.atan2(this.player.vy, this.player.vx) || 0; },
    burst(x, y, color, size) { this.bursts.push({ x, y, radius: 5, life: 1, color, size }); },
    drawBursts(dt) { for (const burst of this.bursts) { burst.radius += burst.size * 8 * dt; burst.life -= dt * 1.8; this.echoArt.lineStyle(2, burst.color, Math.max(0, burst.life)); this.echoArt.strokeCircle(burst.x, burst.y, burst.radius); } this.bursts = this.bursts.filter((burst) => burst.life > 0); },
    endRun(result) { if (this.mode !== "active") return; this.mode = "result"; this.result = result; this.publish(); },
    publish() { options.onState?.({ mode: this.mode, result: this.result, score: this.score, streak: this.streak, packets: this.collected, timeLeft: this.timeLeft, energy: this.energy, phase: "echo" }); },
  });
  const game = new Phaser.Game({ type: Phaser.AUTO, width: 960, height: 540, parent: options.parent, backgroundColor: "#080d12", scene: EchoLanternScene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
  const getScene = () => game.scene.getScene("EchoLantern"); return { start: () => getScene()?.startRun(), resume: () => getScene()?.resume(), light: () => getScene()?.pulse(), destroy: () => game.destroy(true) };
}
