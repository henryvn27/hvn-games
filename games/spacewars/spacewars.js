import * as THREE from "three";

const WORLD = { left: -9.2, right: 9.2, front: -8, back: 7.2 };
const COLORS = { sky: 0x071124, cyan: 0x72f6e3, amber: 0xffc857, red: 0xff5d68, white: 0xf4f7ff };

const randomBetween = (min, max) => min + Math.random() * (max - min);

function makePlayer() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 1.65, 3),
    new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 0.25, roughness: 0.45 })
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 8),
    new THREE.MeshBasicMaterial({ color: COLORS.white })
  );
  cockpit.position.z = -0.25;
  group.add(cockpit);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.025, 8, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.5 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.1;
  group.add(ring);
  group.position.set(0, 0.35, 5.4);
  return group;
}

function makeEnemy() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.58, 1),
    new THREE.MeshStandardMaterial({ color: COLORS.red, emissive: COLORS.red, emissiveIntensity: 0.18, roughness: 0.6 })
  );
  group.add(body);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.045, 8, 20),
    new THREE.MeshBasicMaterial({ color: COLORS.amber, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

function makeStars() {
  const positions = new Float32Array(260 * 3);
  for (let index = 0; index < 260; index += 1) {
    positions[index * 3] = randomBetween(-25, 25);
    positions[index * 3 + 1] = randomBetween(2, 19);
    positions[index * 3 + 2] = randomBetween(-26, 9);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0x9ab2c4, size: 0.08, transparent: true, opacity: 0.72 });
  return new THREE.Points(geometry, material);
}

export function startSpaceWars(options = {}) {
  const host = document.getElementById(options.parent);
  if (!host) throw new Error(`Space Wars parent not found: ${options.parent}`);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 18, 38);
  const camera = new THREE.PerspectiveCamera(48, 960 / 600, 0.1, 80);
  camera.position.set(0, 12.5, 15.5);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(960, 600, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-label", "Space Wars 3D playfield");
  renderer.domElement.tabIndex = 0;
  host.replaceChildren(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xa8d9e8, 0x06101d, 1.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(-4, 11, 8);
  scene.add(keyLight);
  scene.add(makeStars());

  const grid = new THREE.GridHelper(26, 26, 0x23444d, 0x102630);
  grid.position.y = -0.08;
  grid.position.z = -1.2;
  scene.add(grid);
  const horizon = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 1.4),
    new THREE.MeshBasicMaterial({ color: 0x15333d, transparent: true, opacity: 0.25 })
  );
  horizon.rotation.x = -Math.PI / 2;
  horizon.position.set(0, 0.02, -9.2);
  scene.add(horizon);

  const player = makePlayer();
  scene.add(player);
  const state = {
    mode: "menu",
    score: 0,
    wave: 1,
    shields: 3,
    elapsed: 0,
    spawnTimer: 0,
    fireCooldown: 0,
    waveBanner: 0,
    keys: new Set(),
    touch: { left: false, right: false, up: false, down: false },
    enemies: [],
    shots: [],
    effects: [],
  };

  const publish = () => options.onState?.({ mode: state.mode, score: state.score, wave: state.wave, shields: state.shields, elapsed: state.elapsed });

  const clearObjectList = (list) => {
    for (const item of list) scene.remove(item.object || item);
    list.length = 0;
  };

  const burst = (position, color) => {
    const group = new THREE.Group();
    for (let index = 0; index < 7; index += 1) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color, transparent: true }));
      spark.position.copy(position);
      group.add(spark);
    }
    group.position.copy(position);
    scene.add(group);
    state.effects.push({ object: group, life: 0.35, velocity: Array.from({ length: group.children.length }, () => new THREE.Vector3(randomBetween(-2, 2), randomBetween(0.2, 2), randomBetween(-2, 2))) });
  };

  const spawnEnemy = () => {
    const object = makeEnemy();
    const enemy = { object, speed: 1.6 + state.wave * 0.22 + randomBetween(0, 0.7), drift: randomBetween(-0.6, 0.6), phase: Math.random() * Math.PI * 2 };
    object.position.set(randomBetween(WORLD.left + 0.8, WORLD.right - 0.8), 0.4, -11.5);
    scene.add(object);
    state.enemies.push(enemy);
  };

  const fire = () => {
    if (state.mode !== "active" || state.fireCooldown > 0) return;
    const shot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: COLORS.white }));
    shot.position.set(player.position.x, 0.38, player.position.z - 0.85);
    scene.add(shot);
    state.shots.push({ object: shot, speed: 20 });
    state.fireCooldown = 0.18;
  };

  const endRun = () => {
    if (state.mode !== "active") return;
    state.mode = "result";
    publish();
  };

  const start = () => {
    clearObjectList(state.enemies);
    clearObjectList(state.shots);
    clearObjectList(state.effects);
    state.mode = "active";
    state.score = 0;
    state.wave = 1;
    state.shields = 3;
    state.elapsed = 0;
    state.spawnTimer = 0.15;
    state.fireCooldown = 0;
    state.waveBanner = 1.2;
    state.keys.clear();
    Object.keys(state.touch).forEach((key) => { state.touch[key] = false; });
    player.position.set(0, 0.35, 5.4);
    player.rotation.set(0, 0, 0);
    spawnEnemy();
    publish();
  };

  const togglePause = () => {
    if (state.mode === "active") state.mode = "pause";
    else if (state.mode === "pause") state.mode = "active";
    publish();
  };

  const setMove = (direction, pressed) => {
    if (direction in state.touch) state.touch[direction] = pressed;
  };

  const onKeyDown = (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "Space") fire();
    if (event.code === "KeyP" || event.code === "Escape") togglePause();
    state.keys.add(event.code);
  };
  const onKeyUp = (event) => state.keys.delete(event.code);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  renderer.domElement.addEventListener("pointerdown", fire);

  const resize = () => {
    const width = Math.max(320, host.clientWidth || 960);
    const height = Math.max(260, host.clientHeight || 600);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const clock = new THREE.Clock();
  let frameId = 0;
  const update = (dt) => {
    if (state.mode !== "active") return;
    state.elapsed += dt;
    state.spawnTimer -= dt;
    state.fireCooldown = Math.max(0, state.fireCooldown - dt);
    state.waveBanner = Math.max(0, state.waveBanner - dt);
    const nextWave = 1 + Math.floor(state.score / 12);
    if (nextWave > state.wave) {
      state.wave = nextWave;
      state.waveBanner = 1.2;
      publish();
    }
    const horizontal = (state.keys.has("ArrowRight") || state.keys.has("KeyD") || state.touch.right ? 1 : 0) - (state.keys.has("ArrowLeft") || state.keys.has("KeyA") || state.touch.left ? 1 : 0);
    const vertical = (state.keys.has("ArrowDown") || state.keys.has("KeyS") || state.touch.down ? 1 : 0) - (state.keys.has("ArrowUp") || state.keys.has("KeyW") || state.touch.up ? 1 : 0);
    const speed = 8.2;
    player.position.x = THREE.MathUtils.clamp(player.position.x + horizontal * speed * dt, WORLD.left, WORLD.right);
    player.position.z = THREE.MathUtils.clamp(player.position.z + vertical * speed * dt, WORLD.front, WORLD.back);
    player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -horizontal * 0.32, 0.16);
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, horizontal * 0.14, 0.16);

    const interval = Math.max(0.34, 1.05 - state.wave * 0.045);
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      if (state.wave > 3 && Math.random() < Math.min(0.38, state.wave * 0.025)) spawnEnemy();
      state.spawnTimer = interval;
    }
    for (let index = state.shots.length - 1; index >= 0; index -= 1) {
      const shot = state.shots[index];
      shot.object.position.z -= shot.speed * dt;
      if (shot.object.position.z < -15) {
        scene.remove(shot.object);
        state.shots.splice(index, 1);
      }
    }
    for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = state.enemies[index];
      enemy.object.position.z += enemy.speed * dt;
      enemy.object.position.x += Math.sin(state.elapsed * 1.6 + enemy.phase) * enemy.drift * dt;
      enemy.object.rotation.x += dt * 1.5;
      enemy.object.rotation.y += dt * 1.9;
      if (enemy.object.position.z > 7.1) {
        burst(enemy.object.position, COLORS.red);
        scene.remove(enemy.object);
        state.enemies.splice(index, 1);
        state.shields -= 1;
        publish();
        if (state.shields <= 0) endRun();
      }
    }
    for (let shotIndex = state.shots.length - 1; shotIndex >= 0; shotIndex -= 1) {
      const shot = state.shots[shotIndex];
      let hit = false;
      for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = state.enemies[enemyIndex];
        if (shot.object.position.distanceTo(enemy.object.position) > 0.85) continue;
        burst(enemy.object.position, COLORS.amber);
        scene.remove(shot.object);
        scene.remove(enemy.object);
        state.shots.splice(shotIndex, 1);
        state.enemies.splice(enemyIndex, 1);
        state.score += 1;
        publish();
        hit = true;
        break;
      }
      if (hit) continue;
    }
    for (let index = state.effects.length - 1; index >= 0; index -= 1) {
      const effect = state.effects[index];
      effect.life -= dt;
      effect.object.children.forEach((spark, sparkIndex) => spark.position.addScaledVector(effect.velocity[sparkIndex], dt));
      effect.object.children.forEach((spark) => { spark.material.opacity = Math.max(0, effect.life / 0.35); });
      if (effect.life <= 0) {
        scene.remove(effect.object);
        state.effects.splice(index, 1);
      }
    }
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x * 0.12, 0.04);
    camera.lookAt(player.position.x * 0.08, 0, -0.8);
  };
  const render = () => {
    frameId = window.requestAnimationFrame(render);
    update(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
  };
  render();
  publish();

  return { start, fire, togglePause, setMove, getState: () => ({ ...state, enemies: state.enemies.length }), destroy: () => { window.cancelAnimationFrame(frameId); observer.disconnect(); window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); renderer.dispose(); host.replaceChildren(); } };
}
