import type { GameRecord } from '@/shared/types';
import { PONZIANI_TREE, PONZIANI_SIGNATURE, type PrepNode } from './ponziani';

// ===== Opening aggregation =====

export interface OpeningStats {
  name: string;
  eco: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  asWhite: { total: number; wins: number; losses: number; draws: number };
  asBlack: { total: number; wins: number; losses: number; draws: number };
}

export function aggregateOpenings(games: GameRecord[]): OpeningStats[] {
  const map = new Map<string, OpeningStats>();

  for (const game of games) {
    const key = game.opening || 'Unknown';
    let stats = map.get(key);
    if (!stats) {
      stats = {
        name: key,
        eco: game.openingEco || '',
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        asWhite: { total: 0, wins: 0, losses: 0, draws: 0 },
        asBlack: { total: 0, wins: 0, losses: 0, draws: 0 },
      };
      map.set(key, stats);
    }

    stats.total++;
    const won = didWin(game);
    const drew = game.result === '1/2-1/2';
    if (won) stats.wins++;
    else if (drew) stats.draws++;
    else stats.losses++;

    const side = game.myColor === 'w' ? stats.asWhite : stats.asBlack;
    side.total++;
    if (won) side.wins++;
    else if (drew) side.draws++;
    else side.losses++;
  }

  for (const stats of map.values()) {
    stats.winRate = stats.total > 0 ? stats.wins / stats.total : 0;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function didWin(game: GameRecord): boolean {
  return (
    (game.myColor === 'w' && game.result === '1-0') ||
    (game.myColor === 'b' && game.result === '0-1')
  );
}

// ===== Ponziani detection =====

export interface PonzianiMatch {
  game: GameRecord;
  variationName: string;
  matchDepth: number;
  deviationPly: number | null;
  deviatedBy: 'player' | 'opponent' | null;
  deviationMove: string | null;
  expectedMoves: string[];
}

/**
 * Check if a game is a Ponziani by matching the opening name
 * OR by checking the first 5 half-moves against the signature.
 */
export function isPonziani(game: GameRecord): boolean {
  if (game.opening.toLowerCase().includes('ponziani')) return true;

  const sans = game.moves.map(m => m.san);
  if (sans.length < PONZIANI_SIGNATURE.length) return false;

  for (let i = 0; i < PONZIANI_SIGNATURE.length; i++) {
    if (sans[i] !== PONZIANI_SIGNATURE[i]) return false;
  }
  return true;
}

/**
 * Walk the game moves through the Ponziani prep tree.
 * Returns the deepest matching variation name and the ply where deviation occurred.
 */
export function matchPonzianiLine(game: GameRecord): PonzianiMatch {
  const sans = game.moves.map(m => m.san);
  let node: PrepNode = PONZIANI_TREE;
  let deepestName = 'Ponziani Opening';
  let matchDepth = 0;

  for (let ply = 0; ply < sans.length; ply++) {
    const child = node.children.find(c => c.move === sans[ply]);
    if (!child) {
      // Deviation found
      const expectedMoves = node.children.map(c => c.move);
      const plyColor = ply % 2 === 0 ? 'w' : 'b';
      const deviatedBy = plyColor === game.myColor ? 'player' : 'opponent';

      return {
        game,
        variationName: deepestName,
        matchDepth,
        deviationPly: ply,
        deviatedBy,
        deviationMove: sans[ply],
        expectedMoves,
      };
    }

    matchDepth = ply + 1;
    if (child.name) deepestName = child.name;
    node = child;
  }

  // Full match — no deviation (game followed prep to the end of known lines)
  return {
    game,
    variationName: deepestName,
    matchDepth,
    deviationPly: null,
    deviatedBy: null,
    deviationMove: null,
    expectedMoves: node.children.map(c => c.move),
  };
}

/** Get all Ponziani games with their match analysis. */
export function analyzePonzianiGames(games: GameRecord[]): PonzianiMatch[] {
  return games.filter(isPonziani).map(matchPonzianiLine);
}

// ===== Variation stats =====

export interface VariationStats {
  name: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  deviations: number;
  playerDeviations: number;
  opponentDeviations: number;
}

export function aggregatePonzianiVariations(matches: PonzianiMatch[]): VariationStats[] {
  const map = new Map<string, VariationStats>();

  for (const match of matches) {
    const key = match.variationName;
    let stats = map.get(key);
    if (!stats) {
      stats = {
        name: key,
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        deviations: 0,
        playerDeviations: 0,
        opponentDeviations: 0,
      };
      map.set(key, stats);
    }

    stats.total++;
    const won = didWin(match.game);
    const drew = match.game.result === '1/2-1/2';
    if (won) stats.wins++;
    else if (drew) stats.draws++;
    else stats.losses++;

    if (match.deviationPly !== null) {
      stats.deviations++;
      if (match.deviatedBy === 'player') stats.playerDeviations++;
      else stats.opponentDeviations++;
    }
  }

  for (const stats of map.values()) {
    stats.winRate = stats.total > 0 ? stats.wins / stats.total : 0;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
