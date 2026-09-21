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
    document.body.className = "shelf-page shelf-native-mode";
    app.id = "hvn-shell-app";
    app.innerHTML = `
      <header class="site-header page-width shelf-header">
        <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
        <nav class="site-nav" aria-label="Shelf navigation"><a href="${base}?game=shelf">all games</a><a href="${base}?game=${params.get("from") || "orbit"}">back to Orbit</a></nav>
      </header>
      <main class="page-width shelf-play-main shelf-native-main">
        <div class="shelf-play-heading"><div><p class="shelf-kicker">game ${selected.number}</p><h1>${selected.name}</h1></div><a class="text-link" href="${base}?game=shelf">← choose another</a></div>
        <div id="shelf-native-host" aria-label="${selected.name} game"><div id="app"></div></div>
        <p class="shelf-credit">Game engine from Game Shelf, adapted into HVN games under its MIT license.</p>
      </main>
    `;
    await mountNativeShelfGame({ base, gameId: selected.id });
    return;
  }

  renderShelfHome({ app, base, params });
}

const SHELF_STYLES = ["style.css", "rewards.css", "golf.css", "competitions.css", "adventures.css", "embed.css"];
const SHELF_SCRIPTS = ["word-list.js", "rewards.js", "leaderboards.js", "competitions.js", "golf.js", "adventures.js", "app.js"];
const NATIVE_SHELF_OVERRIDES = `
  body.shelf-native-mode { background: #111211; color: #f3f5eb; }
  body.shelf-native-mode > #hvn-shell-app { width: 100%; }
  body.shelf-native-mode .site-header { position: relative; height: auto; min-height: 72px; padding-block: 18px; background: #111211; }
  body.shelf-native-mode .shelf-play-heading h1 { color: #f3f5eb; }
  body.shelf-native-mode .site-header .site-nav { display: flex; }
  body.shelf-native-mode .shelf-play-main { max-width: 1180px; padding-block: 54px 80px; }
  body.shelf-native-mode #shelf-native-host { min-height: 720px; overflow: hidden; border: 1px solid var(--line); background: var(--surface); box-shadow: var(--shadow); }
  body.shelf-native-mode #shelf-native-host > #app { width: 100%; max-width: none; margin: 0; padding: 20px clamp(16px, 4vw, 42px) 34px; color: #12151f; }
  body.shelf-native-mode #shelf-native-host .game-head { display: none; }
  body.shelf-native-mode #shelf-native-host .game-wrap { max-width: 900px; }
  body.shelf-native-mode #shelf-native-host .panel { box-shadow: 5px 5px 0 rgba(18, 21, 31, .18); }
  body.shelf-native-mode #shelf-native-host footer,
  body.shelf-native-mode #shelf-native-host header,
  body.shelf-native-mode #shelf-native-host nav { display: none; }
  body.shelf-native-mode #shelf-native-host main { min-height: 0; padding: 0; }
  @media (max-width: 520px) {
    body.shelf-native-mode .shelf-play-main { padding-block: 42px 58px; }
    body.shelf-native-mode #shelf-native-host { min-height: 620px; }
    body.shelf-native-mode #shelf-native-host > #app { padding-inline: 12px; }
  }
  @media (prefers-color-scheme: light) {
    body.shelf-native-mode { background: #f7f7f2; color: #171817; }
    body.shelf-native-mode .site-header { background: #f7f7f2; }
    body.shelf-native-mode .shelf-play-heading h1 { color: #171817; }
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

function renderShelfHome({ app, base, params }) {
  app.innerHTML = `<header class="site-header page-width shelf-header">
    <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
    <nav class="site-nav" aria-label="Primary navigation"><a href="${base}?game=${params.get("from") || "orbit"}">back to Orbit</a></nav>
  </header><main class="page-width shelf-main">
    <section class="shelf-intro" aria-labelledby="shelf-title">
      <div><p class="shelf-kicker">more HVN games</p><h1 id="shelf-title">More things<br><em>to play.</em></h1></div>
      <div class="shelf-intro-note"><p>Orbit is still the main thing here. This is a dozen extra games from Game Shelf, brought into the same little corner so you do not have to leave.</p><span>12 games · no install</span></div>
    </section>
    <section class="shelf-grid" aria-label="Game Shelf games">${SHELF_GAMES.map((game) => shelfCard(game, base)).join("")}</section>
    <footer class="shelf-footer"><span>HVN games / game shelf</span><a href="https://github.com/ignition27/game-shelf" target="_blank" rel="noreferrer">Game Shelf source + license</a></footer>
  </main>`;
}
