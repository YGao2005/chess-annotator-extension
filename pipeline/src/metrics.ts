import type { GameRecord, MetricsData } from './types.js';

/**
 * Compute aggregate metrics across all games.
 */
export function computeMetrics(games: GameRecord[]): MetricsData {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const gamesThisWeek = games.filter(g => new Date(g.date) >= weekAgo);
  const reviewed = games.filter(g => g.reviewed);
  const reviewedThisWeek = gamesThisWeek.filter(g => g.reviewed);

  const withCpl = games.filter(g => g.avgCpl !== undefined);
  const avgCpl = withCpl.length > 0
    ? withCpl.reduce((sum, g) => sum + g.avgCpl!, 0) / withCpl.length
    : 0;

  const totalBlunders = games.reduce((sum, g) => sum + (g.blunderCount ?? 0), 0);
  const totalMistakes = games.reduce((sum, g) => sum + (g.mistakeCount ?? 0), 0);
  const totalMoves = games.reduce((sum, g) => sum + g.moves.filter(m => m.color === g.myColor).length, 0);

  const blunderRate = totalMoves > 0 ? totalBlunders / totalMoves : 0;
  const mistakeRate = totalMoves > 0 ? totalMistakes / totalMoves : 0;

  const totalViolations = games.reduce((sum, g) => sum + (g.protocolViolationCount ?? 0), 0);
  const protocolViolationRate = totalMoves > 0 ? totalViolations / totalMoves : 0;

  const ratingTrend = games.map(g => g.myRating + (g.myRatingChange ?? 0));
  const currentRating = ratingTrend.length > 0 ? ratingTrend[ratingTrend.length - 1] : 0;

  return {
    totalGames: games.length,
    gamesReviewed: reviewed.length,
    currentRating,
    ratingTrend,
    avgCpl,
    blunderRate,
    mistakeRate,
    protocolViolationRate,
    gamesThisWeek: gamesThisWeek.length,
    gamesReviewedThisWeek: reviewedThisWeek.length,
  };
}

/**
 * Generate metrics.md content.
 */
export function generateMetricsMarkdown(metrics: MetricsData): string {
  const lines: string[] = [];

  lines.push('# Chess Metrics Dashboard');
  lines.push('');
  lines.push(`*Last updated: ${new Date().toISOString().slice(0, 10)}*`);
  lines.push('');

  lines.push('## Overview');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Current Rating | **${metrics.currentRating}** |`);
  lines.push(`| Total Games | ${metrics.totalGames} |`);
  lines.push(`| Games Reviewed | ${metrics.gamesReviewed} (${pct(metrics.gamesReviewed, metrics.totalGames)}) |`);
  lines.push(`| Games This Week | ${metrics.gamesThisWeek} |`);
  lines.push(`| Reviewed This Week | ${metrics.gamesReviewedThisWeek} |`);
  lines.push('');

  lines.push('## Quality Metrics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Avg CPL | ${metrics.avgCpl.toFixed(1)} |`);
  lines.push(`| Blunder Rate | ${(metrics.blunderRate * 100).toFixed(1)}% |`);
  lines.push(`| Mistake Rate | ${(metrics.mistakeRate * 100).toFixed(1)}% |`);
  lines.push(`| Protocol Violation Rate | ${(metrics.protocolViolationRate * 100).toFixed(1)}% |`);
  lines.push('');

  if (metrics.ratingTrend.length > 1) {
    lines.push('## Rating Trend');
    lines.push('');
    const recent = metrics.ratingTrend.slice(-20);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min || 1;
    lines.push('```');
    for (const r of recent) {
      const barLen = Math.round(((r - min) / range) * 40);
      lines.push(`${r.toString().padStart(4)} ${'█'.repeat(barLen)}`);
    }
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

function pct(part: number, total: number): string {
  if (total === 0) return '0%';
  return `${((part / total) * 100).toFixed(0)}%`;
}
