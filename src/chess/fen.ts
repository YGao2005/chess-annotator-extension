import { Chess } from 'chess.js';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

export function computeFenFromMoves(sans: string[]): string {
  const chess = new Chess();
  for (const san of sans) {
    const result = chess.move(san);
    if (!result) {
      console.warn(`[ChessAnnotation] Invalid move: ${san} in position ${chess.fen()}`);
      return chess.fen();
    }
  }
  return chess.fen();
}

export function computeAllFens(sans: string[]): string[] {
  const chess = new Chess();
  const fens: string[] = [];

  for (const san of sans) {
    const result = chess.move(san);
    if (!result) {
      console.warn(`[ChessAnnotation] Invalid move: ${san} in position ${chess.fen()}`);
      break;
    }
    fens.push(chess.fen());
  }

  return fens;
}

export function validateSan(san: string, fen?: string): boolean {
  const chess = fen ? new Chess(fen) : new Chess();
  try {
    return chess.move(san) !== null;
  } catch {
    return false;
  }
}

export { STARTING_FEN };
