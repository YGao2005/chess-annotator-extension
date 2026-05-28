import type { GameRecord, MoveRecord } from '@/shared/types';

export interface PositionMatch {
  gameId: string;
  gameDate: string;
  opponentName: string;
  result: string;
  moveIndex: number;
  move: MoveRecord;
  similarity: number;
  matchType: 'exact_fen' | 'piece_placement' | 'move_pattern';
}

/**
 * Extract just the piece placement from a FEN (first field).
 * Strips castling rights, en passant, move counters, and side to move.
 */
function piecePlacement(fen: string): string {
  return fen.split(' ')[0] ?? fen;
}

/**
 * Count material from a FEN piece placement string.
 * Returns a canonical string like "KQRRBBNNPPPPPPPPkqrrbbnnpppppppp"
 */
function materialSignature(placement: string): string {
  const pieces = placement.replace(/[0-9/]/g, '').split('').sort().join('');
  return pieces;
}

/**
 * Compute similarity between two FEN strings (0-1).
 * 1.0 = identical piece placement
 * Uses square-by-square comparison of the 64 squares.
 */
function fenSimilarity(fen1: string, fen2: string): number {
  const board1 = expandPlacement(piecePlacement(fen1));
  const board2 = expandPlacement(piecePlacement(fen2));

  let matching = 0;
  const total = 64;
  for (let i = 0; i < total; i++) {
    if (board1[i] === board2[i]) matching++;
  }
  return matching / total;
}

/**
 * Expand a FEN piece placement to a 64-char string (one char per square).
 * Empty squares are represented as '.'.
 */
function expandPlacement(placement: string): string {
  let result = '';
  for (const ch of placement) {
    if (ch === '/') continue;
    const n = parseInt(ch, 10);
    if (!isNaN(n)) {
      result += '.'.repeat(n);
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Find similar positions from historical games.
 * Returns matches sorted by similarity (highest first).
 */
export function findSimilarPositions(
  currentFen: string,
  currentGameId: string,
  allGames: GameRecord[],
  options: {
    minSimilarity?: number;
    maxResults?: number;
    requireNotes?: boolean;
  } = {},
): PositionMatch[] {
  const {
    minSimilarity = 0.85,
    maxResults = 5,
    requireNotes = false,
  } = options;

  const currentPlacement = piecePlacement(currentFen);
  const currentMaterial = materialSignature(currentPlacement);
  const matches: PositionMatch[] = [];

  for (const game of allGames) {
    if (game.id === currentGameId) continue;

    for (let i = 0; i < game.moves.length; i++) {
      const move = game.moves[i];
      if (!move.fen) continue;

      if (requireNotes && !move.noteDuring && !move.notePost) continue;

      // Quick material filter — skip if material count differs
      const movePlacement = piecePlacement(move.fen);
      const moveMaterial = materialSignature(movePlacement);
      if (currentMaterial !== moveMaterial) continue;

      // Exact piece placement match
      if (currentPlacement === movePlacement) {
        matches.push({
          gameId: game.id,
          gameDate: game.date,
          opponentName: game.opponentName,
          result: game.result,
          moveIndex: i,
          move,
          similarity: 1.0,
          matchType: 'exact_fen',
        });
        continue;
      }

      // Square-by-square similarity
      const sim = fenSimilarity(currentFen, move.fen);
      if (sim >= minSimilarity) {
        matches.push({
          gameId: game.id,
          gameDate: game.date,
          opponentName: game.opponentName,
          result: game.result,
          moveIndex: i,
          move,
          similarity: sim,
          matchType: 'piece_placement',
        });
      }
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);
  return matches.slice(0, maxResults);
}

/**
 * Find positions with the same move number and similar material balance.
 * Useful for finding "you always play X at move N" patterns.
 */
export function findMovePatternMatches(
  moveNumber: number,
  color: 'w' | 'b',
  san: string,
  currentGameId: string,
  allGames: GameRecord[],
  maxResults = 5,
): PositionMatch[] {
  const matches: PositionMatch[] = [];

  for (const game of allGames) {
    if (game.id === currentGameId) continue;

    for (let i = 0; i < game.moves.length; i++) {
      const move = game.moves[i];
      if (move.number !== moveNumber || move.color !== color) continue;
      if (move.san !== san) continue;

      // Same move at same point — check if there are notes
      if (!move.noteDuring && !move.notePost) continue;

      matches.push({
        gameId: game.id,
        gameDate: game.date,
        opponentName: game.opponentName,
        result: game.result,
        moveIndex: i,
        move,
        similarity: 1.0,
        matchType: 'move_pattern',
      });
    }
  }

  return matches.slice(0, maxResults);
}
