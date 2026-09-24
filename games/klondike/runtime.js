import "./style.css";
import { getPlayerName, recordLeaderboardScore, setPlayerName } from "../../site/src/play-intelligence.js";
import { createKlondikeRun, drawKlondikeStock, moveKlondike, RANK_LABELS, SUITS } from "./rules.js";

const SUIT_MARKS = { S: "♠", H: "♥", D: "♦", C: "♣" };
export function mountKlondike(host) {
  host.innerHTML = `<section class="klondike-game"><header><span>moves <b data-moves>0</b></span><span>score <b data-score>0</b></span><span>time <b data-time>00:00</b></span><button data-restart>New deal</button></header><div class="klondike-scroll"><div class="klondike-board"><div class="klondike-top" data-top></div><div class="klondike-tableau" data-tableau></div></div></div><p data-status role="status" aria-live="polite">Move cards by alternating colors in descending order.</p><form data-name hidden><label>Name or initials<input maxlength="16"></label><button>Save score</button></form></section>`;
  let state = createKlondikeRun(Date.now() >>> 0), selected = null, seconds = 0, timer = 0, saved = false;
  const topNode = host.querySelector("[data-top]"), tableauNode = host.querySelector("[data-tableau]"), status = host.querySelector("[data-status]");
  const cardButton = (card, source, pile, index) => `<button type="button" class="playing-card ${card.faceUp ? `face-up ${card.suit === "H" || card.suit === "D" ? "red" : "black"}` : "face-down"} ${selected?.source === source && selected?.pile === pile && selected?.index === index ? "selected" : ""}" ${card.faceUp ? `data-card data-source="${source}" data-pile="${pile ?? ""}" data-index="${index ?? ""}"` : "disabled"} aria-label="${card.faceUp ? `${RANK_LABELS[card.rank]} of ${card.suit}` : "Face-down card"}">${card.faceUp ? `<span>${RANK_LABELS[card.rank]}</span><b>${SUIT_MARKS[card.suit]}</b>` : ""}</button>`;
  const render = () => {
    topNode.innerHTML = `<button type="button" class="stock-pile ${state.stock.length ? "has-stock" : ""}" data-stock aria-label="Stock, ${state.stock.length} cards">${state.stock.length ? "↻" : ""}</button><div class="waste-pile">${state.waste.length ? cardButton(state.waste.at(-1), "waste", null, null) : "<span class=\"empty-slot\">waste</span>"}</div>${SUITS.map((suit) => `<button type="button" class="foundation-pile" data-foundation="${suit}" aria-label="${suit} foundation">${state.foundations[suit].length ? `${RANK_LABELS[state.foundations[suit].at(-1).rank]} ${SUIT_MARKS[suit]}` : SUIT_MARKS[suit]}</button>`).join("")}`;
    tableauNode.innerHTML = state.tableau.map((pile, pileIndex) => `<div class="klondike-column" data-pile="${pileIndex}">${pile.length ? pile.map((card, index) => cardButton(card, "tableau", pileIndex, index)).join("") : "<span class=\"empty-slot\">K</span>"}</div>`).join("");
    host.querySelector("[data-moves]").textContent = String(state.moves); host.querySelector("[data-score]").textContent = String(state.score);
    host.querySelector("[data-time]").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };
  const save = async (name = getPlayerName()) => {
    const clean = setPlayerName(name); if (!clean || saved) return;
    const entry = recordLeaderboardScore("klondike", state.score, state.moves, seconds); if (!entry) return; saved = true;
    const online = window.HVNOnlineLeaderboard;
    const result = online?.configured ? await online.submit("klondike", { name: clean, score: state.score, packets: state.moves, seconds, submissionId: online.submissionId("klondike", entry) }) : { status: "local" };
    status.textContent = result.status === "online" ? `Saved on the shared board as ${clean}.` : `Saved in this browser as ${clean}.`;
  };
  const checkWin = () => {
    render(); if (state.mode !== "won") return;
    window.clearInterval(timer); status.textContent = `All four foundations complete · ${state.score} points.`;
    if (getPlayerName()) void save(); else host.querySelector("[data-name]").hidden = false;
  };
  const tryFoundation = (source) => {
    const card = source.type === "waste" ? state.waste.at(-1) : state.tableau[source.pile]?.at(-1);
    if (!card) return false;
    const moved = moveKlondike(state, source, { type: "foundation", suit: card.suit });
    if (moved) { selected = null; status.textContent = "Card moved to its foundation."; checkWin(); }
    return moved;
  };
  const chooseCard = (cardNode) => {
    const source = { type: cardNode.dataset.source, pile: Number(cardNode.dataset.pile), index: Number(cardNode.dataset.index) };
    const targetPile = cardNode.closest("[data-pile]")?.dataset.pile;
    if (selected && targetPile !== undefined && moveKlondike(state, selected, { type: "tableau", pile: Number(targetPile) })) {
      selected = null; status.textContent = "Cards moved."; checkWin(); return;
    }
    selected = source; render();
  };
  const clickBoard = (event) => {
    if (event.target.closest("[data-stock]")) { drawKlondikeStock(state); selected = null; status.textContent = state.stock.length || state.waste.length ? "Stock updated." : "No cards remain in the stock."; render(); return; }
    const foundation = event.target.closest("[data-foundation]");
    if (foundation) { if (selected) { if (moveKlondike(state, selected, { type: "foundation", suit: foundation.dataset.foundation })) { selected = null; status.textContent = "Card moved to its foundation."; checkWin(); } } else if (state.waste.length) tryFoundation({ type: "waste" }); return; }
    const card = event.target.closest("[data-card]"); if (card) { chooseCard(card); return; }
    const column = event.target.closest("[data-pile]");
    if (column && selected && moveKlondike(state, selected, { type: "tableau", pile: Number(column.dataset.pile) })) { selected = null; status.textContent = "Cards moved."; checkWin(); }
  };
  host.querySelector(".klondike-board").addEventListener("click", clickBoard);
  host.querySelector("[data-restart]").addEventListener("click", () => {
    window.clearInterval(timer); state = createKlondikeRun(Date.now() >>> 0); selected = null; seconds = 0; saved = false;
    host.querySelector("[data-name]").hidden = true; status.textContent = "Move cards by alternating colors in descending order."; render(); timer = window.setInterval(tick, 1000);
  });
  host.querySelector("[data-name]").addEventListener("submit", (event) => { event.preventDefault(); void save(host.querySelector("[data-name] input").value); });
  function tick() { if (state.mode === "playing") { seconds += 1; render(); } }
  const keydown = (event) => {
    if (!event.key.startsWith("Arrow")) return;
    const controls = [...host.querySelectorAll(".klondike-board button:not(:disabled)")];
    const index = controls.indexOf(document.activeElement);
    if (index >= 0) { event.preventDefault(); controls[Math.max(0, Math.min(controls.length - 1, index + ({ ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key] || 0)))].focus(); }
  };
  window.addEventListener("keydown", keydown);
  timer = window.setInterval(tick, 1000); render();
  return () => { window.clearInterval(timer); window.removeEventListener("keydown", keydown); };
}
