export const SHELF_GAMES = [
  { id: "golf", number: "01", name: "Mini Golf", kind: "arcade", description: "Six small greens. Banks, bunkers, and a clean line to the cup." },
  { id: "snake", number: "02", name: "Snake", kind: "arcade", description: "Eat apples, grow longer, and don’t hit the wall." },
  { id: "dodger", number: "03", name: "Space Dodger", kind: "arcade", description: "Keep the fighter moving while Mars gets busier around you." },
  { id: "memory", number: "04", name: "Memory Match", kind: "arcade", description: "Find every matching pair in as few moves as possible." },
  { id: "reaction", number: "05", name: "Reaction Test", kind: "arcade", description: "Wait for the lights, then tap as fast as you can." },
  { id: "word", number: "06", name: "Wordle", kind: "puzzle", description: "Six tries to find the hidden word, with clues for every letter." },
  { id: "flappy", number: "07", name: "Sky Flyer", kind: "arcade", description: "Tap up through a changing sky without clipping the next gate." },
  { id: "platform", number: "08", name: "Mini Platformer", kind: "arcade", description: "Jump across three short levels and collect every marker." },
  { id: "tic", number: "09", name: "Tic-Tac-Toe", kind: "board", description: "You are X. The computer is paying attention." },
  { id: "checkers", number: "10", name: "Checkers", kind: "board", description: "Choose a bot, make a jump, and see if you can take the board." },
  { id: "trade", number: "11", name: "City Trader", kind: "board", description: "Buy streets, build them up, and outlast the other players." },
];

// Kept out of the collection, but still reachable for old bookmarks and saved runs.
const ARCHIVED_SHELF_GAMES = [
  { id: "clicker", number: "07", name: "Field Station", kind: "adventure", description: "Fund a research station, train assistants, and send out surveys." },
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
  const selected = [...SHELF_GAMES, ...ARCHIVED_SHELF_GAMES].find((game) => game.id === params.get("play"));
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
const SHELF_ASSET_VERSION = "fullscreen-arcade-1";
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
  body.shelf-native-mode .snake-panel {
    --snake-ink: #163d32;
    --snake-muted: #637568;
    --snake-paper: #f2edda;
    --snake-board: #234c3d;
    --snake-apple: #d95f4d;
    display: grid;
    gap: 22px;
    padding: clamp(16px, 3vw, 30px);
    border: 1px solid var(--snake-ink);
    border-radius: 4px;
    background: var(--snake-paper);
    color: var(--snake-ink);
    box-shadow: 9px 9px 0 rgba(22, 61, 50, .22);
  }
  body.shelf-native-mode .snake-topline { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding-bottom: 17px; border-bottom: 1px solid rgba(22, 61, 50, .28); }
  body.shelf-native-mode .snake-topline h2 { margin: 4px 0 0; font-size: clamp(2rem, 5vw, 3.5rem); line-height: .95; letter-spacing: -.07em; }
  body.shelf-native-mode .snake-eyebrow { color: var(--snake-muted); font-size: .68rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  body.shelf-native-mode .snake-live-mark { padding: 5px 8px; border: 1px solid var(--snake-ink); color: var(--snake-ink); font-size: .65rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  body.shelf-native-mode .snake-rule { display: flex; align-items: center; gap: 8px; margin: -5px 0 0; color: var(--snake-muted); font-size: .86rem; }
  body.shelf-native-mode .snake-rule-dot { color: var(--snake-apple); font-size: 1.1rem; line-height: 1; }
  body.shelf-native-mode .snake-layout { display: grid; grid-template-columns: 165px minmax(0, 1fr); gap: clamp(18px, 3vw, 34px); align-items: start; }
  body.shelf-native-mode .snake-rail { display: grid; gap: 14px; align-content: start; }
  body.shelf-native-mode .snake-stat { display: grid; gap: 4px; padding-bottom: 12px; border-bottom: 1px solid rgba(22, 61, 50, .2); }
  body.shelf-native-mode .snake-stat span, body.shelf-native-mode .snake-settings label { color: var(--snake-muted); font-size: .63rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  body.shelf-native-mode .snake-stat strong { font-size: 2rem; line-height: 1; letter-spacing: -.06em; font-variant-numeric: tabular-nums; }
  body.shelf-native-mode .snake-settings { display: grid; gap: 10px; margin-top: 2px; }
  body.shelf-native-mode .snake-settings label { display: grid; gap: 5px; }
  body.shelf-native-mode .snake-settings select { min-width: 0; padding: 8px 9px; border: 1px solid rgba(22, 61, 50, .42); border-radius: 2px; background: #fbf7e8; color: var(--snake-ink); font: 500 .84rem "Avenir Next", "Helvetica Neue", sans-serif; }
  body.shelf-native-mode .snake-mode-note { margin: 2px 0 0; color: var(--snake-muted); font-size: .76rem; line-height: 1.45; }
  body.shelf-native-mode .snake-play { min-width: 0; }
  body.shelf-native-mode .snake-play .arcade-stage { max-width: 480px; margin: 0 auto; padding: 9px; border: 1px solid var(--snake-ink); border-radius: 3px; background: var(--snake-board); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08); }
  body.shelf-native-mode .snake-play .arcade-stage .canvas { display: block; border: 1px solid rgba(246, 241, 216, .22); }
  body.shelf-native-mode .snake-feedback { min-height: 20px; margin: 11px 0 0; color: var(--snake-muted); font-size: .78rem; text-align: center; }
  body.shelf-native-mode .snake-controls { justify-content: center; margin-top: -2px; }
  body.shelf-native-mode .snake-controls button { border-color: var(--snake-ink); border-radius: 2px; background: transparent; color: var(--snake-ink); font-size: .76rem; }
  body.shelf-native-mode .snake-controls button:hover { background: var(--snake-ink); color: var(--snake-paper); }
  body.shelf-native-mode .snake-panel .arcade-overlay { background: rgba(35, 76, 61, .9); color: #f4f0dc; }
  body.shelf-native-mode .snake-panel .arcade-overlay .kicker { color: #d8e58b; }
  body.shelf-native-mode .snake-panel .arcade-overlay h2 { max-width: 280px; margin: 12px 0 10px; font-size: clamp(2rem, 5vw, 3.4rem); letter-spacing: -.07em; }
  body.shelf-native-mode .snake-panel .arcade-overlay p { max-width: 260px; font-size: .88rem; }
  body.shelf-native-mode .snake-panel .arcade-overlay .action { border-color: #e4e99b; border-radius: 2px; background: #e4e99b; color: var(--snake-ink); }
  body.shelf-native-mode .snake-footnote { margin: -7px 0 0; color: var(--snake-muted); font-size: .72rem; text-align: center; }
  @media (max-width: 680px) {
    body.shelf-native-mode .snake-layout { grid-template-columns: 1fr; }
    body.shelf-native-mode .snake-rail { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    body.shelf-native-mode .snake-settings, body.shelf-native-mode .snake-mode-note { grid-column: 1 / -1; }
  }
  @media (max-width: 420px) {
    body.shelf-native-mode .snake-panel { gap: 16px; padding: 13px; }
    body.shelf-native-mode .snake-topline h2 { font-size: 2.35rem; }
    body.shelf-native-mode .snake-rule { font-size: .78rem; }
    body.shelf-native-mode .snake-stat strong { font-size: 1.55rem; }
    body.shelf-native-mode .snake-controls { display: grid; grid-template-columns: repeat(4, 1fr); }
    body.shelf-native-mode .snake-controls #pause-game, body.shelf-native-mode .snake-controls #restart-game { grid-column: span 2; }
  }
  body.shelf-native-mode .f1-reaction-panel {
    --f1-ink: #151515;
    --f1-paper: #f5f3ed;
    --f1-red: #ef3340;
    --f1-lime: #d8f35b;
    --f1-muted: #696b68;
    display: grid;
    gap: 20px;
    padding: clamp(18px, 4vw, 34px);
    border: 1px solid var(--f1-ink);
    border-radius: 3px;
    background: var(--f1-paper);
    color: var(--f1-ink);
    box-shadow: 8px 8px 0 rgba(21, 21, 21, .2);
    overflow: hidden;
  }
  body.shelf-native-mode .f1-panel-topline { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid rgba(21, 21, 21, .24); padding-bottom: 14px; color: var(--f1-muted); font-size: .65rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
  body.shelf-native-mode .f1-track-mark { color: var(--f1-ink); }
  body.shelf-native-mode .f1-gantry { display: grid; justify-items: center; gap: 12px; max-width: 440px; margin: 0 auto; padding: 18px 22px 15px; border: 1px solid var(--f1-ink); border-radius: 2px; background: #202020; color: #f5f3ed; box-shadow: inset 0 -5px 0 #d8f35b; }
  body.shelf-native-mode .f1-gantry-copy { display: flex; align-items: baseline; justify-content: space-between; width: 100%; gap: 14px; }
  body.shelf-native-mode .f1-gantry-copy b { font-size: clamp(1.1rem, 3vw, 1.55rem); letter-spacing: -.04em; }
  body.shelf-native-mode .f1-gantry-copy small { color: #c2c4bd; font-size: .62rem; letter-spacing: .11em; }
  body.shelf-native-mode .start-lights { display: flex; gap: clamp(8px, 2vw, 14px); padding: 12px 18px; border: 1px solid #565656; border-radius: 3px; background: #090909; }
  body.shelf-native-mode .start-light { width: clamp(26px, 6vw, 38px); aspect-ratio: 1; border-radius: 50%; background: #282828; border: 2px solid #575757; box-shadow: inset 0 0 0 4px #141414; }
  body.shelf-native-mode .start-light.is-lit { background: var(--f1-red); border-color: #ff858c; box-shadow: 0 0 0 2px #681821, inset 0 0 0 4px #b71927; }
  body.shelf-native-mode .f1-reaction-button { min-height: 68px; border: 2px solid var(--f1-ink); border-radius: 2px; background: #e7e6df; color: var(--f1-ink); font: 800 clamp(1.15rem, 3vw, 1.7rem)/1 var(--ui-font, "Avenir Next", sans-serif); letter-spacing: -.04em; cursor: pointer; }
  body.shelf-native-mode .f1-reaction-button.is-waiting { background: var(--f1-red); color: #fff; border-color: var(--f1-red); }
  body.shelf-native-mode .f1-reaction-button.is-go { background: var(--f1-lime); color: var(--f1-ink); border-color: var(--f1-ink); }
  body.shelf-native-mode .f1-race-meta { display: flex; justify-content: space-between; gap: 12px; color: var(--f1-muted); font-size: .74rem; }
  body.shelf-native-mode .f1-race-meta strong { color: var(--f1-ink); font-weight: 800; text-transform: uppercase; }
  body.shelf-native-mode .f1-reaction-panel .controls { justify-content: flex-start; margin-top: -4px; }
  body.shelf-native-mode .f1-reaction-panel .controls button { border-color: var(--f1-ink); border-radius: 2px; background: transparent; color: var(--f1-ink); font-size: .74rem; }
  body.shelf-native-mode .f1-reaction-panel .controls button:hover { background: var(--f1-ink); color: var(--f1-paper); }
  body.shelf-native-mode .f1-reaction-panel .reaction-leaderboard { max-width: none; margin-top: 2px; border-top-color: rgba(21, 21, 21, .28); }
  body.shelf-native-mode .f1-reaction-panel .reaction-leaderboard-heading h2 { letter-spacing: -.04em; }
  body.shelf-native-mode .f1-reaction-panel .reaction-leaderboard form button { border-radius: 2px; background: var(--f1-lime); }
  @media (max-width: 520px) {
    body.shelf-native-mode .f1-reaction-panel { gap: 16px; padding: 14px; }
    body.shelf-native-mode .f1-gantry { padding-inline: 12px; }
    body.shelf-native-mode .f1-gantry-copy { align-items: start; flex-direction: column; gap: 4px; }
    body.shelf-native-mode .start-lights { padding-inline: 10px; gap: 6px; }
    body.shelf-native-mode .start-light { width: 28px; }
    body.shelf-native-mode .f1-reaction-button { min-height: 58px; }
  }

  /* Each game gets its own material, palette, and control language. */
  body.shelf-native-mode { --game-paper: #f1f0e9; --game-ink: #1c201d; --game-muted: #6a6d65; --game-line: rgba(28, 32, 29, .2); }
  body.shelf-native-mode[data-shelf-game] .shelf-native-main { max-width: 1120px; }
  body.shelf-native-mode[data-shelf-game] .shelf-game-heading { border-left: 4px solid var(--game-accent, #b8d94b); padding-left: 17px; }
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .panel,
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .trade-shell,
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .trade-setup { border: 1px solid var(--game-line); border-radius: 4px; box-shadow: 8px 8px 0 var(--game-shadow, rgba(28, 32, 29, .13)); }
  body.shelf-native-mode[data-shelf-game] #shelf-native-host button { border-radius: 3px; box-shadow: none; transition: background-color .16s ease, color .16s ease, border-color .16s ease, transform .16s ease; }
  body.shelf-native-mode[data-shelf-game] #shelf-native-host button:hover:not(:disabled) { transform: translateY(-1px); }
  body.shelf-native-mode[data-shelf-game] #shelf-native-host button:focus-visible { outline: 3px solid var(--game-accent, #b8d94b); outline-offset: 3px; }
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .controls { gap: 8px; }
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .controls button { border: 1px solid var(--game-ink); background: transparent; color: var(--game-ink); }

  body.shelf-native-mode[data-shelf-game="golf"] { --game-paper: #f2efdd; --game-ink: #183f35; --game-muted: #667568; --game-line: rgba(24, 63, 53, .25); --game-accent: #d3aa57; --game-shadow: rgba(24, 63, 53, .2); background: #d9d7c9; }
  body.shelf-native-mode[data-shelf-game="golf"] .shelf-game-heading { border-color: #d3aa57; }
  body.shelf-native-mode[data-shelf-game="golf"] .golf-panel { background: var(--game-paper); color: var(--game-ink); }
  body.shelf-native-mode[data-shelf-game="golf"] .golf-stage { border: 10px solid #1f5747; border-radius: 3px; background: #9fc77c; box-shadow: inset 0 0 0 1px #123a30; }
  body.shelf-native-mode[data-shelf-game="golf"] .golf-shot-controls { border-top: 1px solid var(--game-line); }
  body.shelf-native-mode[data-shelf-game="golf"] .golf-shot-controls button { background: #1f5747; color: #f2efdd; border-color: #1f5747; }

  body.shelf-native-mode[data-shelf-game="snake"] { --game-paper: #f2edda; --game-ink: #163d32; --game-accent: #e4e99b; background: #d9d6c9; }
  body.shelf-native-mode[data-shelf-game="snake"] .shelf-game-heading { border-color: #d95f4d; }

  body.shelf-native-mode[data-shelf-game="dodger"] { --game-paper: #172231; --game-ink: #e9e5d8; --game-muted: #9aa6ae; --game-line: rgba(233, 229, 216, .24); --game-accent: #e17f76; --game-shadow: rgba(14, 25, 38, .28); background: #0e1725; }
  body.shelf-native-mode[data-shelf-game="dodger"] .shelf-game-heading { border-color: #e17f76; }
  body.shelf-native-mode[data-shelf-game="dodger"] .shooter-panel { border-color: #71808b; background: #172231; color: var(--game-ink); box-shadow: 8px 8px 0 #09111d; }
  body.shelf-native-mode[data-shelf-game="dodger"] .shooter-status { border-color: rgba(233, 229, 216, .3); }
  body.shelf-native-mode[data-shelf-game="dodger"] .shooter-panel .controls button { border-color: #a8b4b8; color: #e9e5d8; }
  body.shelf-native-mode[data-shelf-game="dodger"] .shooter-panel .controls button:hover:not(:disabled) { background: #e17f76; border-color: #e17f76; color: #172231; }

  body.shelf-native-mode[data-shelf-game="memory"] { --game-paper: #e7e3cf; --game-ink: #343b2f; --game-muted: #6d7564; --game-line: rgba(52, 59, 47, .22); --game-accent: #9baf63; --game-shadow: rgba(52, 59, 47, .18); background: #c9c9b9; }
  body.shelf-native-mode[data-shelf-game="memory"] .shelf-game-heading { border-color: #9baf63; }
  body.shelf-native-mode[data-shelf-game="memory"] .field-kit-panel { background: var(--game-paper); color: var(--game-ink); }
  body.shelf-native-mode[data-shelf-game="memory"] .memory-stage { background: #758367; border: 8px solid #404a3b; border-radius: 3px; }
  body.shelf-native-mode[data-shelf-game="memory"] .memory-card { border-radius: 2px; border-color: #404a3b; background: #ece8d8; }

  body.shelf-native-mode[data-shelf-game="reaction"] { --game-accent: #d8f35b; background: #d4d4d0; }
  body.shelf-native-mode[data-shelf-game="reaction"] .shelf-game-heading { border-color: #ef3340; }

  body.shelf-native-mode[data-shelf-game="word"] { --game-paper: #e7eadf; --game-ink: #203d34; --game-muted: #66736a; --game-line: rgba(32, 61, 52, .24); --game-accent: #e6b84d; --game-shadow: rgba(32, 61, 52, .2); background: #cfd5ca; }
  body.shelf-native-mode[data-shelf-game="word"] .shelf-game-heading { border-color: #e6b84d; }
  body.shelf-native-mode[data-shelf-game="word"] .vault-panel { background: var(--game-paper); color: var(--game-ink); }
  body.shelf-native-mode[data-shelf-game="word"] .vault-panel button { border-radius: 2px; }

  body.shelf-native-mode[data-shelf-game="clicker"] { --game-paper: #eee9d9; --game-ink: #3d4334; --game-muted: #707665; --game-line: rgba(61, 67, 52, .24); --game-accent: #c67b4f; --game-shadow: rgba(61, 67, 52, .2); background: #c9c1ab; }
  body.shelf-native-mode[data-shelf-game="clicker"] .shelf-game-heading { border-color: #c67b4f; }
  body.shelf-native-mode[data-shelf-game="clicker"] .adventure { background: var(--game-paper); color: var(--game-ink); }
  body.shelf-native-mode[data-shelf-game="clicker"] .camp-scene { border: 1px solid #3d4334; background: #b9c896; }
  body.shelf-native-mode[data-shelf-game="clicker"] .adventure-grid { gap: 12px; }

  body.shelf-native-mode[data-shelf-game="flappy"] { --game-paper: #27253a; --game-ink: #f4e9d4; --game-muted: #c0b5a4; --game-line: rgba(244, 233, 212, .24); --game-accent: #efa85f; --game-shadow: rgba(27, 23, 44, .35); background: #1e1d2d; }
  body.shelf-native-mode[data-shelf-game="flappy"] .shelf-game-heading { border-color: #efa85f; }
  body.shelf-native-mode[data-shelf-game="flappy"] .flyer-panel { border-color: #d08b65; background: var(--game-paper); color: var(--game-ink); }
  body.shelf-native-mode[data-shelf-game="flappy"] .flyer-panel .controls button { border-color: #f4e9d4; color: #f4e9d4; }

  body.shelf-native-mode[data-shelf-game="platform"] { --game-paper: #e8e1ee; --game-ink: #342c47; --game-muted: #71677c; --game-line: rgba(52, 44, 71, .23); --game-accent: #db754c; --game-shadow: rgba(52, 44, 71, .2); background: #c9c2d0; }
  body.shelf-native-mode[data-shelf-game="platform"] .shelf-game-heading { border-color: #db754c; }
  body.shelf-native-mode[data-shelf-game="platform"] .adventure { background: var(--game-paper); color: var(--game-ink); }
  body.shelf-native-mode[data-shelf-game="platform"] .trail-map { border-color: #342c47; background: #d3c8dd; }
  body.shelf-native-mode[data-shelf-game="platform"] .trail-stage { border: 8px solid #342c47; border-radius: 3px; background: #a5c5c7; }

  body.shelf-native-mode[data-shelf-game="tic"] { --game-paper: #f3e8d2; --game-ink: #42302c; --game-muted: #78685e; --game-line: rgba(66, 48, 44, .25); --game-accent: #d56343; --game-shadow: rgba(66, 48, 44, .2); background: #d8c9b8; }
  body.shelf-native-mode[data-shelf-game="tic"] .shelf-game-heading { border-color: #d56343; }
  body.shelf-native-mode[data-shelf-game="tic"] .panel { background: var(--game-paper); color: var(--game-ink); }
  body.shelf-native-mode[data-shelf-game="tic"] .tic-board { border: 8px solid #42302c; background: #d8a47a; gap: 5px; }
  body.shelf-native-mode[data-shelf-game="tic"] .tic-board button { border: 1px solid #42302c; border-radius: 2px; background: #f3e8d2; color: #42302c; }

  body.shelf-native-mode[data-shelf-game="checkers"] { --game-paper: #eee5d7; --game-ink: #332c2a; --game-muted: #756963; --game-line: rgba(51, 44, 42, .24); --game-accent: #c45f4b; --game-shadow: rgba(51, 44, 42, .18); background: #d0c4b6; }
  body.shelf-native-mode[data-shelf-game="checkers"] .shelf-game-heading { border-color: #c45f4b; }
  body.shelf-native-mode[data-shelf-game="checkers"] .panel { background: var(--game-paper); color: var(--game-ink); }
  body.shelf-native-mode[data-shelf-game="checkers"] .checkers { border: 8px solid #332c2a; border-radius: 2px; background: #bc775f; }

  body.shelf-native-mode[data-shelf-game="trade"] { --game-paper: #e5e0d5; --game-ink: #273438; --game-muted: #697375; --game-line: rgba(39, 52, 56, .24); --game-accent: #d1a85c; --game-shadow: rgba(39, 52, 56, .19); background: #c9cbc3; }
  body.shelf-native-mode[data-shelf-game="trade"] .shelf-game-heading { border-color: #d1a85c; }
  body.shelf-native-mode[data-shelf-game="trade"] .trade-shell, body.shelf-native-mode[data-shelf-game="trade"] .trade-setup { background: var(--game-paper); color: var(--game-ink); }
  body.shelf-native-mode[data-shelf-game="trade"] .trade-layout { gap: 16px; }
  body.shelf-native-mode[data-shelf-game="trade"] .trade-board { border: 8px solid #273438; border-radius: 2px; background: #d1c49d; }
  body.shelf-native-mode[data-shelf-game="trade"] .side-panel { border: 1px solid var(--game-line); border-radius: 3px; background: #f0ece3; }

  @media (max-width: 680px) {
    body.shelf-native-mode[data-shelf-game] .shelf-game-heading { padding-left: 12px; }
    body.shelf-native-mode[data-shelf-game] #shelf-native-host .game-wrap { width: 100%; }
    body.shelf-native-mode[data-shelf-game] #shelf-native-host .trade-layout { grid-template-columns: 1fr; }
    body.shelf-native-mode[data-shelf-game] #shelf-native-host .trade-side { order: 0; }
    body.shelf-native-mode[data-shelf-game] #shelf-native-host .golf-shot-controls { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    body.shelf-native-mode[data-shelf-game] #shelf-native-host button { transition: none; }
    body.shelf-native-mode[data-shelf-game] #shelf-native-host button:hover:not(:disabled) { transform: none; }
  }

  /* The game route is the frame. Keep each game's play surface wide and let its
     own board or canvas provide the only meaningful boundary. */
  body.shelf-native-mode[data-shelf-game] .shelf-native-main {
    width: min(1400px, calc(100% - 48px));
    max-width: 1400px;
    padding-block: 34px 70px;
  }
  body.shelf-native-mode[data-shelf-game] .shelf-game-heading {
    margin-bottom: 22px;
    padding-bottom: 18px;
  }
  body.shelf-native-mode[data-shelf-game] .game-header {
    background: transparent;
    border-bottom-color: var(--game-line, var(--native-line));
  }
  body.shelf-native-mode[data-shelf-game] .game-header .wordmark,
  body.shelf-native-mode[data-shelf-game] .game-header .site-nav a {
    color: var(--game-ink, var(--native-ink));
  }
  body.shelf-native-mode[data-shelf-game] .shelf-game-label {
    color: var(--game-muted, var(--native-muted));
  }
  body.shelf-native-mode[data-shelf-game] .shelf-game-heading h1 {
    color: var(--game-ink, var(--native-ink));
  }
  body.shelf-native-mode[data-shelf-game] .shelf-game-heading .game-blurb {
    color: var(--game-muted, var(--native-muted));
  }
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .game-wrap {
    width: 100%;
    max-width: none;
    margin: 0;
  }
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .game-wrap > .panel,
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .game-wrap > .trade-shell,
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .game-wrap > .trade-setup {
    width: 100%;
    max-width: none;
    margin: 0;
    border-width: 0;
    border-radius: 0;
    box-shadow: none;
  }
  body.shelf-native-mode[data-shelf-game] #shelf-native-host .game-wrap > .arcade-panel {
    padding: clamp(18px, 3vw, 36px);
  }
  body.shelf-native-mode[data-shelf-game="flappy"] #shelf-native-host .flyer-panel,
  body.shelf-native-mode[data-shelf-game="dodger"] #shelf-native-host .shooter-panel {
    min-height: min(720px, calc(100dvh - 220px));
    display: grid;
    align-content: start;
    padding: 0;
    background: transparent;
  }
  body.shelf-native-mode[data-shelf-game="flappy"] #shelf-native-host .flyer-panel .arcade-stage,
  body.shelf-native-mode[data-shelf-game="dodger"] #shelf-native-host .shooter-panel .arcade-stage {
    width: 100%;
    max-width: none;
    margin-inline: 0;
  }
  body.shelf-native-mode[data-shelf-game="flappy"] #shelf-native-host .flyer-panel .canvas,
  body.shelf-native-mode[data-shelf-game="dodger"] #shelf-native-host .shooter-panel .canvas {
    width: 100%;
    height: auto;
  }
  body.shelf-native-mode[data-shelf-game="flappy"] #shelf-native-host .flyer-panel .controls,
  body.shelf-native-mode[data-shelf-game="dodger"] #shelf-native-host .shooter-panel .controls {
    justify-content: flex-start;
  }
  @media (max-width: 680px) {
    body.shelf-native-mode[data-shelf-game] .shelf-native-main {
      width: min(calc(100% - 28px), 1400px);
      padding-block: 26px 52px;
    }
    body.shelf-native-mode[data-shelf-game] .shelf-game-heading {
      margin-bottom: 16px;
      padding-bottom: 14px;
    }
    body.shelf-native-mode[data-shelf-game] #shelf-native-host .game-wrap > .arcade-panel {
      padding: 14px;
    }
    body.shelf-native-mode[data-shelf-game="flappy"] #shelf-native-host .flyer-panel,
    body.shelf-native-mode[data-shelf-game="dodger"] #shelf-native-host .shooter-panel {
      min-height: 0;
    }
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
      script.src = `${base}shelf/${file}?v=${SHELF_ASSET_VERSION}`;
      script.dataset.shelfScript = file;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load shelf game asset: ${file}`));
      document.body.appendChild(script);
    });
  }

  if (typeof window.play !== "function") throw new Error("Shelf game engine did not expose play()");
  window.play(gameId);
  if (gameId === "snake") {
    const syncSnakeCopy = () => {
      const title = document.querySelector("#overlay-title");
      const note = document.querySelector("#overlay-note");
      const action = document.querySelector("#start-game");
      if (title?.textContent === "A little room to grow.") title.textContent = "Ready to grow?";
      if (note?.textContent === "Pick your rules, then head into the garden.") note.textContent = "Eat apples. Don’t hit the wall or yourself.";
      if (action?.textContent === "Start growing →") action.textContent = "Start →";
      if (title?.textContent === "Garden complete!") title.textContent = "Board cleared!";
      if (note?.textContent?.includes("You filled the garden!")) note.textContent = note.textContent.replace("You filled the garden!", "You filled the board!");
      if (title?.textContent === "Take a breather.") title.textContent = "Paused.";
      if (note?.textContent === "Your garden will be right here.") note.textContent = "Your score is safe. Pick up where you left off.";
      if (action?.textContent === "Keep growing →") action.textContent = "Resume →";
    };
    const snakeCopyObserver = new MutationObserver(syncSnakeCopy);
    snakeCopyObserver.observe(document.querySelector("#shelf-native-host") || document.body, { subtree: true, childList: true, characterData: true });
    syncSnakeCopy();
  }
}

function renderShelfHome({ app, base }) {
  app.innerHTML = `<header class="site-header page-width shelf-header">
    <a class="wordmark" href="${base}" aria-label="HVN games home">HVN games</a>
    <nav class="site-nav" aria-label="Primary navigation"><a href="${base}">home</a></nav>
  </header><main class="page-width shelf-main">
    <section class="shelf-intro" aria-labelledby="shelf-title">
      <div><p class="shelf-kicker">the other games</p><h1 id="shelf-title">Pick a game.</h1></div>
      <div class="shelf-intro-note"><p>Short games for a spare minute. Pick one and start playing.</p><span>11 games · no install</span></div>
    </section>
    <section class="shelf-grid" aria-label="Other HVN games">${SHELF_GAMES.map((game) => shelfCard(game, base)).join("")}</section>
    <footer class="site-footer shelf-footer"><span>HVN games</span><span>11 games</span></footer>
  </main>`;
}
