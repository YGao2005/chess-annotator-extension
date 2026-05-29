import type { GameRecord, MistakePattern, MoveRecord } from './types.js';
import { findMistakePatterns } from './mistakes.js';

const CHECKLIST_LABELS = [
  'Checks', 'Captures', 'Threats', 'Opponent plan',
  'My plan', 'Calculate lines', 'Evaluate position',
] as const;

/**
 * Convert a raw game into a full Chess Bible game-log markdown file.
 * Formats Pass 1 (live) and Pass 2 (post-game) annotations into a template.
 */
export function gameToChessBible(game: GameRecord, allPatterns?: MistakePattern[]): string {
  const lines: string[] = [];
  const isWhite = game.myColor === 'w';
  const playerSide = isWhite ? 'White' : 'Black';
  const whitePlayer = isWhite ? 'You' : game.opponentName;
  const blackPlayer = isWhite ? game.opponentName : 'You';

  // Title
  lines.push(`# ${whitePlayer} vs ${blackPlayer}`);
  lines.push(`## ${game.date.slice(0, 10)} | ${formatResult(game)} | ${game.timeControl} ${game.timeControlType}`);
  lines.push('');

  // Metadata block
  lines.push('```yaml');
  lines.push(`id: ${game.id}`);
  lines.push(`date: ${game.date.slice(0, 10)}`);
  lines.push(`result: ${game.result} (${game.resultBy})`);
  lines.push(`color: ${playerSide}`);
  lines.push(`rating: ${game.myRating}${game.myRatingChange ? ` → ${game.myRating + game.myRatingChange} (${game.myRatingChange > 0 ? '+' : ''}${game.myRatingChange})` : ''}`);
  lines.push(`opponent: ${game.opponentName} (${game.opponentRating})`);
  lines.push(`opening: ${game.opening || 'Unknown'}${game.openingEco ? ` [${game.openingEco}]` : ''}`);
  if (game.openingVariation) lines.push(`variation: ${game.openingVariation}`);
  lines.push(`time_control: ${game.timeControl} (${game.timeControlType})`);
  if (game.avgCpl !== undefined) lines.push(`avg_cpl: ${game.avgCpl.toFixed(1)}`);
  if (game.blunderCount !== undefined) lines.push(`blunders: ${game.blunderCount}`);
  if (game.protocolViolationCount !== undefined) lines.push(`protocol_violations: ${game.protocolViolationCount}`);
  lines.push('```');
  lines.push('');

  // Pre-engine impression (Pass 1 gut check)
  lines.push('## Pre-Engine Impression');
  lines.push('');
  if (game.impressionPre) {
    lines.push(`> ${game.impressionPre.replace(/\n/g, '\n> ')}`);
  } else {
    lines.push('*No pre-engine impression recorded.*');
  }
  lines.push('');

  // Annotated Moves (Pass 1 + Pass 2 combined)
  lines.push('## Annotated Moves');
  lines.push('');

  const myMoves = game.moves.filter(m => m.color === game.myColor);
  const annotated = myMoves.filter(m =>
    m.noteDuring || m.notePost || m.tags.length > 0 ||
    m.certainty !== null || m.checklist.some(Boolean)
  );

  if (annotated.length > 0) {
    for (const move of annotated) {
      lines.push(formatBibleMove(move));
      lines.push('');
    }
  } else {
    lines.push('*No moves were annotated during this game.*');
    lines.push('');
  }

  // Move list
  lines.push('## Full Move List');
  lines.push('');
  lines.push(formatMoveList(game.moves));
  lines.push('');

  // Phase breakdown
  if (game.avgTimePerPhase) {
    lines.push('## Time Breakdown');
    lines.push('');
    lines.push(`- **Opening (1–10):** ${(game.avgTimePerPhase.opening / 1000).toFixed(1)}s avg`);
    lines.push(`- **Middlegame (11–30):** ${(game.avgTimePerPhase.middlegame / 1000).toFixed(1)}s avg`);
    lines.push(`- **Endgame (30+):** ${(game.avgTimePerPhase.endgame / 1000).toFixed(1)}s avg`);
    if (game.rushThresholdMove) {
      lines.push(`- **Rush threshold:** Move ${game.rushThresholdMove}`);
    }
    lines.push('');
  }

  // Main Lesson
  lines.push('## Main Lesson');
  lines.push('');
  if (game.mainLesson) {
    lines.push(`> ${game.mainLesson.replace(/\n/g, '\n> ')}`);
  } else {
    lines.push('*No main lesson recorded.*');
  }
  lines.push('');

  // Post-Engine Impression (Pass 2)
  lines.push('## Post-Engine Impression');
  lines.push('');
  if (game.impressionPost) {
    lines.push(`> ${game.impressionPost.replace(/\n/g, '\n> ')}`);
  } else {
    lines.push('*No post-engine impression recorded.*');
  }
  lines.push('');

  // Linked Mistake Database Entries
  if (allPatterns && allPatterns.length > 0) {
    const relatedPatterns = allPatterns.filter(p => p.gameIds.includes(game.id));
    if (relatedPatterns.length > 0) {
      lines.push('## Related Patterns');
      lines.push('');
      for (const p of relatedPatterns) {
        lines.push(`- **${p.description}** — ${p.frequency} games, ${p.moveRange}`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push(`*Game Bible entry generated: ${new Date().toISOString()}*`);

  return lines.join('\n');
}

/**
 * Generate Bible entries for all games.
 */
export function generateAllBibleEntries(games: GameRecord[]): Map<string, string> {
  const patterns = findMistakePatterns(games);
  const entries = new Map<string, string>();

  for (const game of games) {
    const filename = formatBibleFilename(game);
    entries.set(filename, gameToChessBible(game, patterns));
  }

  return entries;
}

function formatBibleMove(move: MoveRecord): string {
  const parts: string[] = [];
  const moveLabel = `**${move.number}${move.color === 'b' ? '...' : '.'} ${move.san}**`;
  const time = `⏱ ${(move.timeSpentMs / 1000).toFixed(1)}s`;
  const clock = `🕐 ${formatClock(move.clockRemainingMs)}`;

  let header = `### ${moveLabel} ${time} ${clock}`;

  if (move.tags.length > 0) {
    header += ` | ${move.tags.map(t => `\`${t}\``).join(' ')}`;
  }
  if (move.certainty) {
    header += ` | ${'★'.repeat(move.certainty)}${'☆'.repeat(5 - move.certainty)}`;
  }

  parts.push(header);

  // Protocol checklist
  const checkCount = move.checklist.filter(Boolean).length;
  if (checkCount > 0) {
    const items = move.checklist
      .map((checked, i) => `${checked ? '✅' : '⬜'} ${CHECKLIST_LABELS[i]}`)
      .join(' | ');
    parts.push(`Protocol (${checkCount}/7): ${items}`);
  }

  // Pass 1: During-game notes
  if (move.noteDuring) {
    parts.push('');
    parts.push('**Pass 1 (Live):**');
    parts.push(`> ${move.noteDuring}`);
  }

  // Pass 2: Post-game notes
  if (move.notePost) {
    parts.push('');
    parts.push('**Pass 2 (Review):**');
    parts.push(`> ${move.notePost}`);
  }

  // Engine data
  if (move.engineEval !== undefined) {
    const evalStr = move.evalType === 'mate' ? `M${move.engineEval}` : `${(move.engineEval / 100).toFixed(2)}`;
    let engineLine = `**Engine:** eval ${evalStr}`;
    if (move.cpl !== undefined) engineLine += ` | CPL ${move.cpl}`;
    if (move.bestMove) engineLine += ` | best: ${move.bestMove}`;
    if (move.engineClassification) engineLine += ` | ${move.engineClassification}`;
    parts.push(engineLine);
  }

  // Auto-tag status
  if (move.autoTags && move.autoTags.length > 0) {
    const autoInfo = move.autoTags
      .map(at => `${at.tag} (${at.status}: ${at.reason})`)
      .join(', ');
    parts.push(`*Auto-tags: ${autoInfo}*`);
  }

  return parts.join('\n');
}

function formatMoveList(moves: MoveRecord[]): string {
  const parts: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i];
    const black = moves[i + 1];
    let text = `${white.number}. ${white.san}`;
    if (black) text += ` ${black.san}`;
    parts.push(text);
  }
  return parts.join(' ');
}

function formatResult(game: GameRecord): string {
  const isWhite = game.myColor === 'w';
  const won = (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
  const lost = (isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0');
  if (won) return `Win (${game.resultBy})`;
  if (lost) return `Loss (${game.resultBy})`;
  return `Draw (${game.resultBy})`;
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatBibleFilename(game: GameRecord): string {
  const date = game.date.slice(0, 10);
  const opponent = game.opponentName.replace(/[^a-zA-Z0-9]/g, '_');
  const result = game.result.replace(/\//g, '-');
  return `${date}_vs_${opponent}_${result}.md`;
}
