export const HANDSHAKE = Object.freeze({ tables: 4, dealsPerTable: 5, points: Object.freeze({ bothShare: 3, soleKeeper: 6, bothKeep: 1 }) });

export const PARTNERS = Object.freeze([
  Object.freeze({ id: "regular", name: "The Regular", note: "Remembers your last hand.", style: "mirror", color: "#d8784b" }),
  Object.freeze({ id: "vendor", name: "The Vendor", note: "Offers the same fair split every time.", style: "steady", color: "#4d8d78" }),
  Object.freeze({ id: "forgiver", name: "The Forgiver", note: "Pushes back once, then gives you another chance.", style: "one-strike", color: "#d0a23d" }),
  Object.freeze({ id: "ledger", name: "The Bookkeeper", note: "Keeps an eye on how often you take more.", style: "ledger", color: "#687ba0" }),
]);

export function createTournament() {
  return { mode: "ready", tableIndex: 0, handIndex: 0, totalPoints: 0, tablesWon: 0, tablePoints: 0, rivalPoints: 0, mutualShares: 0, playerKeeps: 0, playerShares: 0, hands: [], completedDeals: 0, lastDeal: null, pausedMode: null };
}

export function startTournament() {
  return { ...createTournament(), mode: "active" };
}

function partnerChoice(state, partner) {
  const last = state.hands.at(-1);
  if (partner.style === "steady") return "share";
  if (partner.style === "mirror") return last ? last.player : "share";
  if (partner.style === "one-strike") return last?.player === "keep" && last.opponent === "share" ? "keep" : "share";
  return state.playerKeeps > state.playerShares ? "keep" : "share";
}

function pointsFor(player, opponent) {
  if (player === "share" && opponent === "share") return [HANDSHAKE.points.bothShare, HANDSHAKE.points.bothShare];
  if (player === "keep" && opponent === "share") return [HANDSHAKE.points.soleKeeper, 0];
  if (player === "share" && opponent === "keep") return [0, HANDSHAKE.points.soleKeeper];
  return [HANDSHAKE.points.bothKeep, HANDSHAKE.points.bothKeep];
}

export function choose(state, action) {
  if (state.mode !== "active" || !["share", "keep"].includes(action)) return state;
  const opponent = partnerChoice(state, PARTNERS[state.tableIndex]);
  const [playerPoints, opponentPoints] = pointsFor(action, opponent);
  const deal = Object.freeze({ table: state.tableIndex, hand: state.handIndex, player: action, opponent, playerPoints, opponentPoints });
  return {
    ...state,
    mode: "reveal",
    hands: [...state.hands, deal],
    lastDeal: deal,
    completedDeals: state.completedDeals + 1,
    totalPoints: state.totalPoints + playerPoints,
    tablePoints: state.tablePoints + playerPoints,
    rivalPoints: state.rivalPoints + opponentPoints,
    mutualShares: state.mutualShares + Number(action === "share" && opponent === "share"),
    playerKeeps: state.playerKeeps + Number(action === "keep"),
    playerShares: state.playerShares + Number(action === "share"),
  };
}

export function advance(state) {
  if (state.mode !== "reveal") return state;
  if (state.handIndex + 1 < HANDSHAKE.dealsPerTable) return { ...state, mode: "active", handIndex: state.handIndex + 1, lastDeal: null };
  const tablesWon = state.tablesWon + Number(state.tablePoints > state.rivalPoints);
  if (state.tableIndex + 1 === HANDSHAKE.tables) return { ...state, mode: "result", tablesWon };
  return { ...state, mode: "between", tableIndex: state.tableIndex + 1, handIndex: 0, tablesWon, tablePoints: 0, rivalPoints: 0, mutualShares: 0, playerKeeps: 0, playerShares: 0, hands: [], lastDeal: null };
}

export function startNextTable(state) {
  return state.mode === "between" ? { ...state, mode: "active" } : state;
}

export function pause(state) {
  return state.mode === "active" ? { ...state, mode: "paused", pausedMode: "active" } : state;
}

export function resume(state) {
  return state.mode === "paused" ? { ...state, mode: state.pausedMode || "active", pausedMode: null } : state;
}
