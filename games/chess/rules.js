import { Chess } from "chess.js";

export const MATCH_SECONDS = 180;
export const PIECE_VALUE = Object.freeze({ p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 });

export function makeGame(fen) {
  return fen ? new Chess(fen) : new Chess();
}

export function describeResult(game, humanColor = "w") {
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "b" : "w";
    return { kind: "mate", winner, humanWon: winner === humanColor };
  }
  if (game.isStalemate()) return { kind: "stalemate", winner: null, humanWon: false };
  if (game.isThreefoldRepetition()) return { kind: "repetition", winner: null, humanWon: false };
  if (game.isInsufficientMaterial()) return { kind: "insufficient", winner: null, humanWon: false };
  if (game.isDraw()) return { kind: "draw", winner: null, humanWon: false };
  return null;
}

function positionalValue(piece, file, rank) {
  const center = 3.5 - (Math.abs(file - 3.5) + Math.abs(rank - 3.5)) / 2;
  if (piece.type === "n") return center * 12;
  if (piece.type === "b") return center * 6;
  if (piece.type === "p") return (piece.color === "w" ? rank : 7 - rank) * 5 + center * 2;
  if (piece.type === "q") return center * 2;
  return 0;
}

export function evaluate(game, perspective = "b") {
  if (game.isCheckmate()) return game.turn() === perspective ? -100000 : 100000;
  if (game.isDraw()) return 0;
  let total = 0;
  const board = game.board();
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const piece = board[rank][file];
      if (!piece) continue;
      const sign = piece.color === perspective ? 1 : -1;
      const forwardRank = piece.color === "w" ? 7 - rank : rank;
      total += sign * (PIECE_VALUE[piece.type] + positionalValue(piece, file, forwardRank));
    }
  }
  return total;
}

function moveOrder(move) {
  return (move.promotion ? PIECE_VALUE[move.promotion] : 0)
    + (move.captured ? PIECE_VALUE[move.captured] * 0.8 : 0)
    + (move.flags.includes("k") || move.flags.includes("q") ? 20 : 0);
}

function minimax(game, depth, botColor, alpha, beta) {
  if (depth <= 0 || game.isGameOver()) return evaluate(game, botColor);
  const maximizing = game.turn() === botColor;
  const moves = game.moves({ verbose: true }).sort((left, right) => moveOrder(right) - moveOrder(left));
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, botColor, alpha, beta);
    game.undo();
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function chooseComputerMove(game, round = 1, random = Math.random) {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  const side = game.turn();
  const depth = round < 2 ? 0 : round < 4 ? 1 : 2;
  if (depth === 0) {
    const forcing = moves.filter((move) => move.captured || move.san.includes("+"));
    const pool = forcing.length ? forcing : moves;
    return pool[Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(.999999, random())) * pool.length))];
  }

  let best = -Infinity;
  const choices = [];
  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, side, -Infinity, Infinity);
    game.undo();
    if (score > best) {
      best = score;
      choices.length = 0;
      choices.push(move);
    } else if (score === best) choices.push(move);
  }
  const index = Math.min(choices.length - 1, Math.floor(Math.max(0, Math.min(.999999, random())) * choices.length));
  return choices[index];
}

export function canPossiblyMate(game, color) {
  const pieces = game.board().flat().filter((piece) => piece && piece.color === color && piece.type !== "k");
  if (pieces.some((piece) => ["p", "r", "q"].includes(piece.type))) return true;
  if (pieces.filter((piece) => piece.type === "b").length >= 2) return true;
  if (pieces.filter((piece) => piece.type === "n").length >= 2) return true;
  return pieces.some((piece) => piece.type === "b") && pieces.some((piece) => piece.type === "n");
}
