import type { GameRecord, MistakePattern, MoveTag } from './types.js';

const ERROR_TAGS: MoveTag[] = ['blunder', 'mistake', 'inaccuracy', 'no_plan', 'protocol_skip', 'possible_protocol_skip'];

/**
 * Scan games for recurring mistake patterns.
 * Groups by tag type and move range, clusters similar notes.
 */
export function findMistakePatterns(games: GameRecord[]): MistakePattern[] {
  const buckets = new Map<string, {
    tags: Set<MoveTag>;
    moveNumbers: number[];
    gameIds: Set<string>;
    notes: string[];
    dates: string[];
  }>();

  for (const game of games) {
    const myMoves = game.moves.filter(m => m.color === game.myColor);

    for (const move of myMoves) {
      const errorTags = move.tags.filter(t => ERROR_TAGS.includes(t));
      if (errorTags.length === 0) continue;

      const phase = getPhase(move.number);
      const tagKey = errorTags.sort().join('+');
      const bucketKey = `${tagKey}:${phase}`;

      let bucket = buckets.get(bucketKey);
      if (!bucket) {
        bucket = { tags: new Set(), moveNumbers: [], gameIds: new Set(), notes: [], dates: [] };
        buckets.set(bucketKey, bucket);
      }

      for (const t of errorTags) bucket.tags.add(t);
      bucket.moveNumbers.push(move.number);
      bucket.gameIds.add(game.id);
      bucket.dates.push(game.date);

      if (move.noteDuring) bucket.notes.push(move.noteDuring);
      if (move.notePost) bucket.notes.push(move.notePost);
    }
  }

  const patterns: MistakePattern[] = [];
  let idCounter = 0;

  for (const [key, bucket] of buckets) {
    if (bucket.gameIds.size < 2) continue;

    const tags = [...bucket.tags] as MoveTag[];
    const moveNums = bucket.moveNumbers;
    const minMove = Math.min(...moveNums);
    const maxMove = Math.max(...moveNums);
    const phase = getPhase(Math.round((minMove + maxMove) / 2));

    const description = buildDescription(tags, phase, minMove, maxMove, bucket.notes);

    patterns.push({
      id: `pattern-${++idCounter}`,
      description,
      frequency: bucket.gameIds.size,
      lastSeen: bucket.dates.sort().reverse()[0],
      moveRange: minMove === maxMove ? `move ${minMove}` : `moves ${minMove}–${maxMove}`,
      tags,
      gameIds: [...bucket.gameIds],
      notes: deduplicateNotes(bucket.notes),
    });
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Generate mistake-database.md content.
 */
export function generateMistakeMarkdown(patterns: MistakePattern[]): string {
  const lines: string[] = [];

  lines.push('# Mistake Database');
  lines.push('');
  lines.push(`*Last updated: ${new Date().toISOString().slice(0, 10)}*`);
  lines.push(`*${patterns.length} recurring patterns identified*`);
  lines.push('');

  if (patterns.length === 0) {
    lines.push('No recurring mistake patterns found yet. Play and annotate more games!');
    return lines.join('\n');
  }

  lines.push('## Summary');
  lines.push('');
  lines.push('| # | Pattern | Frequency | Move Range | Last Seen |');
  lines.push('|---|---------|-----------|------------|-----------|');
  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i];
    lines.push(`| ${i + 1} | ${truncate(p.description, 50)} | ${p.frequency} games | ${p.moveRange} | ${p.lastSeen.slice(0, 10)} |`);
  }
  lines.push('');

  lines.push('## Detailed Patterns');
  lines.push('');

  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i];
    lines.push(`### ${i + 1}. ${p.description}`);
    lines.push('');
    lines.push(`- **Frequency:** ${p.frequency} games`);
    lines.push(`- **Move Range:** ${p.moveRange}`);
    lines.push(`- **Tags:** ${p.tags.map(t => `\`${t}\``).join(', ')}`);
    lines.push(`- **Last Seen:** ${p.lastSeen.slice(0, 10)}`);
    lines.push(`- **Games:** ${p.gameIds.map(id => `\`${id}\``).join(', ')}`);

    if (p.notes.length > 0) {
      lines.push('');
      lines.push('**Your notes:**');
      for (const note of p.notes.slice(0, 5)) {
        lines.push(`> ${note}`);
      }
      if (p.notes.length > 5) {
        lines.push(`> *(${p.notes.length - 5} more notes...)*`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function getPhase(moveNumber: number): string {
  if (moveNumber <= 10) return 'opening';
  if (moveNumber <= 30) return 'middlegame';
  return 'endgame';
}

function buildDescription(tags: MoveTag[], phase: string, minMove: number, maxMove: number, notes: string[]): string {
  const tagStr = tags.join('/');
  const rangeStr = minMove === maxMove ? `move ${minMove}` : `moves ${minMove}–${maxMove}`;

  // Try to extract a theme from notes
  const theme = extractTheme(notes);
  if (theme) {
    return `${tagStr} in ${phase} (${rangeStr}): ${theme}`;
  }

  return `${tagStr} clustering in ${phase} around ${rangeStr}`;
}

function extractTheme(notes: string[]): string | null {
  if (notes.length === 0) return null;

  // Simple keyword extraction
  const keywords = new Map<string, number>();
  const stopWords = new Set(['the', 'a', 'an', 'is', 'was', 'i', 'my', 'this', 'that', 'to', 'of', 'in', 'and', 'or', 'but', 'not', 'on', 'it', 'for', 'with']);

  for (const note of notes) {
    const words = note.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    for (const word of words) {
      keywords.set(word, (keywords.get(word) ?? 0) + 1);
    }
  }

  const sorted = [...keywords.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] >= 2) {
    return sorted.slice(0, 3).map(([w]) => w).join(', ');
  }

  return null;
}

function deduplicateNotes(notes: string[]): string[] {
  return [...new Set(notes)];
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 3) + '...';
}
