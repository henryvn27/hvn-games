import "./style.css";
import { createAsteroidsRun, startAsteroidsRun, stepAsteroidsRun } from "./simulation.mjs";

const WIDTH = 760;
const HEIGHT = 520;
const KEY_MAP = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "thrust", w: "thrust", " ": "fire" };

export function mountAsteroids(host, scores = {}) {
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const section = document.createElement("section");
  section.className = "asteroids-game";
  section.setAttribute("aria-label", "Asteroids game");
  const hud = make("header", "asteroids-hud");
  const values = {};
  for (const [label, key, initial] of [["score", "score", "0"], ["wave", "wave", "0 / 3"], ["ships", "lives", "3"], ["time", "time", "00:00"]]) {
    const item = make("div");
    item.append(make("span", "", label));
    values[key] = make("strong", "", initial);
    item.append(values[key]);
    hud.append(item);
  }
  const pauseButton = make("button", "", "Pause");
  pauseButton.type = "button";
  pauseButton.disabled = true;
  hud.append(pauseButton);
  section.append(hud);

  const stage = make("div", "asteroids-stage");
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.setAttribute("aria-label", "Asteroid field. Turn with left and right arrows, thrust with up, and fire with Space.");
  const overlay = make("div", "asteroids-overlay");
  const title = make("h2", "", "Clear the field.");
  const copy = make("p", "", "Turn, thrust, and break up three waves of rocks. Your ship wraps around the edges.");
  const action = make("button", "", "Launch");
  action.type = "button";
  overlay.append(title, copy, action);
  stage.append(canvas, overlay);
  section.append(stage);
  const controls = make("div", "asteroids-controls");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Touch controls");
  const heldButtons = {};
  for (const [key, label, description] of [["left", "↶", "Turn left"], ["thrust", "Thrust", "Thrust"], ["fire", "Fire", "Fire"], ["right", "↷", "Turn right"]]) {
    const button = make("button", "", label);
    button.type = "button";
    button.dataset.control = key;
    button.setAttribute("aria-label", description);
    heldButtons[key] = button;
    controls.append(button);
  }
  const restartButton = make("button", "", "Restart");
  restartButton.type = "button";
  controls.append(restartButton);
  section.append(controls);
  const help = make("p", "asteroids-help", "← → turn · ↑ thrust · Space fire · P pause · R restart");
  help.setAttribute("role", "status");
  help.setAttribute("aria-live", "polite");
  section.append(help);

  const form = make("form", "asteroids-score-form");
  form.hidden = true;
  const label = make("label", "", "Name or initials");
  const nameInput = make("input");
  nameInput.id = "asteroids-player-name";
  nameInput.maxLength = 16;
  nameInput.autocomplete = "nickname";
  label.htmlFor = nameInput.id;
  label.append(nameInput);
  const saveButton = make("button", "", "Save score");
  saveButton.type = "submit";
  const saveStatus = make("span");
  saveStatus.setAttribute("role", "status");
  saveStatus.setAttribute("aria-live", "polite");
  form.append(label, saveButton, saveStatus);
  section.append(form);
  const ctx = canvas.getContext("2d");
  const keys = new Set();
  const stars = Array.from({ length: 92 }, (_, i) => ({ x: (i * 193 + 47) % WIDTH, y: (i * 317 + 83) % HEIGHT, r: i % 9 === 0 ? 1.5 : 0.8, a: 0.24 + (i % 6) * 0.1 }));
  let run = createAsteroidsRun();
  let frame = 0;
  let lastFrame = 0;
  let disposed = false;
  let saved = false;
  host.replaceChildren(section);

  const timeLabel = () => {
    const whole = Math.floor(run.elapsed);
    return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
  };
  const drawRock = (rock) => {
    let seed = rock.shape || 1;
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };
    const radius = rock.size === 3 ? 39 : rock.size === 2 ? 25 : 13;
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle);
    ctx.beginPath();
    for (let i = 0; i < 11; i += 1) {
      const angle = i * Math.PI * 2 / 11;
      const extent = radius * (0.72 + random() * 0.28);
      const x = Math.cos(angle) * extent;
      const y = Math.sin(angle) * extent;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = rock.size === 3 ? "#344552" : rock.size === 2 ? "#3b4d59" : "#465761";
    ctx.strokeStyle = rock.size === 3 ? "#a2b4ba" : "#c0ced0";
    ctx.lineWidth = 1.8;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  const drawShip = () => {
    if (run.ship.invulnerable > 0 && Math.floor(run.elapsed * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(run.ship.x, run.ship.y);
    ctx.rotate(run.ship.angle);
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fillStyle = "#dff5e9";
    ctx.strokeStyle = "#70d9bc";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    if (keys.has("thrust")) {
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.lineTo(-20, 0);
      ctx.lineTo(-8, 5);
      ctx.strokeStyle = "#ffb35c";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  };
  const draw = () => {
    ctx.fillStyle = "#111b23";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const star of stars) {
      ctx.globalAlpha = star.a;
      ctx.fillStyle = "#f0f5e9";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    run.asteroids.forEach(drawRock);
    if (run.mode === "playing" || run.mode === "paused") drawShip();
    ctx.fillStyle = "#ffd675";
    run.bullets.forEach((bullet) => {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    values.score.textContent = String(run.score);
    values.wave.textContent = Math.min(run.wave, 3) + " / 3";
    values.lives.textContent = String(run.lives);
    values.time.textContent = timeLabel();
  };
  const show = (heading, description, label, callback) => {
    title.textContent = heading;
    copy.textContent = description;
    action.textContent = label;
    action.onclick = callback;
    overlay.hidden = false;
  };
  const save = async (name = scores.getPlayerName?.()) => {
    const clean = scores.setPlayerName?.(name);
    if (!clean) {
      saveStatus.textContent = "Enter a name or initials to save.";
      nameInput.focus();
      return;
    }
    if (saved) return;
    const seconds = Math.floor(run.elapsed);
    const entry = scores.recordLeaderboardScore?.("asteroids", run.score, run.wave, seconds);
    if (!entry) return;
    saved = true;
    const online = scores.online?.();
    if (online?.configured) {
      const result = await online.submit("asteroids", {
        name: clean,
        score: run.score,
        packets: run.wave,
        seconds,
        submissionId: online.submissionId("asteroids", entry),
      });
      saveStatus.textContent = result.status === "online"
        ? "Saved on the shared board as " + clean + "."
        : "Saved in this browser as " + clean + ".";
    } else saveStatus.textContent = "Saved in this browser as " + clean + ".";
  };
  function restart() {
    cancelAnimationFrame(frame);
    keys.clear();
    run = createAsteroidsRun((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    saved = false;
    form.hidden = true;
    saveStatus.textContent = "";
    pauseButton.disabled = true;
    pauseButton.textContent = "Pause";
    draw();
    show("Clear the field.", "Break up three waves of rocks. Your ship wraps around the edges.", "Launch", start);
  }
  function start() {
    if (run.mode === "won" || run.mode === "over") restart();
    if (run.mode === "paused") run.mode = "playing";
    else startAsteroidsRun(run);
    form.hidden = true;
    overlay.hidden = true;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pause";
    lastFrame = 0;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  }
  function replay() {
    restart();
    start();
  }
  const pause = () => {
    if (run.mode === "playing") {
      run.mode = "paused";
      cancelAnimationFrame(frame);
      keys.clear();
      pauseButton.textContent = "Resume";
      show("Paused.", "The field is holding still.", "Resume", start);
      draw();
    } else if (run.mode === "paused") start();
  };
  const tick = (now) => {
    if (disposed || run.mode !== "playing") return;
    const seconds = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
    lastFrame = now;
    run = stepAsteroidsRun(run, {
      left: keys.has("left"),
      right: keys.has("right"),
      thrust: keys.has("thrust"),
      fire: keys.has("fire"),
    }, seconds);
    draw();
    if (run.mode === "won" || run.mode === "over") finish();
    else frame = requestAnimationFrame(tick);
  };
  const finish = () => {
    cancelAnimationFrame(frame);
    pauseButton.disabled = true;
    draw();
    if (run.mode === "won") show("Field clear.", run.score + " points · all three waves · " + timeLabel(), "Play again", replay);
    else show("Last ship lost.", run.score + " points · wave " + run.wave + " · " + timeLabel(), "Try again", replay);
    if (run.score > 0 && scores.getPlayerName?.()) void save();
    else if (run.score > 0) form.hidden = false;
  };
  const isEditable = (target) => target instanceof Element && target.closest("input, textarea, select");
  const keydown = (event) => {
    if (isEditable(event.target)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const control = KEY_MAP[key] || KEY_MAP[event.key];
    if (control) {
      event.preventDefault();
      keys.add(control);
      if (run.mode === "ready") start();
    } else if (!event.repeat && (key === "p" || key === "Escape")) pause();
    else if (!event.repeat && key === "r") restart();
  };
  const keyup = (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(KEY_MAP[key] || KEY_MAP[event.key]);
  };
  const clearKeys = () => keys.clear();
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", clearKeys);
  form.addEventListener("submit", (event) => { event.preventDefault(); void save(nameInput.value); });
  pauseButton.addEventListener("click", pause);
  restartButton.addEventListener("click", restart);
  Object.entries(heldButtons).forEach(([control, button]) => {
    const press = (event) => {
      event.preventDefault();
      keys.add(control);
      if (run.mode === "ready") start();
    };
    const release = () => keys.delete(control);
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("pointerleave", release);
  });
  show("Clear the field.", "Turn, thrust, and break up three waves of rocks. Your ship wraps around the edges.", "Launch", start);
  draw();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("blur", clearKeys);
    host.replaceChildren();
  };
}
