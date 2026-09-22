import * as THREE from "three";
import "./tower-defense.css";
import { getPlayerName } from "./play-intelligence.js";

const CELL = 1.55;
const BOARD = { columns: 9, rows: 7 };
const COLORS = {
  ink: 0x08111f,
  panel: 0x121c27,
  grid: 0x2a3948,
  path: 0x2b3640,
  route: 0xb7a47b,
  cyan: 0x71d8d1,
  amber: 0xe2ad59,
  coral: 0xd75f55,
  sage: 0x9fb89a,
  white: 0xf5f8ff,
};

const TOWERS = {
  arc: { name: "Relay gun", hint: "quick", cost: 70, range: 3.25, damage: 15, rate: 1.7, color: COLORS.cyan },
  rail: { name: "Coil cannon", hint: "long range", cost: 105, range: 5.5, damage: 46, rate: 0.62, color: COLORS.amber },
  pulse: { name: "Dust snare", hint: "slows", cost: 90, range: 3.9, damage: 12, rate: 0.9, color: COLORS.sage },
};

const ENEMIES = {
  scout: { name: "crawler", speed: 1.65, hp: 38, damage: 1, reward: 9, color: COLORS.coral, size: 0.27 },
  brute: { name: "hauler", speed: 0.67, hp: 125, damage: 2, reward: 18, color: COLORS.amber, size: 0.42 },
  runner: { name: "skitter", speed: 2.15, hp: 29, damage: 1, reward: 14, color: 0xef8e6f, size: 0.22 },
};

function colorMaterial(color, emissive = color, intensity = 0.35, roughness = 0.35) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, metalness: 0.58, roughness });
}

function cellKey(cell) {
  return `${cell.x}:${cell.z}`;
}

export function startNeonBastion({ parent = "tower-defense-root", base = "./" } = {}) {
  const node = typeof parent === "string" ? document.getElementById(parent) : parent;
  if (!node) throw new Error(`Neon Bastion mount not found: ${parent}`);
  return new NeonBastion(node, base);
}

class NeonBastion {
  constructor(node, base) {
    this.node = node;
    this.base = base;
    this.seedValue = 1337;
    this.randomState = this.seedValue;
    this.mode = "menu";
    this.speed = 1;
    this.reducedMotion = false;
    this.capturePaused = false;
    this.selectedType = "arc";
    this.selectedTower = null;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.spawnQueue = [];
    this.waveRunning = false;
    this.spawnTimer = 0;
    this.wave = 0;
    this.score = 0;
    this.energy = 300;
    this.coreHp = 10;
    this.elapsed = 0;
    this.messageTimer = 0;
    this.frames = 0;
    this.fpsSample = { time: 0, frames: 0, value: 60 };
    this.lastFrame = performance.now();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.mount();
  }

  mount() {
    this.node.innerHTML = `
      <div class="nb-shell">
        <header class="nb-header">
          <a class="nb-wordmark" href="${this.base}">HVN games</a>
          <div class="nb-title"><span class="nb-title-mark"></span><strong>Space Tower Defense</strong><span>lunar relay defense</span></div>
          <button class="nb-pause" id="nb-pause" type="button">pause</button>
        </header>
        <div class="nb-layout">
          <section class="nb-stage" aria-label="Lunar relay defense map">
            <div id="nb-canvas" class="nb-canvas"></div>
            <div class="nb-map-label"><span>outpost 07</span><span>relay route</span></div>
            <div class="nb-stage-note" id="nb-stage-note">Build on a marked pad. Start the next wave when ready.</div>
            <div class="nb-overlay" id="nb-overlay">
              <div class="nb-overlay-card">
                <p class="nb-overline" id="nb-overlay-overline">outpost 07 · moon side</p>
                <h1 id="nb-overlay-title">Keep the relay online.</h1>
                <p id="nb-overlay-copy">Build guns beside the route. Stop the crawlers before they reach the relay.</p>
                <button class="nb-primary" id="nb-overlay-action" type="button">start a shift</button>
                <p class="nb-keyline">click a pad to build · 1–3 choose a tower · space sends a wave · p pauses</p>
              </div>
            </div>
          </section>
          <aside class="nb-controls" aria-label="Game controls">
            <div class="nb-stats">
              <div><span>relay</span><strong id="nb-core">10 / 10</strong></div>
              <div><span>credits</span><strong id="nb-energy">300</strong></div>
              <div><span>wave</span><strong id="nb-wave">—</strong></div>
              <div><span>score</span><strong id="nb-score">0000</strong></div>
            </div>
            <div class="nb-meter"><span id="nb-core-meter"></span></div>
            <div class="nb-section-heading"><h2>Build a defense</h2><span id="nb-build-note">choose one</span></div>
            <div class="nb-tower-list">
              <button class="nb-tower-option is-selected" data-tower="arc" type="button"><span class="nb-tower-icon nb-icon-arc"></span><span><b>Relay gun</b><small>quick · 70 credits</small></span><i>1</i></button>
              <button class="nb-tower-option" data-tower="rail" type="button"><span class="nb-tower-icon nb-icon-rail"></span><span><b>Coil cannon</b><small>long range · 105 credits</small></span><i>2</i></button>
              <button class="nb-tower-option" data-tower="pulse" type="button"><span class="nb-tower-icon nb-icon-pulse"></span><span><b>Dust snare</b><small>slows · 90 credits</small></span><i>3</i></button>
            </div>
            <button class="nb-secondary nb-upgrade" id="nb-upgrade" type="button" disabled>upgrade tower <span>—</span></button>
            <div class="nb-divider"></div>
            <button class="nb-primary nb-wave-button" id="nb-wave-button" type="button">send wave 1</button>
            <button class="nb-secondary nb-speed" id="nb-speed" type="button">speed: 1×</button>
            <p class="nb-status" id="nb-status">Choose a defense before sending the first wave.</p>
            <div class="nb-legend"><span><i class="nb-dot nb-dot-path"></i>route</span><span><i class="nb-dot nb-dot-pad"></i>build site</span><span><i class="nb-dot nb-dot-enemy"></i>crawler</span></div>
          </aside>
        </div>
      </div>
    `;

    this.stage = this.node.querySelector(".nb-stage");
    this.canvasNode = this.node.querySelector("#nb-canvas");
    this.overlay = this.node.querySelector("#nb-overlay");
    this.overlayTitle = this.node.querySelector("#nb-overlay-title");
    this.overlayCopy = this.node.querySelector("#nb-overlay-copy");
    this.overlayOverline = this.node.querySelector("#nb-overlay-overline");
    this.overlayAction = this.node.querySelector("#nb-overlay-action");
    this.stageNote = this.node.querySelector("#nb-stage-note");
    this.pauseButton = this.node.querySelector("#nb-pause");
    this.waveButton = this.node.querySelector("#nb-wave-button");
    this.speedButton = this.node.querySelector("#nb-speed");
    this.upgradeButton = this.node.querySelector("#nb-upgrade");
    this.statusNode = this.node.querySelector("#nb-status");
    this.setupScene();
    this.setupInput();
    this.resetRun();
    this.publishDiagnostics();
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.ink);
    this.scene.fog = new THREE.Fog(COLORS.ink, 22, 38);
    this.camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 100);
    this.camera.position.set(0, 16, 18);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(1, 1, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.canvasNode.append(this.renderer.domElement);
    this.board = new THREE.Group();
    this.scene.add(this.board);
    this.buildSpace();
    this.buildBoard();
    this.buildLights();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvasNode);
    this.resize();
  }

  buildSpace() {
    const starPositions = [];
    this.withRandomState(() => {
      for (let i = 0; i < 180; i += 1) starPositions.push((this.random() - 0.5) * 46, 3 + this.random() * 18, (this.random() - 0.5) * 42);
    });
    const stars = new THREE.BufferGeometry();
    stars.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    this.scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0x7892b7, size: 0.045, transparent: true, opacity: 0.65 }))); 
    const halo = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshBasicMaterial({ color: 0x102442, transparent: true, opacity: 0.24, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.22;
    this.scene.add(halo);
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x9bb7ff, 0x0b1021, 1.8));
    const key = new THREE.DirectionalLight(0xe9f4ff, 2.8);
    key.position.set(-6, 12, 8);
    this.scene.add(key);
    const fill = new THREE.PointLight(COLORS.cyan, 12, 18, 2);
    fill.position.set(0, 4, 0);
    this.scene.add(fill);
  }

  buildBoard() {
    const boardBase = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.45, 11.8), colorMaterial(0x0e1a2d, 0x071223, 0.18, 0.72));
    boardBase.position.y = -0.32;
    this.board.add(boardBase);
    const boardTop = new THREE.Mesh(new THREE.BoxGeometry(15.1, 0.1, 11.4), colorMaterial(0x111f35, 0x0b2440, 0.25, 0.75));
    boardTop.position.y = -0.06;
    this.board.add(boardTop);

    const routeCells = [
      { x: -4, z: 2 }, { x: -3, z: 2 }, { x: -2, z: 2 }, { x: -2, z: 1 }, { x: -2, z: 0 },
      { x: -1, z: 0 }, { x: 0, z: 0 }, { x: 1, z: 0 }, { x: 1, z: 1 }, { x: 1, z: 2 },
      { x: 2, z: 2 }, { x: 3, z: 2 }, { x: 4, z: 2 },
    ];
    this.routeCells = routeCells;
    this.pathPoints = routeCells.map((cell) => this.worldCell(cell));
    this.pathLengths = [];
    this.pathTotal = 0;
    for (let i = 1; i < this.pathPoints.length; i += 1) {
      const length = this.pathPoints[i - 1].distanceTo(this.pathPoints[i]);
      this.pathLengths.push(length);
      this.pathTotal += length;
    }
    const routeSet = new Set(routeCells.map(cellKey));
    const buildCells = {};
    routeCells.forEach(({ x, z }) => {
      [[x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1]].forEach(([neighborX, neighborZ]) => {
        const key = `${neighborX}:${neighborZ}`;
        if (neighborX >= -4 && neighborX <= 4 && neighborZ >= -3 && neighborZ <= 3 && !routeSet.has(key)) buildCells[key] = true;
      });
    });
    this.padByKey = new Map();
    const gridMaterial = new THREE.LineBasicMaterial({ color: COLORS.grid, transparent: true, opacity: 0.62 });
    const gridPoints = [];
    for (let x = -4; x <= 4; x += 1) {
      gridPoints.push(x * CELL - CELL * 0.5, 0.01, -3.5 * CELL, x * CELL - CELL * 0.5, 0.01, 3.5 * CELL);
    }
    for (let z = -3; z <= 3; z += 1) {
      gridPoints.push(-4.5 * CELL, 0.01, z * CELL - CELL * 0.5, 4.5 * CELL, 0.01, z * CELL - CELL * 0.5);
    }
    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3));
    this.board.add(new THREE.LineSegments(gridGeometry, gridMaterial));
    for (let x = -4; x <= 4; x += 1) {
      for (let z = -3; z <= 3; z += 1) {
        const cell = { x, z };
        const world = this.worldCell(cell);
        if (routeSet.has(cellKey(cell))) {
          const tile = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.9, 0.08, CELL * 0.9), colorMaterial(COLORS.path, 0x47535b, 0.16, 0.84));
          tile.position.copy(world).setY(0.02);
          this.board.add(tile);
          const lane = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.07, 0.035, CELL * 0.76), new THREE.MeshBasicMaterial({ color: COLORS.route, transparent: true, opacity: 0.42 }));
          lane.position.copy(world).setY(0.1);
          this.board.add(lane);
          continue;
        }
        if (x === 4 && z === 2) continue;
        if (!buildCells[cellKey(cell)]) continue;
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.09, 6), new THREE.MeshStandardMaterial({ color: 0x6d604d, emissive: COLORS.amber, emissiveIntensity: 0.08, metalness: 0.32, roughness: 0.72 }));
        pad.position.copy(world).setY(0.1);
        pad.userData.cell = cell;
        pad.userData.baseMaterial = pad.material;
        this.board.add(pad);
        this.padByKey.set(cellKey(cell), pad);
      }
    }
    this.buildCore(this.pathPoints.at(-1));
  }

  buildCore(position) {
    this.core = new THREE.Group();
    this.core.position.copy(position).setY(0.35);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.9, 0.26, 8), colorMaterial(0x26313c, 0x344856, 0.2, 0.7));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.045, 8, 32), new THREE.MeshBasicMaterial({ color: COLORS.route, transparent: true, opacity: 0.8 }));
    ring.rotation.x = Math.PI / 2;
    const crystal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.9, 6), colorMaterial(0x6bc9c3, COLORS.cyan, 0.38, 0.32));
    crystal.position.y = 0.68;
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.22, 16, 1, true), colorMaterial(0x7d8790, 0x3b4e59, 0.12, 0.66));
    dish.position.y = 1.18;
    dish.rotation.x = Math.PI;
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 8), new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.22 }));
    beacon.position.y = 1.75;
    this.core.add(base, ring, crystal, dish, beacon);
    this.coreOrb = dish;
    this.board.add(this.core);
  }

  worldCell(cell) {
    return new THREE.Vector3(cell.x * CELL, 0, cell.z * CELL);
  }

  setupInput() {
    this.canvasNode.addEventListener("pointerdown", (event) => this.onBoardPointer(event));
    this.node.querySelectorAll("[data-tower]").forEach((button) => button.addEventListener("click", () => this.selectType(button.dataset.tower)));
    this.waveButton.addEventListener("click", () => this.launchWave());
    this.upgradeButton.addEventListener("click", () => this.upgradeSelected());
    this.pauseButton.addEventListener("click", () => this.togglePause());
    this.speedButton.addEventListener("click", () => { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; this.speedButton.textContent = `speed: ${this.speed}×`; });
    this.overlayAction.addEventListener("click", () => {
      if (this.overlayAction.dataset.action === "resume") this.togglePause();
      else this.startRun();
    });
    window.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (["1", "2", "3"].includes(event.key)) this.selectType(["arc", "rail", "pulse"][Number(event.key) - 1]);
      if (event.code === "Space") { event.preventDefault(); this.launchWave(); }
      if (event.key.toLowerCase() === "p") this.togglePause();
    });
  }

  onBoardPointer(event) {
    if (this.mode !== "active") return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.board.children, true);
    const hit = hits.find((item) => item.object.userData.cell || item.object.userData.tower);
    if (!hit) return;
    let object = hit.object;
    while (object && !object.userData.cell && !object.userData.tower) object = object.parent;
    if (!object) return;
    if (object.userData.tower) return this.selectTower(object.userData.tower);
    this.buildAt(object);
  }

  selectType(type) {
    if (!TOWERS[type]) return;
    this.selectedType = type;
    this.node.querySelectorAll("[data-tower]").forEach((button) => button.classList.toggle("is-selected", button.dataset.tower === type));
    this.node.querySelector("#nb-build-note").textContent = `${TOWERS[type].name} selected`;
    this.stageNote.textContent = `Click a marked pad to place ${TOWERS[type].name}.`;
  }

  buildAt(pad) {
    if (pad.userData.tower) return this.selectTower(pad.userData.tower);
    const spec = TOWERS[this.selectedType];
    if (this.energy < spec.cost) return this.flashStatus(`Need ${spec.cost} energy for ${spec.name}.`);
    const tower = { type: this.selectedType, level: 1, cooldown: 0.2, cell: pad.userData.cell, pad, ...spec };
    tower.group = this.createTowerMesh(tower);
    tower.group.position.copy(pad.position).setY(0.1);
    tower.group.userData.tower = tower;
    pad.userData.tower = tower;
    pad.material = new THREE.MeshStandardMaterial({ color: 0x263f4b, emissive: spec.color, emissiveIntensity: 0.22, metalness: 0.48, roughness: 0.35 });
    this.board.add(tower.group);
    this.towers.push(tower);
    this.energy -= spec.cost;
    this.selectedTower = tower;
    this.flashStatus(`${spec.name} placed. Cover the relay route.`);
    this.playTone("build");
    this.updateHud();
  }

  createTowerMesh(tower) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.22, 8), colorMaterial(0x24344b, 0x1f6a79, 0.24));
    const body = tower.type === "rail"
      ? new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.34), colorMaterial(0xd1a052, COLORS.amber, 0.2, 0.32))
      : tower.type === "pulse"
        ? new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 20), colorMaterial(COLORS.sage, COLORS.sage, 0.2, 0.3))
        : new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.44, 8), colorMaterial(COLORS.cyan, COLORS.cyan, 0.2, 0.3));
    body.position.y = 0.34;
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(tower.type === "rail" ? 0.13 : 0.09, 0.12, tower.type === "rail" ? 0.64 : 0.44), colorMaterial(0xc8d0d0, 0x55636b, 0.1, 0.5));
    barrel.position.set(0, 0.42, 0.2);
    group.add(base, body, barrel);
    const ring = new THREE.Mesh(new THREE.RingGeometry(tower.range - 0.018, tower.range, 64), new THREE.MeshBasicMaterial({ color: tower.color, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    ring.name = "range-ring";
    group.add(ring);
    tower.body = body;
    tower.rangeRing = ring;
    return group;
  }

  selectTower(tower) {
    if (this.selectedTower?.rangeRing) this.selectedTower.rangeRing.material.opacity = 0;
    this.selectedTower = tower;
    if (tower.rangeRing) tower.rangeRing.material.opacity = 0.24;
    this.updateHud();
    this.flashStatus(`${tower.name} level ${tower.level}. Upgrade it or place another.`);
  }

  upgradeSelected() {
    const tower = this.selectedTower;
    if (!tower) return;
    const cost = 55 + tower.level * 35;
    if (this.energy < cost) return this.flashStatus(`Need ${cost} energy to upgrade.`);
    tower.level += 1;
    tower.damage *= 1.26;
    tower.range += 0.18;
    tower.rate *= 1.12;
    tower.rangeRing.geometry.dispose();
    tower.rangeRing.geometry = new THREE.RingGeometry(tower.range - 0.018, tower.range, 64);
    this.energy -= cost;
    this.flashStatus(`${tower.name} upgraded to level ${tower.level}.`);
    this.playTone("upgrade");
    this.updateHud();
  }

  startRun() {
    this.resetRun();
    this.mode = "active";
    this.overlay.classList.add("is-hidden");
    this.overlay.setAttribute("aria-hidden", "true");
    this.flashStatus("Build a defense, then send wave 1.");
    this.playTone("start");
    this.updateHud();
  }

  resetRun() {
    this.clearEntities();
    this.wave = 0;
    this.score = 0;
    this.energy = 300;
    this.coreHp = 10;
    this.elapsed = 0;
    this.waveRunning = false;
    this.spawnQueue = [];
    this.selectedTower = null;
    this.selectType("arc");
    this.mode = "menu";
    this.overlay.classList.remove("is-hidden");
    this.overlay.setAttribute("aria-hidden", "false");
    this.overlayOverline.textContent = "outpost 07 · moon side";
    this.overlayTitle.textContent = "Keep the relay online.";
    this.overlayCopy.textContent = "Build guns beside the route. Stop the crawlers before they reach the relay.";
    this.overlayAction.textContent = "start a shift";
    this.overlayAction.dataset.action = "start";
    this.updateHud();
  }

  clearEntities() {
    this.towers.forEach((tower) => { if (tower.group) this.board.remove(tower.group); if (tower.pad) { tower.pad.userData.tower = null; tower.pad.material = tower.pad.userData.baseMaterial; } });
    this.enemies.forEach((enemy) => this.board.remove(enemy.group));
    this.projectiles.forEach((projectile) => this.board.remove(projectile.mesh));
    this.effects.forEach((effect) => this.board.remove(effect.mesh));
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
  }

  launchWave() {
    if (this.mode !== "active" || this.waveRunning) return;
    if (!this.towers.length) return this.flashStatus("Build at least one defense before sending a wave.");
    this.wave += 1;
    this.waveRunning = true;
    this.spawnTimer = 0.15;
    this.spawnQueue = this.createWave(this.wave);
    this.flashStatus(`Wave ${this.wave} is on the route.`);
    this.playTone("wave");
    this.updateHud();
  }

  createWave(wave) {
    const count = Math.min(22, 5 + wave * 2);
    return Array.from({ length: count }, (_, index) => {
      if (wave === 1) return "scout";
      if (wave === 2) return index % 4 === 0 ? "brute" : "scout";
      if (wave === 3) return index % 4 === 0 ? "runner" : index % 3 === 0 ? "brute" : "scout";
      const roll = this.random();
      return roll < 0.2 ? "runner" : roll < 0.42 ? "brute" : "scout";
    });
  }

  spawnEnemy(type) {
    const spec = ENEMIES[type];
    const group = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(spec.size, 1), colorMaterial(spec.color, spec.color, 0.5, 0.26));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(spec.size * 0.23, 8, 8), new THREE.MeshBasicMaterial({ color: COLORS.white }));
    eye.position.set(0, spec.size * 0.3, spec.size * 0.76);
    group.add(shell, eye);
    const healthBack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.055, 0.035), new THREE.MeshBasicMaterial({ color: 0x3a2431 }));
    const healthFill = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.035, 0.04), new THREE.MeshBasicMaterial({ color: spec.color }));
    healthBack.position.y = 0.75;
    healthFill.position.set(0, 0.75, 0.02);
    group.add(healthBack, healthFill);
    const enemy = { type, ...spec, hp: spec.hp * (1 + Math.max(0, this.wave - 3) * 0.1), maxHp: spec.hp * (1 + Math.max(0, this.wave - 3) * 0.1), distance: 0, slow: 0, group, healthFill, progress: 0 };
    group.position.copy(this.pathPoints[0]).setY(0.32);
    this.board.add(group);
    this.enemies.push(enemy);
  }

  updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.distance += enemy.speed * (enemy.slow > 0 ? 0.56 : 1) * dt;
      if (enemy.distance >= this.pathTotal) {
        this.board.remove(enemy.group);
        this.enemies.splice(i, 1);
        this.coreHp = Math.max(0, this.coreHp - enemy.damage);
        this.spawnImpact(this.core.position, COLORS.coral, 1.2);
        this.playTone("leak");
        if (this.coreHp <= 0) this.finishRun();
        continue;
      }
      let remaining = enemy.distance;
      let segment = 0;
      while (segment < this.pathLengths.length - 1 && remaining > this.pathLengths[segment]) { remaining -= this.pathLengths[segment]; segment += 1; }
      const t = this.pathLengths[segment] ? remaining / this.pathLengths[segment] : 0;
      enemy.progress = segment + t;
      enemy.group.position.lerpVectors(this.pathPoints[segment], this.pathPoints[segment + 1], t).setY(0.32);
      enemy.group.rotation.y += dt * (enemy.type === "runner" ? 5 : 2);
      enemy.healthFill.scale.x = Math.max(0.02, enemy.hp / enemy.maxHp);
      enemy.healthFill.position.x = -0.34 * (1 - enemy.hp / enemy.maxHp);
    }
  }

  updateTowers(dt) {
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      tower.body.rotation.y += dt * (tower.type === "rail" ? 0.8 : 1.4);
      if (tower.cooldown > 0) continue;
      const target = this.enemies.filter((enemy) => enemy.hp > 0 && tower.group.position.distanceTo(enemy.group.position) <= tower.range).sort((a, b) => b.progress - a.progress)[0];
      if (!target) continue;
      tower.cooldown = 1 / tower.rate;
      this.fireProjectile(tower, target);
    }
  }

  fireProjectile(tower, target) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(tower.type === "rail" ? 0.09 : 0.07, 8, 8), new THREE.MeshBasicMaterial({ color: tower.color }));
    mesh.position.copy(tower.group.position).add(new THREE.Vector3(0, 0.55, 0));
    this.board.add(mesh);
    this.projectiles.push({ mesh, tower, target, start: mesh.position.clone(), progress: 0, duration: Math.max(0.08, mesh.position.distanceTo(target.group.position) / 11) });
    this.playTone(tower.type);
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      if (!this.enemies.includes(projectile.target) || projectile.target.hp <= 0) { this.board.remove(projectile.mesh); this.projectiles.splice(i, 1); continue; }
      projectile.progress += dt / projectile.duration;
      projectile.mesh.position.lerpVectors(projectile.start, projectile.target.group.position, Math.min(1, projectile.progress));
      if (projectile.progress < 1) continue;
      const { target, tower } = projectile;
      target.hp -= tower.damage;
      if (tower.type === "pulse") {
        target.slow = 1.45;
        this.enemies.forEach((other) => { if (other !== target && other.group.position.distanceTo(target.group.position) < 1.2) other.hp -= tower.damage * 0.42; });
      }
      this.spawnImpact(target.group.position, tower.color, tower.type === "rail" ? 0.8 : 0.45);
      if (target.hp <= 0) this.killEnemy(target);
      this.board.remove(projectile.mesh);
      this.projectiles.splice(i, 1);
    }
  }

  killEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;
    this.board.remove(enemy.group);
    this.enemies.splice(index, 1);
    this.score += enemy.reward * this.wave;
    this.energy += 3;
    this.playTone("hit");
  }

  spawnImpact(position, color, scale) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.14, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position).setY(0.55);
    this.board.add(mesh);
    this.effects.push({ mesh, life: 0, duration: this.reducedMotion ? 0.18 : 0.42, scale });
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.life += dt;
      const t = effect.life / effect.duration;
      effect.mesh.scale.setScalar(1 + t * effect.scale * 2);
      effect.mesh.material.opacity = Math.max(0, 0.85 * (1 - t));
      if (t >= 1) { this.board.remove(effect.mesh); this.effects.splice(i, 1); }
    }
  }

  update(dt) {
    if (this.capturePaused || this.mode !== "active") return;
    const step = Math.min(dt, 0.08) * this.speed;
    this.elapsed += step;
    this.messageTimer = Math.max(0, this.messageTimer - step);
    if (this.waveRunning && this.spawnQueue.length) {
      this.spawnTimer -= step;
      if (this.spawnTimer <= 0) { this.spawnEnemy(this.spawnQueue.shift()); this.spawnTimer = Math.max(0.28, 0.78 - this.wave * 0.018); }
    }
    this.updateEnemies(step);
    this.updateTowers(step);
    this.updateProjectiles(step);
    this.updateEffects(step);
    if (this.waveRunning && !this.spawnQueue.length && !this.enemies.length) {
      this.waveRunning = false;
      this.energy += 50 + this.wave * 12;
      this.flashStatus(`Wave ${this.wave} clear. Add a defense or send the next one.`);
      this.playTone("clear");
    }
    if (this.coreOrb && !this.reducedMotion) this.coreOrb.rotation.y += step * 1.4;
    this.updateHud();
  }

  finishRun() {
    if (this.mode === "result") return;
    this.mode = "result";
    this.waveRunning = false;
    this.overlay.classList.remove("is-hidden");
    this.overlay.setAttribute("aria-hidden", "false");
    this.overlayOverline.textContent = "outpost 07 · relay offline";
    this.overlayTitle.textContent = `Score ${this.score}`;
    this.overlayCopy.textContent = `You held through ${this.wave} wave${this.wave === 1 ? "" : "s"}. Rebuild the defense and try again.`;
    this.overlayAction.textContent = "restart shift";
    this.overlayAction.dataset.action = "retry";
    this.stageNote.textContent = "Relay offline. Restart when you are ready.";
    const online = window.HVNOnlineLeaderboard;
    const name = getPlayerName();
    if (online?.configured && name) void online.submit("neon-bastion", { name, score: this.score, packets: this.wave, seconds: this.elapsed });
    this.playTone("fail");
    this.updateHud();
  }

  togglePause() {
    if (this.mode === "active") {
      this.mode = "pause";
      this.overlay.classList.remove("is-hidden");
      this.overlay.setAttribute("aria-hidden", "false");
      this.overlayOverline.textContent = "outpost 07 · holding pattern";
      this.overlayTitle.textContent = "Paused.";
      this.overlayCopy.textContent = "The relay, crawlers, and projectiles are all held in place.";
      this.overlayAction.textContent = "resume";
      this.overlayAction.dataset.action = "resume";
    } else if (this.mode === "pause") {
      this.mode = "active";
      this.overlay.classList.add("is-hidden");
      this.overlay.setAttribute("aria-hidden", "true");
    }
    this.updateHud();
  }

  flashStatus(message) {
    this.statusNode.textContent = message;
    this.stageNote.textContent = message;
    this.messageTimer = 2.6;
  }

  updateHud() {
    this.node.querySelector("#nb-core").textContent = `${this.coreHp} / 10`;
    this.node.querySelector("#nb-energy").textContent = String(Math.floor(this.energy));
    this.node.querySelector("#nb-wave").textContent = this.wave ? String(this.wave) : "—";
    this.node.querySelector("#nb-score").textContent = String(this.score).padStart(4, "0");
    this.node.querySelector("#nb-core-meter").style.width = `${this.coreHp * 10}%`;
    this.pauseButton.textContent = this.mode === "pause" ? "resume" : "pause";
    this.pauseButton.disabled = !["active", "pause"].includes(this.mode);
    const canLaunch = this.mode === "active" && !this.waveRunning && this.towers.length > 0;
    this.waveButton.disabled = !canLaunch;
    this.waveButton.textContent = this.wave ? `send wave ${this.wave + 1}` : "send wave 1";
    this.upgradeButton.disabled = !this.selectedTower || this.mode !== "active";
    if (this.selectedTower) {
      const cost = 55 + this.selectedTower.level * 35;
      this.upgradeButton.innerHTML = `upgrade ${this.selectedTower.name.toLowerCase()} <span>${cost}</span>`;
    } else this.upgradeButton.innerHTML = "upgrade tower <span>—</span>";
  }

  resize() {
    const width = Math.max(1, this.canvasNode.clientWidth);
    const height = Math.max(1, this.canvasNode.clientHeight);
    const aspect = width / height;
    const viewHeight = aspect < 1 ? 15 : 12;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.right = (viewHeight * aspect) / 2;
    this.camera.left = -this.camera.right;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.frames += 1;
    this.fpsSample.time += dt;
    this.fpsSample.frames += 1;
    if (this.fpsSample.time > 0.5) { this.fpsSample.value = this.fpsSample.frames / this.fpsSample.time; this.fpsSample.time = 0; this.fpsSample.frames = 0; }
    this.publishDiagnostics();
  }

  publishDiagnostics() {
    const info = this.renderer?.info;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      game: "neon-bastion",
      state: this.mode,
      mode: this.mode,
      objective: this.coreHp > 0 ? "protect the core" : "retry the run",
      score: this.score,
      wave: this.wave,
      coreHp: this.coreHp,
      energy: Math.floor(this.energy),
      activeEnemies: this.enemies.length,
      framesAdvanced: this.frames,
      simulationTime: Number(this.elapsed.toFixed(3)),
      fps: Math.round(this.fpsSample.value),
      playerPosition: { x: this.core.position.x, y: this.core.position.z },
      renderer: info ? { calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures, pixelRatio: this.renderer.getPixelRatio() } : null,
    };
  }

  installTestHooks() {
    window.__THREE_GAME_TEST_HOOKS__ = {
      seed: async (seed = 1337) => { this.seed(seed); return { seed: this.seedValue }; },
      setState: async (state) => {
        if (!["menu", "active-play", "active-play-mobile", "pause-or-settings", "fail-or-retry"].includes(state)) throw new Error(`Unknown Neon Bastion state: ${state}`);
        if (state === "menu") { this.resetRun(); return { state }; }
        this.startRun();
        if (state === "pause-or-settings") this.togglePause();
        if (state === "fail-or-retry") { this.coreHp = 0; this.finishRun(); }
        return { state };
      },
      setPausedForScreenshot: (value) => { this.capturePaused = Boolean(value); },
      setReducedMotion: (value) => { this.reducedMotion = Boolean(value); },
      hideDebugUi: () => {},
    };
  }

  seed(seed) {
    this.seedValue = Number.isFinite(Number(seed)) ? Number(seed) : 1337;
    this.randomState = this.seedValue >>> 0;
  }

  random() {
    this.randomState = (1664525 * this.randomState + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  withRandomState(callback) {
    const before = this.randomState;
    callback();
    this.randomState = before;
  }

  playTone(kind) {
    if (!this.audio) {
      try { this.audio = new AudioContext(); } catch { return; }
    }
    if (this.audio.state === "suspended") this.audio.resume().catch(() => {});
    const frequencies = { start: 220, wave: 300, build: 420, upgrade: 560, arc: 680, rail: 180, pulse: 250, hit: 760, clear: 520, leak: 110, fail: 72 };
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    oscillator.type = kind === "rail" || kind === "fail" ? "sawtooth" : "sine";
    oscillator.frequency.value = frequencies[kind] || 300;
    gain.gain.setValueAtTime(0.0001, this.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(kind === "fail" ? 0.04 : 0.025, this.audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audio.currentTime + (kind === "fail" ? 0.24 : 0.08));
    oscillator.connect(gain).connect(this.audio.destination);
    oscillator.start();
    oscillator.stop(this.audio.currentTime + (kind === "fail" ? 0.26 : 0.1));
  }
}
