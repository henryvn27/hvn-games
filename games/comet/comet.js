import Phaser from "phaser";

const WIDTH = 960;
const HEIGHT = 640;
const BOARD = { x: 96, y: 64, cols: 24, rows: 16, cell: 32 };
const COLORS = {
  field: 0x0d1722,
  grid: 0x263c4a,
  ink: 0xf2f5e8,
  muted: 0x8fa3a8,
  comet: 0x62e7d5,
  cometDark: 0x267c83,
  beacon: 0xc8f04a,
  beaconDark: 0x6c8528,
  rock: 0xf06b5d,
  rockDark: 0x7a3540,
  star: 0x778caa,
};

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const sameCell = (a, b) => a.x === b.x && a.y === b.y;

export function startComet(options = {}) {
  class CometScene extends Phaser.Scene {
    constructor() {
      super("Comet");
    }
  }

  Object.assign(CometScene.prototype, {
    create() {
      this.mode = "menu";
      this.result = null;
      this.score = 0;
      this.best = 0;
      this.elapsed = 0;
      this.level = 1;
      this.stepClock = 0;
      this.stepDelay = 0.18;
      this.direction = { ...DIRECTIONS.right };
      this.nextDirection = { ...DIRECTIONS.right };
      this.snake = [];
      this.food = null;
      this.rocks = [];
      this.stars = Array.from({ length: 54 }, (_, index) => ({
        x: 18 + ((index * 173) % 924),
        y: 16 + ((index * 97) % 608),
        size: index % 5 === 0 ? 2 : 1,
        alpha: 0.25 + (index % 4) * 0.1,
      }));
      this.backgroundArt = this.add.graphics().setDepth(0);
      this.rockArt = this.add.graphics().setDepth(1);
      this.foodArt = this.add.graphics().setDepth(2);
      this.snakeArt = this.add.graphics().setDepth(3);
      this.drawBackground();
      this.input.keyboard.on("keydown", (event) => this.handleKey(event));
      this.resetRun();
      this.publish();
    },

    drawBackground() {
      this.backgroundArt.clear();
      this.backgroundArt.fillStyle(COLORS.field, 1);
      this.backgroundArt.fillRect(0, 0, WIDTH, HEIGHT);
      for (const star of this.stars) {
        this.backgroundArt.fillStyle(COLORS.star, star.alpha);
        this.backgroundArt.fillRect(star.x, star.y, star.size, star.size);
      }
      this.backgroundArt.fillStyle(COLORS.grid, 0.18);
      this.backgroundArt.fillRect(BOARD.x, BOARD.y, BOARD.cols * BOARD.cell, 1);
      this.backgroundArt.fillRect(BOARD.x, BOARD.y + BOARD.rows * BOARD.cell, BOARD.cols * BOARD.cell, 1);
      for (let col = 0; col <= BOARD.cols; col += 1) {
        this.backgroundArt.lineStyle(1, COLORS.grid, 0.14);
        this.backgroundArt.lineBetween(BOARD.x + col * BOARD.cell, BOARD.y, BOARD.x + col * BOARD.cell, BOARD.y + BOARD.rows * BOARD.cell);
      }
      for (let row = 0; row <= BOARD.rows; row += 1) {
        this.backgroundArt.lineStyle(1, COLORS.grid, 0.14);
        this.backgroundArt.lineBetween(BOARD.x, BOARD.y + row * BOARD.cell, BOARD.x + BOARD.cols * BOARD.cell, BOARD.y + row * BOARD.cell);
      }
      this.backgroundArt.lineStyle(2, COLORS.grid, 0.7);
      this.backgroundArt.strokeRect(BOARD.x, BOARD.y, BOARD.cols * BOARD.cell, BOARD.rows * BOARD.cell);
    },

    resetRun() {
      this.score = 0;
      this.elapsed = 0;
      this.level = 1;
      this.stepClock = 0;
      this.stepDelay = 0.18;
      this.direction = { ...DIRECTIONS.right };
      this.nextDirection = { ...DIRECTIONS.right };
      this.snake = [
        { x: 10, y: 8 },
        { x: 9, y: 8 },
        { x: 8, y: 8 },
        { x: 7, y: 8 },
      ];
      this.rocks = [];
      this.spawnFood();
      this.draw();
    },

    startRun() {
      this.resetRun();
      this.mode = "active";
      this.result = null;
      options.onInput?.("start");
      this.publish();
    },

    togglePause() {
      if (this.mode === "active") this.mode = "pause";
      else if (this.mode === "pause") this.mode = "active";
      else return;
      this.publish();
    },

    setDirection(name) {
      if (this.mode !== "active" && this.mode !== "tutorial") return;
      const next = DIRECTIONS[name];
      if (!next || (next.x === -this.direction.x && next.y === -this.direction.y)) return;
      this.nextDirection = { ...next };
      options.onInput?.("move");
    },

    handleKey(event) {
      const keys = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
      if (keys[event.key]) {
        event.preventDefault();
        this.setDirection(keys[event.key]);
      }
      if (event.key === " " || event.key === "p" || event.key === "P") {
        event.preventDefault();
        this.togglePause();
      }
    },

    spawnFood() {
      const candidates = [];
      for (let y = 0; y < BOARD.rows; y += 1) {
        for (let x = 0; x < BOARD.cols; x += 1) {
          const cell = { x, y };
          if (this.snake.some((segment) => sameCell(segment, cell)) || this.rocks.some((rock) => sameCell(rock, cell))) continue;
          candidates.push(cell);
        }
      }
      this.food = candidates[Phaser.Math.Between(0, Math.max(0, candidates.length - 1))] || { x: 2, y: 2 };
    },

    maybeAddRock() {
      if (this.score < 30 || this.score % 30 !== 0 || this.rocks.length >= 6) return;
      const candidates = [];
      for (let y = 2; y < BOARD.rows - 2; y += 1) {
        for (let x = 2; x < BOARD.cols - 2; x += 1) {
          const cell = { x, y };
          if (this.snake.some((segment) => sameCell(segment, cell)) || sameCell(this.food, cell) || this.rocks.some((rock) => sameCell(rock, cell))) continue;
          candidates.push(cell);
        }
      }
      const rock = candidates[Phaser.Math.Between(0, Math.max(0, candidates.length - 1))];
      if (rock) this.rocks.push(rock);
    },

    step() {
      this.direction = { ...this.nextDirection };
      const head = this.snake[0];
      const next = { x: head.x + this.direction.x, y: head.y + this.direction.y };
      const ate = this.food && sameCell(next, this.food);
      const bodyToCheck = ate ? this.snake : this.snake.slice(0, -1);
      const outside = next.x < 0 || next.x >= BOARD.cols || next.y < 0 || next.y >= BOARD.rows;
      if (outside || bodyToCheck.some((segment) => sameCell(segment, next)) || this.rocks.some((rock) => sameCell(rock, next))) {
        this.endRun();
        return;
      }
      this.snake.unshift(next);
      if (ate) {
        this.score += 10 + this.level * 2;
        this.level = 1 + Math.floor(this.score / 50);
        this.stepDelay = Math.max(0.09, 0.18 - (this.level - 1) * 0.008);
        this.maybeAddRock();
        this.spawnFood();
        this.burst(next);
      } else {
        this.snake.pop();
      }
      this.draw();
      this.publish();
    },

    burst(cell) {
      const x = BOARD.x + cell.x * BOARD.cell + BOARD.cell / 2;
      const y = BOARD.y + cell.y * BOARD.cell + BOARD.cell / 2;
      this.tweens.add({ targets: this.foodArt, alpha: 0.55, duration: 70, yoyo: true, repeat: 1 });
      this.foodArt.fillStyle(COLORS.beacon, 0.35);
      this.foodArt.fillCircle(x, y, 22);
    },

    endRun() {
      this.mode = "result";
      this.result = "lost";
      this.best = Math.max(this.best, this.score);
      this.draw();
      this.cameras.main.flash(180, 240, 107, 93, false);
      this.publish();
    },

    draw() {
      this.rockArt.clear();
      for (const rock of this.rocks) {
        const x = BOARD.x + rock.x * BOARD.cell + BOARD.cell / 2;
        const y = BOARD.y + rock.y * BOARD.cell + BOARD.cell / 2;
        this.rockArt.fillStyle(COLORS.rockDark, 1);
        this.rockArt.fillCircle(x, y, 13);
        this.rockArt.fillStyle(COLORS.rock, 1);
        this.rockArt.fillCircle(x - 2, y - 2, 9);
        this.rockArt.fillStyle(COLORS.rockDark, 0.75);
        this.rockArt.fillCircle(x + 3, y + 3, 2.5);
      }

      this.foodArt.clear();
      if (this.food) {
        const x = BOARD.x + this.food.x * BOARD.cell + BOARD.cell / 2;
        const y = BOARD.y + this.food.y * BOARD.cell + BOARD.cell / 2;
        this.foodArt.fillStyle(COLORS.beaconDark, 0.9);
        this.foodArt.fillCircle(x, y, 12);
        this.foodArt.fillStyle(COLORS.beacon, 1);
        this.foodArt.fillCircle(x, y, 8);
        this.foodArt.lineStyle(2, COLORS.ink, 0.65);
        this.foodArt.strokeCircle(x, y, 11);
      }

      this.snakeArt.clear();
      [...this.snake].reverse().forEach((segment, index) => {
        const segmentIndex = this.snake.length - 1 - index;
        const x = BOARD.x + segment.x * BOARD.cell + BOARD.cell / 2;
        const y = BOARD.y + segment.y * BOARD.cell + BOARD.cell / 2;
        const tailFade = Math.max(0.42, 1 - segmentIndex * 0.025);
        this.snakeArt.fillStyle(segmentIndex === 0 ? COLORS.comet : COLORS.cometDark, tailFade);
        this.snakeArt.fillRoundedRect(x - 12, y - 12, 24, 24, 7);
        if (segmentIndex === 0) {
          this.snakeArt.fillStyle(COLORS.ink, 0.9);
          const eyeOffsetX = this.direction.x * 5 - this.direction.y * 4;
          const eyeOffsetY = this.direction.y * 5 + this.direction.x * 4;
          this.snakeArt.fillCircle(x + eyeOffsetX, y + eyeOffsetY, 2.2);
        }
      });
    },

    update(_time, delta) {
      if (this.mode !== "active") return;
      const dt = Math.min(0.05, delta / 1000);
      this.elapsed += dt;
      this.stepClock += dt;
      while (this.stepClock >= this.stepDelay) {
        this.stepClock -= this.stepDelay;
        this.step();
        if (this.mode !== "active") break;
      }
    },

    publish() {
      options.onState?.({ mode: this.mode, result: this.result, score: this.score, best: this.best, level: this.level, length: this.snake.length, elapsed: this.elapsed });
    },
  });

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: options.parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: "#0d1722",
    render: { antialias: true, pixelArt: false, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: CometScene,
  });

  const getScene = () => game.scene.getScene("Comet");
  return {
    start: () => getScene()?.startRun(),
    togglePause: () => getScene()?.togglePause(),
    setDirection: (direction) => getScene()?.setDirection(direction),
    destroy: () => game.destroy(true),
  };
}
