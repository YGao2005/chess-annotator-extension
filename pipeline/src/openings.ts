import type { GameRecord, OpeningPosition } from './types.js';

/**
 * Build a personal opening tree from all games.
 * Tracks positions reached, time spent, results, and notes.
 */
export function buildOpeningTree(games: GameRecord[]): Map<string, OpeningPosition> {
  const tree = new Map<string, OpeningPosition>();

  for (const game of games) {
    const isWhite = game.myColor === 'w';
    const openingMoves = game.moves.slice(0, 20);

    for (let i = 0; i < openingMoves.length; i++) {
      const move = openingMoves[i];
      if (!move.fen) continue;

      const fen = move.fen.split(' ').slice(0, 4).join(' ');

      let pos = tree.get(fen);
      if (!pos) {
        pos = {
          fen: move.fen,
          moveNumber: move.number,
          timesReached: 0,
          avgTimeSpent: 0,
          results: { wins: 0, draws: 0, losses: 0 },
          notes: [],
          questions: [],
        };
        tree.set(fen, pos);
      }

      pos.timesReached++;
      pos.avgTimeSpent = pos.avgTimeSpent + (move.timeSpentMs - pos.avgTimeSpent) / pos.timesReached;

      // Track results
      const won = (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
      const lost = (isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0');
      if (won) pos.results.wins++;
      else if (lost) pos.results.losses++;
      else pos.results.draws++;

      // Collect notes
      if (move.noteDuring) pos.notes.push(move.noteDuring);
      if (move.notePost) pos.notes.push(move.notePost);
    }
  }

  // Deduplicate notes
  for (const pos of tree.values()) {
    pos.notes = [...new Set(pos.notes)];
  }

  return tree;
}

/**
 * Find positions where the player struggles most.
 */
export function findStrugglingPositions(tree: Map<string, OpeningPosition>, minGames = 2): OpeningPosition[] {
  const positions = [...tree.values()]
    .filter(p => p.timesReached >= minGames);

  return positions
    .map(p => {
      const total = p.results.wins + p.results.draws + p.results.losses;
      const winRate = total > 0 ? p.results.wins / total : 0;
      return { pos: p, winRate, total };
    })
    .filter(({ winRate }) => winRate < 0.5)
    .sort((a, b) => a.winRate - b.winRate)
    .map(({ pos }) => pos);
}

/**
 * Find positions where the most time is spent (potential confusion points).
 */
export function findSlowPositions(tree: Map<string, OpeningPosition>, minGames = 2): OpeningPosition[] {
  return [...tree.values()]
    .filter(p => p.timesReached >= minGames)
    .sort((a, b) => b.avgTimeSpent - a.avgTimeSpent)
    .slice(0, 10);
}

/**
 * Generate opening prep markdown.
 */
export function generateOpeningMarkdown(games: GameRecord[]): string {
  const tree = buildOpeningTree(games);
  const lines: string[] = [];

  lines.push('# Opening Prep Analysis');
  lines.push('');
  lines.push(`*Last updated: ${new Date().toISOString().slice(0, 10)}*`);
  lines.push(`*${tree.size} unique positions tracked across ${games.length} games*`);
  lines.push('');

  // Opening repertoire summary
  const openingCounts = new Map<string, { games: number; wins: number; draws: number; losses: number }>();
  for (const game of games) {
    const name = game.opening || 'Unknown';
    const entry = openingCounts.get(name) ?? { games: 0, wins: 0, draws: 0, losses: 0 };
    entry.games++;
    const isWhite = game.myColor === 'w';
    const won = (isWhite && game.result === '1-0') || (!isWhite && game.result === '0-1');
    const lost = (isWhite && game.result === '0-1') || (!isWhite && game.result === '1-0');
    if (won) entry.wins++;
    else if (lost) entry.losses++;
    else entry.draws++;
    openingCounts.set(name, entry);
  }

  lines.push('## Repertoire');
  lines.push('');
  lines.push('| Opening | Games | W | D | L | Win% |');
  lines.push('|---------|-------|---|---|---|------|');
  const sorted = [...openingCounts.entries()].sort((a, b) => b[1].games - a[1].games);
  for (const [name, data] of sorted) {
    const winRate = data.games > 0 ? (data.wins / data.games * 100).toFixed(0) : '0';
    lines.push(`| ${name} | ${data.games} | ${data.wins} | ${data.draws} | ${data.losses} | ${winRate}% |`);
  }
  lines.push('');

  // Struggling positions
  const struggling = findStrugglingPositions(tree);
  if (struggling.length > 0) {
    lines.push('## Positions to Study');
    lines.push('');
    lines.push('*Positions where you consistently struggle (< 50% win rate):*');
    lines.push('');
    for (const pos of struggling.slice(0, 10)) {
      const total = pos.results.wins + pos.results.draws + pos.results.losses;
      const winRate = total > 0 ? (pos.results.wins / total * 100).toFixed(0) : '0';
      lines.push(`### Move ${pos.moveNumber} (reached ${pos.timesReached}x, ${winRate}% win rate)`);
      lines.push('');
      lines.push(`**FEN:** \`${pos.fen}\``);
      lines.push(`**Avg time spent:** ${(pos.avgTimeSpent / 1000).toFixed(1)}s`);
      lines.push(`**Record:** W${pos.results.wins} D${pos.results.draws} L${pos.results.losses}`);

      if (pos.notes.length > 0) {
        lines.push('');
        lines.push('**Your notes:**');
        for (const note of pos.notes.slice(0, 3)) {
          lines.push(`> ${note}`);
        }
      }

      // Generate study questions
      const questions = generateStudyQuestions(pos);
      if (questions.length > 0) {
        lines.push('');
        lines.push('**Questions to explore:**');
        for (const q of questions) {
          lines.push(`- ${q}`);
        }
      }
      lines.push('');
    }
  }

  // Slow positions
  const slow = findSlowPositions(tree);
  if (slow.length > 0) {
    lines.push('## Slowest Positions (decision fatigue)');
    lines.push('');
    lines.push('*Positions where you spend the most time — potential confusion points:*');
    lines.push('');
    lines.push('| Move | Avg Time | Times Reached | Win% |');
    lines.push('|------|----------|---------------|------|');
    for (const pos of slow) {
      const total = pos.results.wins + pos.results.draws + pos.results.losses;
      const winRate = total > 0 ? (pos.results.wins / total * 100).toFixed(0) : '0';
      lines.push(`| ${pos.moveNumber} | ${(pos.avgTimeSpent / 1000).toFixed(1)}s | ${pos.timesReached} | ${winRate}% |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateStudyQuestions(pos: OpeningPosition): string[] {
  const questions: string[] = [];
  const total = pos.results.wins + pos.results.draws + pos.results.losses;
  const winRate = total > 0 ? pos.results.wins / total : 0;

  if (winRate < 0.3 && total >= 3) {
    questions.push('What is the critical idea in this position that you keep missing?');
  }
  if (pos.avgTimeSpent > 30000) {
    questions.push('Why do you hesitate here? Is there a concrete plan you can prepare?');
  }
  if (pos.results.losses > pos.results.wins) {
    questions.push('What do your opponents play here that gives you trouble?');
  }
  if (pos.notes.length === 0) {
    questions.push('Start annotating this position — what is your plan?');
  }

  return questions;
}
