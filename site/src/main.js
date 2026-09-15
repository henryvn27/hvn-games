import "./styles.css";

const app = document.querySelector("#app");
const base = import.meta.env.BASE_URL;
const params = new URLSearchParams(window.location.search);

if (params.get("game") === "phasebound") {
  renderGame();
} else {
  renderGallery();
}

function renderGallery() {
  document.body.className = "gallery-page";
  app.innerHTML = `
    <header class="site-header page-width">
      <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="#shelf">The shelf</a>
        <a href="#run-local">Run local</a>
      </nav>
    </header>
    <main>
      <section class="hero page-width" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">A SMALL ARCADE SHELF</p>
          <h1 id="hero-title">Built for a quick<br /><em>second run.</em></h1>
          <p class="hero-lede">Focused browser games with a real loop, a little tension, and a reason to press play again.</p>
          <a class="button button-primary" href="#shelf">Open the shelf <span aria-hidden="true">↘</span></a>
        </div>
        <div class="hero-art" aria-label="Animated Phasebound signal preview">
          <canvas id="shelf-canvas" width="760" height="560"></canvas>
          <div class="art-caption"><span class="signal-mark" aria-hidden="true"></span> LIVE PREVIEW / PHASEBOUND</div>
        </div>
      </section>

      <section class="shelf page-width" id="shelf" aria-labelledby="shelf-title">
        <div class="section-intro">
          <div>
            <h2 id="shelf-title">One game. One clean loop.</h2>
          </div>
          <p class="section-note">No accounts. No clutter. Choose a game and get to the interesting part.</p>
        </div>
        <article class="game-card">
          <div class="game-card-art">
            <div class="orbit orbit-one"></div>
            <div class="orbit orbit-two"></div>
            <div class="packet packet-cyan"></div>
            <div class="packet packet-amber"></div>
            <div class="card-label">01 / PHASEBOUND</div>
          </div>
          <div class="game-card-copy">
            <div class="card-kicker"><span>60 SEC RUN</span><span>KEYBOARD + TOUCH</span></div>
            <h3>Phasebound</h3>
            <p>Switch your phase, catch the right signal, and dash through a relay that is getting less stable by the second.</p>
            <div class="game-card-actions">
              <a class="button button-primary" href="${base}?game=phasebound">Play Phasebound <span aria-hidden="true">→</span></a>
              <span class="card-controls">WASD / SPACE / SHIFT</span>
            </div>
          </div>
        </article>
      </section>

      <section class="loop-section page-width" aria-labelledby="loop-title">
        <div class="loop-heading">
          <h2 id="loop-title">Learn it in a breath.<br />Master it by accident.</h2>
        </div>
        <ol class="loop-steps">
          <li><span>01</span><strong>Read the relay</strong><p>Packets arrive in two phases. Your color decides what is safe.</p></li>
          <li><span>02</span><strong>Make the switch</strong><p>Change phase before the signal reaches you. Keep the streak alive.</p></li>
          <li><span>03</span><strong>Spend the dash</strong><p>Burn a charge to cut through static, or save it for the last scramble.</p></li>
        </ol>
      </section>

      <section class="run-local page-width" id="run-local" aria-labelledby="run-title">
        <div class="run-copy">
          <p class="eyebrow">OPEN SOURCE, LOCAL FIRST</p>
          <h2 id="run-title">Run the shelf on your machine.</h2>
          <p>Clone the one shared repo, install its single dependency set, and play the same build locally.</p>
        </div>
        <div class="command-stack">
          ${commandBlock("1 / INSTALL", "git clone https://github.com/henryvn27/hvn-games.git\ncd hvn-games", "install")}
          ${commandBlock("2 / SET UP", "npm install\nnpm test", "setup")}
          ${commandBlock("3 / RUN", "npm run dev", "run")}
          <p class="command-next"><span>Next</span> Open the local URL Vite prints, then choose a game from the shelf.</p>
        </div>
      </section>
    </main>
    <footer class="site-footer page-width"><span>HVN games</span><span>Made to be played.</span></footer>
  `;
  setupCopyButtons();
  startShelfPreview();
}

function commandBlock(label, command, id) {
  return `<div class="command-block"><div class="command-label">${label}</div><div class="command-row"><code id="command-${id}">${command}</code><button class="copy-button" type="button" data-copy="command-${id}">Copy</button></div></div>`;
}

function setupCopyButtons() {
  for (const button of document.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      const code = document.getElementById(button.dataset.copy);
      await navigator.clipboard.writeText(code.textContent);
      const original = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = original; }, 1200);
    });
  }
}

function startShelfPreview() {
  const canvas = document.querySelector("#shelf-canvas");
  const context = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;

  function draw(time) {
    const t = reduced.matches ? 0.45 : time * 0.001;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#141b20";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(150, 183, 186, 0.12)";
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 48) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
    }
    for (let y = 0; y < height; y += 48) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
    }
    const centerX = width * 0.52;
    const centerY = height * 0.5;
    for (let ring = 0; ring < 3; ring += 1) {
      context.beginPath();
      context.arc(centerX, centerY, 82 + ring * 66 + Math.sin(t * 1.3 + ring) * 7, 0, Math.PI * 2);
      context.strokeStyle = ring === 1 ? "rgba(255, 200, 87, 0.45)" : "rgba(114, 246, 227, 0.22)";
      context.stroke();
    }
    const nodes = [
      { phase: "#72f6e3", angle: t * 0.8, radius: 150 },
      { phase: "#ffc857", angle: -t * 0.62 + 2.2, radius: 218 },
      { phase: "#72f6e3", angle: t * 0.44 + 4.1, radius: 106 },
    ];
    for (const node of nodes) {
      const x = centerX + Math.cos(node.angle) * node.radius;
      const y = centerY + Math.sin(node.angle) * node.radius;
      context.beginPath(); context.arc(x, y, 15, 0, Math.PI * 2); context.fillStyle = node.phase; context.globalAlpha = 0.16; context.fill();
      context.beginPath(); context.arc(x, y, 6, 0, Math.PI * 2); context.globalAlpha = 1; context.fill();
    }
    context.globalAlpha = 1;
    context.save();
    context.translate(centerX + Math.cos(t * 1.1) * 50, centerY + Math.sin(t * 1.1) * 50);
    context.rotate(t * 1.1);
    context.fillStyle = "#f4f1e9";
    context.beginPath(); context.moveTo(18, 0); context.lineTo(-10, -11); context.lineTo(-5, 0); context.lineTo(-10, 11); context.closePath(); context.fill();
    context.restore();
    if (!reduced.matches) frame = requestAnimationFrame(draw);
  }
  draw(0);
  return () => cancelAnimationFrame(frame);
}

async function renderGame() {
  document.body.className = "game-page";
  app.innerHTML = `
    <header class="game-header page-width">
      <a class="wordmark" href="${base}">HVN games</a>
      <a class="back-link" href="${base}">Back to shelf <span aria-hidden="true">↖</span></a>
    </header>
    <main class="game-main page-width">
      <div class="game-heading">
        <div><p class="eyebrow">01 / PHASEBOUND</p><h1>Catch the right signal.</h1></div>
        <p class="game-blurb">Switch phase, hold your streak, and leave the relay before it collapses.</p>
      </div>
      <section class="game-frame" aria-label="Phasebound game">
        <div class="hud" aria-live="polite">
          <div class="hud-group"><span class="hud-label">PHASE</span><strong id="hud-phase">CYAN</strong></div>
          <div class="hud-group"><span class="hud-label">SCORE</span><strong id="hud-score">0000</strong></div>
          <div class="hud-group"><span class="hud-label">STREAK</span><strong id="hud-streak">0</strong></div>
          <div class="hud-group hud-time"><span class="hud-label">TIME</span><strong id="hud-time">60</strong></div>
        </div>
        <div id="game-root"></div>
        <div class="energy-wrap"><span class="hud-label">SIGNAL</span><div class="energy-track"><span id="hud-energy"></span></div></div>
        <div id="game-overlay" class="game-overlay">
          <p class="eyebrow">PHASEBOUND / 01</p>
          <h2 id="overlay-title">The relay is live.</h2>
          <p id="overlay-copy">Match your phase to incoming packets. Switch with Space, dash with Shift, and keep moving.</p>
          <button id="overlay-action" class="button button-primary" type="button">Start run <span aria-hidden="true">→</span></button>
          <p id="overlay-detail" class="overlay-detail">WASD or arrows to move · P to pause · R to restart</p>
        </div>
        <div class="touch-controls" aria-label="Touch controls">
          <div class="touch-pad"><button type="button" data-input="up" aria-label="Move up">↑</button><button type="button" data-input="left" aria-label="Move left">←</button><button type="button" data-input="down" aria-label="Move down">↓</button><button type="button" data-input="right" aria-label="Move right">→</button></div>
          <div class="touch-actions"><button type="button" data-input="phase" aria-label="Switch phase">Phase</button><button type="button" data-input="dash" aria-label="Dash">Dash</button></div>
        </div>
      </section>
      <div class="game-notes"><span><b>Move</b> WASD / arrows</span><span><b>Switch</b> Space</span><span><b>Dash</b> Shift</span><span><b>Pause</b> P</span></div>
    </main>
  `;

  const { startPhasebound } = await import("../../games/phasebound/phasebound.js");

  const overlay = document.querySelector("#game-overlay");
  const frame = document.querySelector(".game-frame");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");
  const overlayDetail = document.querySelector("#overlay-detail");
  const overlayAction = document.querySelector("#overlay-action");
  let action = () => api.start();
  let api;

  function showOverlay({ title, copy, detail, label, next }) {
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    overlayDetail.textContent = detail;
    overlayAction.innerHTML = `${label} <span aria-hidden="true">→</span>`;
    action = next;
    overlay.classList.remove("is-hidden");
  }

  function updateHud(state) {
    document.querySelector("#hud-phase").textContent = state.phase.toUpperCase();
    document.querySelector("#hud-phase").className = `phase-${state.phase}`;
    document.querySelector("#hud-score").textContent = String(state.score).padStart(4, "0");
    document.querySelector("#hud-streak").textContent = String(state.streak);
    document.querySelector("#hud-time").textContent = String(Math.max(0, Math.ceil(state.timeLeft))).padStart(2, "0");
    document.querySelector("#hud-energy").style.width = `${Math.max(0, state.energy)}%`;
  }

  api = startPhasebound({
    parent: "game-root",
    onState: (state) => {
      updateHud(state);
      frame.classList.toggle("is-active", state.mode === "active");
      if (state.mode === "active") overlay.classList.add("is-hidden");
      if (state.mode === "pause") {
        showOverlay({ title: "Hold the line.", copy: "The relay is paused. Your current run is safe.", detail: "Press P or choose resume to return to the field.", label: "Resume run", next: () => api.resume() });
      }
      if (state.mode === "result") {
        const won = state.result === "won";
        showOverlay({ title: won ? "You made the handoff." : "The relay went quiet.", copy: won ? `${state.packets} packets delivered with a score of ${state.score}.` : `${state.packets} packets delivered. The next run starts clean.`, detail: won ? "Try to beat your streak, then take the long route." : "The field gets readable once you stop chasing every packet.", label: "Run it again", next: () => api.start() });
      }
    },
  });

  overlayAction.addEventListener("click", () => { action(); });
  for (const button of document.querySelectorAll("[data-input]")) {
    const input = button.dataset.input;
    const press = (event) => { event.preventDefault(); if (input === "phase") api.togglePhase(); else if (input === "dash") api.dash(); else api.setTouchDirection(input, true); };
    const release = (event) => { event.preventDefault(); if (!["phase", "dash"].includes(input)) api.setTouchDirection(input, false); };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }
}
