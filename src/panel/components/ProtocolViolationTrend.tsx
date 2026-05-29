import React, { useMemo } from 'react';
import type { GameRecord } from '@/shared/types';

interface ProtocolViolationTrendProps {
  games: GameRecord[];
}

interface GamePoint {
  gameIndex: number;
  date: string;
  opponent: string;
  violationCount: number;
  violationRate: number;
  totalMoves: number;
}

export const ProtocolViolationTrend: React.FC<ProtocolViolationTrendProps> = ({ games }) => {
  const points = useMemo((): GamePoint[] => {
    return games
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((game, i) => {
        const myMoves = game.moves.filter(m => m.color === game.myColor);
        const violations = myMoves.filter(m =>
          m.checklist.some(checked => !checked),
        ).length;

        return {
          gameIndex: i,
          date: game.date.slice(0, 10),
          opponent: game.opponentName,
          violationCount: violations,
          violationRate: myMoves.length > 0 ? violations / myMoves.length : 0,
          totalMoves: myMoves.length,
        };
      });
  }, [games]);

  if (points.length === 0) {
    return (
      <div className="pattern-card">
        <div className="pattern-card-header">Protocol Violation Trend</div>
        <div className="pattern-empty">No games recorded yet</div>
      </div>
    );
  }

  const maxRate = Math.max(...points.map(p => p.violationRate), 0.1);
  const avgRate = points.reduce((s, p) => s + p.violationRate, 0) / points.length;

  // Moving average (3-game window)
  const movingAvg = points.map((_, i) => {
    const windowStart = Math.max(0, i - 2);
    const window = points.slice(windowStart, i + 1);
    return window.reduce((s, p) => s + p.violationRate, 0) / window.length;
  });

  const improving = points.length >= 3 &&
    movingAvg[movingAvg.length - 1] < movingAvg[Math.floor(movingAvg.length / 2)];

  return (
    <div className="pattern-card">
      <div className="pattern-card-header">
        Protocol Violation Trend
        <span className="pattern-card-subtitle">{points.length} games</span>
      </div>

      <div className="violation-chart">
        <div className="violation-bars">
          {points.map((point, i) => {
            const heightPct = Math.max((point.violationRate / maxRate) * 100, 3);
            const avgLinePct = (avgRate / maxRate) * 100;

            return (
              <div key={i} className="violation-bar-wrapper">
                <button
                  className="violation-bar"
                  style={{ height: `${heightPct}%` }}
                  title={`${point.date} vs ${point.opponent}: ${point.violationCount}/${point.totalMoves} (${(point.violationRate * 100).toFixed(0)}%)`}
                  type="button"
                />
                {i === 0 && (
                  <div
                    className="violation-avg-line"
                    style={{ bottom: `${avgLinePct}%` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="violation-summary">
        <div className="violation-stat">
          <span className="violation-stat-label">Average rate</span>
          <span className="violation-stat-value">{(avgRate * 100).toFixed(0)}%</span>
        </div>
        <div className="violation-stat">
          <span className="violation-stat-label">Latest game</span>
          <span className="violation-stat-value">
            {(points[points.length - 1].violationRate * 100).toFixed(0)}%
          </span>
        </div>
        <div className="violation-stat">
          <span className="violation-stat-label">Trend</span>
          <span className={`violation-stat-value ${improving ? 'trend-good' : 'trend-bad'}`}>
            {points.length < 3 ? 'Too few games' : improving ? 'Improving' : 'Needs work'}
          </span>
        </div>
      </div>
    </div>
  );
};
