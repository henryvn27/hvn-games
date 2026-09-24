export const SUITS = Object.freeze(["S", "H", "D", "C"]);
export const RANK_LABELS = Object.freeze(["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
export const cardColor = (suit) => suit === "H" || suit === "D" ? "red" : "black";
const makeDeck = () => SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ id: `${suit}${i + 1}`, suit, rank: i + 1, faceUp: false })));

export function createKlondikeRun(seed = 17) {
  const deck = makeDeck(); let value = seed >>> 0;
  for (let i = deck.length - 1; i > 0; i -= 1) { value = (value * 1664525 + 1013904223) >>> 0; const j = value % (i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const tableau = Array.from({ length: 7 }, (_, column) => deck.splice(0, column + 1));
  tableau.forEach((pile) => { pile[pile.length - 1].faceUp = true; });
  return { stock: deck, waste: [], foundations: { S: [], H: [], D: [], C: [] }, tableau, moves: 0, score: 0, mode: "playing" };
}

function top(pile) { return pile[pile.length - 1]; }
export function canPlaceTableau(card, destination) {
  if (!destination.length) return card.rank === 13;
  const target = top(destination);
  return target.faceUp && cardColor(card.suit) !== cardColor(target.suit) && card.rank === target.rank - 1;
}
export function canPlaceFoundation(card, pile) {
  if (!pile.length) return card.rank === 1;
  return top(pile).suit === card.suit && top(pile).rank + 1 === card.rank;
}
function takeSource(state, source) {
  if (source.type === "waste") return state.waste.pop();
  if (source.type !== "tableau") return null;
  const pile = state.tableau[source.pile];
  if (!pile || source.index < 0 || source.index >= pile.length || !pile.slice(source.index).every((card) => card.faceUp)) return null;
  return pile.splice(source.index);
}
function revealTop(state, source) {
  if (source.type !== "tableau") return;
  const pile = state.tableau[source.pile];
  if (pile.length && !top(pile).faceUp) { top(pile).faceUp = true; state.score += 5; }
}
export function moveKlondike(state, source, destination) {
  if (state.mode !== "playing") return false;
  const cards = source.type === "tableau" ? state.tableau[source.pile]?.slice(source.index) : [state.waste[state.waste.length - 1]];
  if (!cards?.length || !cards[0] || !cards.every((card) => card.faceUp)) return false;
  if (destination.type === "tableau") {
    const target = state.tableau[destination.pile];
    if (!target || source.type === "tableau" && source.pile === destination.pile || !canPlaceTableau(cards[0], target)) return false;
    const moved = takeSource(state, source); target.push(...(Array.isArray(moved) ? moved : [moved])); revealTop(state, source); state.moves += 1;
  } else if (destination.type === "foundation") {
    if (cards.length !== 1) return false;
    const target = state.foundations[destination.suit];
    if (!target || !canPlaceFoundation(cards[0], target)) return false;
    takeSource(state, source); target.push(cards[0]); revealTop(state, source); state.moves += 1; state.score += 10;
  } else return false;
  if (Object.values(state.foundations).every((pile) => pile.length === 13)) state.mode = "won";
  return true;
}
export function drawKlondikeStock(state) {
  if (state.stock.length) { const card = state.stock.pop(); card.faceUp = true; state.waste.push(card); state.moves += 1; return card; }
  if (!state.waste.length) return null;
  state.stock = state.waste.splice(0).reverse().map((card) => ({ ...card, faceUp: false }));
  state.moves += 1; return null;
}
