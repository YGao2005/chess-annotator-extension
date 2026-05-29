import type { GameRecord, WeeklyReviewData } from './types.js';
import { findMistakePatterns } from './mistakes.js';

/**
 * Compute weekly review data for a given week.
 */
export function computeWeeklyReview(games: GameRecord[], weekNumber?: number): WeeklyReviewData {
  const now = new Date();
  const wn = weekNumber ?? getISOWeek(now);
  const { start, end } = getWeekBounds(now.getFullYear(), wn);

  const weekGames = games.filter(g => {
    const d = new Date(g.date);
    return d >= start && d <= end;
  });

  const reviewed = weekGames.filter(g => g.reviewed);
  const withCpl = weekGames.filter(g => g.avgCpl !== undefined);
  const avgCpl = withCpl.length > 0
    ? withCpl.reduce((sum, g) => sum + g.avgCpl!, 0) / withCpl.length
    : 0;

  const blunders = weekGames.reduce((sum, g) => sum + (g.blunderCount ?? 0), 0);
  const mistakes = weekGames.reduce((sum, g) => sum + (g.mistakeCount ?? 0), 0);
  const violations = weekGames.reduce((sum, g) => sum + (g.protocolViolationCount ?? 0), 0);

  // Opening breakdown
  const openingMap = new Map<string, { games: number; wins: number }>();
  for (const g of weekGames) {
    const name = g.opening || 'Unknown';
    const entry = openingMap.get(name) ?? { games: 0, wins: 0 };
    entry.games++;
    if ((g.myColor === 'w' && g.result === '1-0') || (g.myColor === 'b' && g.result === '0-1')) {
      entry.wins++;
    }
    openingMap.set(name, entry);
  }

  const openingBreakdown = [...openingMap.entries()]
    .map(([name, data]) => ({ name, games: data.games, winRate: data.games > 0 ? data.wins / data.games : 0 }))
    .sort((a, b) => b.games - a.games);

  // Time management
  const allMyMoves = weekGames.flatMap(g => g.moves.filter(m => m.color === g.myColor));
  const avgTimePerMove = allMyMoves.length > 0
    ? allMyMoves.reduce((sum, m) => sum + m.timeSpentMs, 0) / allMyMoves.length
    : 0;
  const rushMoves = allMyMoves.filter(m => m.timeSpentMs > 0 && m.timeSpentMs < 5000).length;
  const timePressureMoves = allMyMoves.filter(m => m.clockRemainingMs > 0 && m.clockRemainingMs < 30000).length;

  // Rating
  const sortedGames = [...weekGames].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const startRating = sortedGames.length > 0 ? sortedGames[0].myRating : 0;
  const lastGame = sortedGames[sortedGames.length - 1];
  const endRating = lastGame ? lastGame.myRating + (lastGame.myRatingChange ?? 0) : startRating;

  // Mistake patterns from this week's games
  const patterns = findMistakePatterns(weekGames);

  return {
    weekNumber: wn,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    gamesPlayed: weekGames.length,
    gamesReviewed: reviewed.length,
    avgCpl,
    blunders,
    mistakes,
    protocolViolations: violations,
    openingBreakdown,
    topMistakePatterns: patterns.slice(0, 5),
    timeManagement: { avgTimePerMove, rushMoves, timePressureMoves },
    rating: { start: startRating, end: endRating, change: endRating - startRating },
  };
}

/**
 * Generate weekly review markdown.
 */
export function generateWeeklyMarkdown(data: WeeklyReviewData): string {
  const lines: string[] = [];

  lines.push(`# Weekly Review — Week ${data.weekNumber}`);
  lines.push('');
  lines.push(`*${data.startDate} to ${data.endDate}*`);
  lines.push('');

  // Q1: How many games did I play?
  lines.push('## 1. Volume');
  lines.push('');
  lines.push(`- **Games Played:** ${data.gamesPlayed}`);
  lines.push(`- **Games Reviewed:** ${data.gamesReviewed} (${data.gamesPlayed > 0 ? Math.round(data.gamesReviewed / data.gamesPlayed * 100) : 0}%)`);
  lines.push('');

  // Q2: How is my rating trending?
  lines.push('## 2. Rating');
  lines.push('');
  const changeSymbol = data.rating.change > 0 ? '+' : '';
  lines.push(`- **Start:** ${data.rating.start}`);
  lines.push(`- **End:** ${data.rating.end}`);
  lines.push(`- **Change:** ${changeSymbol}${data.rating.change}`);
  lines.push('');

  // Q3: What is my move quality?
  lines.push('## 3. Move Quality');
  lines.push('');
  lines.push(`- **Avg CPL:** ${data.avgCpl.toFixed(1)}`);
  lines.push(`- **Blunders:** ${data.blunders}`);
  lines.push(`- **Mistakes:** ${data.mistakes}`);
  lines.push(`- **Protocol Violations:** ${data.protocolViolations}`);
  lines.push('');

  // Q4: What openings did I play?
  lines.push('## 4. Openings');
  lines.push('');
  if (data.openingBreakdown.length > 0) {
    lines.push('| Opening | Games | Win Rate |');
    lines.push('|---------|-------|----------|');
    for (const o of data.openingBreakdown) {
      lines.push(`| ${o.name} | ${o.games} | ${(o.winRate * 100).toFixed(0)}% |`);
    }
  } else {
    lines.push('*No games this week*');
  }
  lines.push('');

  // Q5: How is my time management?
  lines.push('## 5. Time Management');
  lines.push('');
  lines.push(`- **Avg Time/Move:** ${(data.timeManagement.avgTimePerMove / 1000).toFixed(1)}s`);
  lines.push(`- **Rush Moves (<5s):** ${data.timeManagement.rushMoves}`);
  lines.push(`- **Time Pressure Moves (<30s clock):** ${data.timeManagement.timePressureMoves}`);
  lines.push('');

  // Q6: What recurring mistakes do I see?
  lines.push('## 6. Recurring Mistakes');
  lines.push('');
  if (data.topMistakePatterns.length > 0) {
    for (const p of data.topMistakePatterns) {
      lines.push(`- **${p.description}** — ${p.frequency} games, ${p.moveRange}`);
      if (p.notes.length > 0) {
        lines.push(`  > ${p.notes[0]}`);
      }
    }
  } else {
    lines.push('*No recurring patterns detected this week*');
  }
  lines.push('');

  // Q7: What should I focus on next week?
  lines.push('## 7. Focus for Next Week');
  lines.push('');
  const focusItems = generateFocusItems(data);
  for (const item of focusItems) {
    lines.push(`- ${item}`);
  }
  lines.push('');

  lines.push('---');
  lines.push(`*Generated: ${new Date().toISOString()}*`);

  return lines.join('\n');
}

function generateFocusItems(data: WeeklyReviewData): string[] {
  const items: string[] = [];

  if (data.gamesReviewed < data.gamesPlayed) {
    const unreviewedCount = data.gamesPlayed - data.gamesReviewed;
    items.push(`Review ${unreviewedCount} unreviewed game(s)`);
  }

  if (data.protocolViolations > 0) {
    items.push(`Reduce protocol violations (${data.protocolViolations} this week)`);
  }

  if (data.timeManagement.rushMoves > 5) {
    items.push(`Slow down — ${data.timeManagement.rushMoves} moves played under 5 seconds`);
  }

  if (data.blunders > 3) {
    items.push(`Address blunder rate (${data.blunders} blunders this week)`);
  }

  if (data.topMistakePatterns.length > 0) {
    const top = data.topMistakePatterns[0];
    items.push(`Study pattern: ${top.description}`);
  }

  if (items.length === 0) {
    items.push('Keep playing and annotating games consistently');
  }

  return items;
}

function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getWeekBounds(year: number, week: number): { start: Date; end: Date } {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4.getTime());
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  const sunday = new Date(monday.getTime());
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}
