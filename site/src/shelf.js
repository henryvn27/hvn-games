export const SHELF_GAMES = [
  { id: "golf", number: "01", name: "Mini Golf", kind: "arcade", description: "Six small greens. Banks, bunkers, and a clean line to the cup." },
  { id: "snake", number: "02", name: "Garden Snake", kind: "arcade", description: "Eat apples, pick a rule set, and try not to box yourself in." },
  { id: "dodger", number: "03", name: "Space Dodger", kind: "arcade", description: "Keep the fighter moving while Mars gets busier around you." },
  { id: "memory", number: "04", name: "Memory Match", kind: "arcade", description: "Turn over pairs. Fewer moves is the whole trick." },
  { id: "reaction", number: "05", name: "Reaction Test", kind: "arcade", description: "Wait for the signal, then hit it before your brain catches up." },
  { id: "word", number: "06", name: "Word Vault", kind: "puzzle", description: "Six tries to find the hidden word, with clues for every letter." },
  { id: "clicker", number: "07", name: "Clicker Adventure", kind: "adventure", description: "Build a camp, send out expeditions, and see what comes back." },
  { id: "flappy", number: "08", name: "Sky Flyer", kind: "arcade", description: "Tap up through a changing sky without clipping the next gate." },
  { id: "platform", number: "09", name: "Mini Platformer", kind: "arcade", description: "Twelve short courses, stars to grab, and a flag at the end." },
  { id: "tic", number: "10", name: "Tic-Tac-Toe", kind: "board", description: "You are X. The computer is paying attention." },
  { id: "checkers", number: "11", name: "Checkers", kind: "board", description: "Choose a bot, make a jump, and see if you can take the board." },
  { id: "trade", number: "12", name: "City Trader", kind: "board", description: "Buy streets, build them up, and outlast the other players." },
];

export function shelfCard(game, base) {
  return `<article class="shelf-card shelf-card-${game.kind}">
    <div class="shelf-card-top"><span>${game.number}</span><span>${game.kind}</span></div>
    <div><h2>${game.name}</h2><p>${game.description}</p></div>
    <a class="button button-secondary" href="${base}?game=shelf&amp;play=${game.id}">play ${game.name}</a>
  </article>`;
}

export async function renderGameShelf({ app, base }) {
  const params = new URLSearchParams(window.location.search);
  const selected = SHELF_GAMES.find((game) => game.id === params.get("play"));
  document.body.className = "shelf-page";

  if (selected) {
    document.body.className = "game-page shelf-page shelf-native-mode";
    app.id = "hvn-shell-app";
    app.innerHTML = `
      <header class="game-header page-width shelf-header">
        <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
        <nav class="site-nav" aria-label="Game navigation"><span class="shelf-game-label">${selected.name}</span><a href="${base}?game=shelf">all games</a><a href="${base}">home</a></nav>
      </header>
      <main class="game-main page-width shelf-native-main">
        <div class="game-heading shelf-game-heading">
          <div><p class="game-index">${selected.number} / ${selected.kind}</p><h1>${selected.name}</h1></div>
          <p class="game-blurb">${selected.description}</p>
        </div>
        <div id="shelf-native-host" aria-label="${selected.name} game"><div id="app"></div></div>
      </main>
    `;
    await mountNativeShelfGame({ base, gameId: selected.id });
    return;
  }

  renderShelfHome({ app, base });
}

const SHELF_STYLES = ["style.css", "rewards.css", "golf.css", "competitions.css", "adventures.css", "embed.css"];
const SHELF_SCRIPTS = ["word-list.js", "rewards.js", "leaderboards.js", "competitions.js", "golf.js", "adventures.js", "app.js"];
const NATIVE_SHELF_OVERRIDES = `
  body.shelf-native-mode { --native-bg: #111211; --native-ink: #f3f5eb; --native-muted: #a5aa9c; --native-line: rgba(243, 245, 235, .2); background: var(--native-bg); color: var(--native-ink); font-family: "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif; }
  body.shelf-native-mode > #hvn-shell-app { width: 100%; }
  body.shelf-native-mode .game-header { position: relative; min-height: 78px; background: var(--native-bg); border-bottom: 1px solid var(--native-line); }
  body.shelf-native-mode .game-header .wordmark,
  body.shelf-native-mode .game-header .site-nav a { color: var(--native-ink); }
  body.shelf-native-mode .shelf-game-label { color: var(--native-muted); font-size: .78rem; }
  body.shelf-native-mode .game-header .site-nav { display: flex; }
  body.shelf-native-mode .shelf-native-main { max-width: 1180px; padding-block: 44px 78px; }
  body.shelf-native-mode .shelf-game-heading { align-items: end; margin-bottom: 26px; }
  body.shelf-native-mode .shelf-game-heading .game-index { color: #dfff73; }
  body.shelf-native-mode .shelf-game-heading h1 { color: var(--native-ink); }
  body.shelf-native-mode .shelf-game-heading .game-blurb { color: var(--native-muted); }
  body.shelf-native-mode #shelf-native-host { min-height: 0; overflow: visible; border: 0; background: transparent; box-shadow: none; }
  body.shelf-native-mode #shelf-native-host > #app { width: 100%; max-width: none; margin: 0; padding: 0; color: var(--native-ink); font-family: "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif; }
  body.shelf-native-mode #shelf-native-host .game-head { display: none; }
  body.shelf-native-mode #shelf-native-host .game-wrap { max-width: 960px; text-align: initial; }
  body.shelf-native-mode #shelf-native-host .game-wrap > p { display: none; }
  body.shelf-native-mode #shelf-native-host .game-wrap > .panel { margin: 0; border-radius: 0; box-shadow: none; }
  body.shelf-native-mode #shelf-native-host footer,
  body.shelf-native-mode #shelf-native-host header,
  body.shelf-native-mode #shelf-native-host nav { display: none; }
  body.shelf-native-mode #shelf-native-host main { min-height: 0; padding: 0; }
  @media (max-width: 520px) {
    body.shelf-native-mode .shelf-native-main { padding-block: 30px 58px; }
    body.shelf-native-mode .shelf-game-heading { align-items: start; flex-direction: column; gap: 10px; }
    body.shelf-native-mode #shelf-native-host > #app { padding-inline: 0; }
  }
  @media (prefers-color-scheme: light) {
    body.shelf-native-mode { --native-bg: #f7f7f2; --native-ink: #171817; --native-muted: #666962; --native-line: rgba(23, 24, 23, .18); background: var(--native-bg); color: var(--native-ink); }
    body.shelf-native-mode .game-header { background: var(--native-bg); border-bottom-color: var(--native-line); }
    body.shelf-native-mode .game-header .wordmark,
    body.shelf-native-mode .game-header .site-nav a { color: var(--native-ink); }
    body.shelf-native-mode .shelf-game-label { color: var(--native-muted); }
  }
`;

async function mountNativeShelfGame({ base, gameId }) {
  for (const file of SHELF_STYLES) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${base}shelf/${file}`;
    link.dataset.shelfStyle = file;
    document.head.appendChild(link);
  }

  const overrides = document.createElement("style");
  overrides.dataset.shelfStyle = "native-overrides";
  overrides.textContent = NATIVE_SHELF_OVERRIDES;
  document.head.appendChild(overrides);

  for (const file of SHELF_SCRIPTS) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${base}shelf/${file}`;
      script.dataset.shelfScript = file;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load shelf game asset: ${file}`));
      document.body.appendChild(script);
    });
  }

  if (typeof window.play !== "function") throw new Error("Shelf game engine did not expose play()");
  window.play(gameId);
}

function renderShelfHome({ app, base }) {
  app.innerHTML = `<header class="site-header page-width shelf-header">
    <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
    <nav class="site-nav" aria-label="Primary navigation"><a href="${base}">home</a></nav>
  </header><main class="page-width shelf-main">
    <section class="shelf-intro" aria-labelledby="shelf-title">
      <div><p class="shelf-kicker">the other games</p><h1 id="shelf-title">Pick a game.</h1></div>
      <div class="shelf-intro-note"><p>Short games for a spare minute. Pick one and start playing.</p><span>12 games · no install</span></div>
    </section>
    <section class="shelf-grid" aria-label="Other HVN games">${SHELF_GAMES.map((game) => shelfCard(game, base)).join("")}</section>
    <footer class="site-footer shelf-footer"><span>HVN games</span><span>12 games</span></footer>
  </main>`;
}
