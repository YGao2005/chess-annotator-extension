import type { GameRecord, MoveRecord } from '@/shared/types';
import { CHECKLIST_LABELS } from '@/shared/types';

export function gameToMarkdown(game: GameRecord): string {
  const lines: string[] = [];

  // Header
  const whitePlayer = game.myColor === 'w' ? 'You' : game.opponentName;
  const blackPlayer = game.myColor === 'b' ? 'You' : game.opponentName;
  lines.push(`# Game: ${whitePlayer} vs ${blackPlayer} — ${game.date.slice(0, 10)}`);
  lines.push('');

  // Metadata
  lines.push(`**Result:** ${game.result} (${game.resultBy})`);
  lines.push(`**Time Control:** ${formatTimeControl(game.timeControl)} (${game.timeControlType})`);
  lines.push(`**Opening:** ${game.opening}${game.openingEco ? ` (${game.openingEco})` : ''}`);
  if (game.openingVariation) {
    lines.push(`**Variation:** ${game.openingVariation}`);
  }
  const ratingChange = game.myRatingChange
    ? ` → ${game.myRating + game.myRatingChange} (${game.myRatingChange > 0 ? '+' : ''}${game.myRatingChange})`
    : '';
  lines.push(`**My Rating:** ${game.myRating}${ratingChange}`);
  lines.push(`**Opponent:** ${game.opponentName} (${game.opponentRating})`);
  lines.push(`**Color:** ${game.myColor === 'w' ? 'White' : 'Black'}`);
  lines.push('');

  // Aggregates
  if (game.avgCpl !== undefined || game.blunderCount !== undefined) {
    lines.push('## Stats');
    if (game.avgCpl !== undefined) lines.push(`- **Avg CPL:** ${game.avgCpl.toFixed(1)}`);
    if (game.blunderCount !== undefined) lines.push(`- **Blunders:** ${game.blunderCount}`);
    if (game.mistakeCount !== undefined) lines.push(`- **Mistakes:** ${game.mistakeCount}`);
    if (game.inaccuracyCount !== undefined) lines.push(`- **Inaccuracies:** ${game.inaccuracyCount}`);
    if (game.protocolViolationCount !== undefined) lines.push(`- **Protocol Violations:** ${game.protocolViolationCount}`);
    if (game.rushThresholdMove !== undefined) lines.push(`- **Rush Threshold:** Move ${game.rushThresholdMove}`);
    if (game.avgTimePerPhase) {
      lines.push(`- **Avg Time (Opening):** ${(game.avgTimePerPhase.opening / 1000).toFixed(1)}s`);
      lines.push(`- **Avg Time (Middlegame):** ${(game.avgTimePerPhase.middlegame / 1000).toFixed(1)}s`);
      lines.push(`- **Avg Time (Endgame):** ${(game.avgTimePerPhase.endgame / 1000).toFixed(1)}s`);
    }
    lines.push('');
  }

  // Time Analytics
  const myMoves = game.moves.filter(m => m.color === game.myColor);
  if (myMoves.length > 0) {
    const fastMoves = myMoves.filter(m => m.timeSpentMs > 0 && m.timeSpentMs < 5000);
    const autoSkipped = game.moves.filter(m => m.tags.includes('possible_protocol_skip'));
    const timePressured = game.moves.filter(m => m.color === game.myColor && m.tags.includes('time_pressure'));
    
    if (fastMoves.length > 0 || autoSkipped.length > 0 || timePressured.length > 0) {
      lines.push('## Time Analytics');
      lines.push(`- **Moves under 5s:** ${fastMoves.length}/${myMoves.length}`);
      if (autoSkipped.length > 0) {
        lines.push(`- **Auto-flagged protocol skips:** ${autoSkipped.length} (moves: ${autoSkipped.map(m => m.number).join(', ')})`);
      }
      if (timePressured.length > 0) {
        lines.push(`- **Time pressure moves (<30s):** ${timePressured.length} (moves: ${timePressured.map(m => m.number).join(', ')})`);
      }
      lines.push('');
    }
  }

  // Pre-engine impression
  if (game.impressionPre) {
    lines.push('## Pre-Engine Impression');
    lines.push(`> ${game.impressionPre.replace(/\n/g, '\n> ')}`);
    lines.push('');
  }

  // Annotated moves
  const annotatedMoves = game.moves.filter(
    m => m.noteDuring || m.notePost || m.tags.length > 0 || m.certainty !== null,
  );

  if (annotatedMoves.length > 0) {
    lines.push('## Annotated Moves');
    lines.push('');

    for (const move of annotatedMoves) {
      lines.push(formatMoveAnnotation(move));
      lines.push('');
    }
  }

  // Full move list
  lines.push('## Moves');
  lines.push('');
  lines.push(formatMoveList(game.moves));
  lines.push('');

  // Main lesson
  if (game.mainLesson) {
    lines.push('## Main Lesson');
    lines.push(`> ${game.mainLesson.replace(/\n/g, '\n> ')}`);
    lines.push('');
  }

  // Post-engine impression
  if (game.impressionPost) {
    lines.push('## Post-Engine Impression');
    lines.push(`> ${game.impressionPost.replace(/\n/g, '\n> ')}`);
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Game ID: ${game.id} | Exported: ${new Date().toISOString()}*`);

  return lines.join('\n');
}

function formatMoveAnnotation(move: MoveRecord): string {
  const lines: string[] = [];

  const timeStr = `${(move.timeSpentMs / 1000).toFixed(1)}s`;
  const certaintyStr = move.certainty ? '★'.repeat(move.certainty) + '☆'.repeat(5 - move.certainty) : '';
  const tagsStr = move.tags.length > 0 ? move.tags.map(t => `\`${t}\``).join(' ') : '';

  let header = `### Move ${move.number}${move.color === 'b' ? '...' : '.'} ${move.san}`;
  header += ` ⏱ ${timeStr}`;
  if (certaintyStr) header += ` | ${certaintyStr}`;
  if (tagsStr) header += ` | ${tagsStr}`;
  lines.push(header);

  // Checklist
  const checkCount = move.checklist.filter(Boolean).length;
  if (checkCount > 0) {
    const checkStr = move.checklist
      .map((checked, i) => `${checked ? '☑' : '☐'} ${CHECKLIST_LABELS[i]}`)
      .join(', ');
    lines.push(`**Protocol:** ${checkStr} (${checkCount}/7)`);
  }

  // Notes
  if (move.noteDuring) {
    lines.push(`> **During:** ${move.noteDuring}`);
  }
  if (move.notePost) {
    lines.push(`> **After:** ${move.notePost}`);
  }

  // Engine data
  if (move.engineEval !== undefined) {
    const evalStr = move.evalType === 'mate' ? `M${move.engineEval}` : `${(move.engineEval / 100).toFixed(2)}`;
    let engineLine = `**Engine:** ${evalStr}`;
    if (move.cpl !== undefined) engineLine += ` | CPL: ${move.cpl}`;
    if (move.bestMove) engineLine += ` | Best: ${move.bestMove}`;
    lines.push(engineLine);
  }

  return lines.join('\n');
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

function formatTimeControl(tc: string): string {
  const parts = tc.split('+');
  const base = parseInt(parts[0], 10);
  const inc = parts.length > 1 ? parseInt(parts[1], 10) : 0;

  if (base >= 60) {
    const minutes = Math.floor(base / 60);
    if (inc > 0) return `${minutes}+${inc}`;
    return `${minutes} min`;
  }

  if (inc > 0) return `${base}+${inc}`;
  return `${base}s`;
}

export function downloadMarkdown(game: GameRecord): void {
  const content = gameToMarkdown(game);
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const date = game.date.slice(0, 10);
  const opponent = game.opponentName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${date}_vs_${opponent}_${game.id}.md`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
