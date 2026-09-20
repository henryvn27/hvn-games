const SHELF_GAMES = [
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

function shelfCard(game, base) {
  return `<article class="shelf-card shelf-card-${game.kind}">
    <div class="shelf-card-top"><span>${game.number}</span><span>${game.kind}</span></div>
    <div><h2>${game.name}</h2><p>${game.description}</p></div>
    <a class="button button-secondary" href="${base}?game=shelf&amp;play=${game.id}">play ${game.name}</a>
  </article>`;
}

export function renderGameShelf({ app, base }) {
  const params = new URLSearchParams(window.location.search);
  const selected = SHELF_GAMES.find((game) => game.id === params.get("play"));
  document.body.className = "shelf-page";

  if (selected) {
    app.innerHTML = `
      <header class="site-header page-width shelf-header">
        <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
        <nav class="site-nav" aria-label="Shelf navigation"><a href="${base}?game=shelf">all games</a><a href="${base}?game=${params.get("from") || "orbit"}">back to Orbit</a></nav>
      </header>
      <main class="page-width shelf-play-main">
        <div class="shelf-play-heading"><div><p class="shelf-kicker">game ${selected.number} / side room</p><h1>${selected.name}</h1></div><a class="text-link" href="${base}?game=shelf">← choose another</a></div>
        <div class="shelf-embed-frame"><iframe title="${selected.name}" src="${base}shelf/embed.html?game=${selected.id}"></iframe></div>
        <p class="shelf-credit">Game engine from Game Shelf, adapted into HVN games under its MIT license.</p>
      </main>
    `;
    return;
  }

  renderShelfHome({ app, base, params });
}

function renderShelfHome({ app, base, params }) {
  app.innerHTML = `<header class="site-header page-width shelf-header">
    <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
    <nav class="site-nav" aria-label="Primary navigation"><a href="${base}?game=${params.get("from") || "orbit"}">back to Orbit</a></nav>
  </header><main class="page-width shelf-main">
    <section class="shelf-intro" aria-labelledby="shelf-title">
      <div><p class="shelf-kicker">a side room for HVN games</p><h1 id="shelf-title">More things<br><em>to play.</em></h1></div>
      <div class="shelf-intro-note"><p>Orbit is still the main thing here. This is a dozen extra games from Game Shelf, brought into the same little corner so you do not have to leave.</p><span>12 games · no install</span></div>
    </section>
    <section class="shelf-grid" aria-label="Game Shelf games">${SHELF_GAMES.map((game) => shelfCard(game, base)).join("")}</section>
    <footer class="shelf-footer"><span>HVN games / side room</span><a href="https://github.com/ignition27/game-shelf" target="_blank" rel="noreferrer">Game Shelf source + license</a></footer>
  </main>`;
}
