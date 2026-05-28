import React, { useMemo } from 'react';
import type { MoveRecord } from '@/shared/types';

interface TimeDistributionChartProps {
  moves: MoveRecord[];
  myColor: 'w' | 'b';
  activeMoveIndex: number;
  onMoveSelect: (index: number) => void;
}

interface BarData {
  index: number;
  moveLabel: string;
  timeMs: number;
  color: 'w' | 'b';
  isMyMove: boolean;
  tags: string[];
  isFlagged: boolean;
}

export const TimeDistributionChart: React.FC<TimeDistributionChartProps> = ({
  moves,
  myColor,
  activeMoveIndex,
  onMoveSelect,
}) => {
  const bars = useMemo((): BarData[] => {
    return moves.map((m, i) => ({
      index: i,
      moveLabel: `${m.number}${m.color === 'w' ? '.' : '...'}`,
      timeMs: m.timeSpentMs,
      color: m.color,
      isMyMove: m.color === myColor,
      tags: m.tags,
      isFlagged: m.tags.includes('time_pressure') || m.tags.includes('protocol_skip'),
    }));
  }, [moves, myColor]);

  const maxTime = useMemo(() => {
    if (bars.length === 0) return 1000;
    return Math.max(...bars.map(b => b.timeMs), 1000);
  }, [bars]);

  if (moves.length === 0) {
    return <div className="time-chart-empty">No moves to display</div>;
  }

  return (
    <div className="time-chart">
      <div className="time-chart-header">
        <span className="time-chart-title">Time per Move</span>
        <div className="time-chart-legend">
          <span className="legend-item legend-mine">You</span>
          <span className="legend-item legend-opponent">Opponent</span>
        </div>
      </div>
      <div className="time-chart-bars">
        {bars.map(bar => {
          const heightPct = Math.max((bar.timeMs / maxTime) * 100, 2);
          const isActive = bar.index === activeMoveIndex;
          const timeSec = (bar.timeMs / 1000).toFixed(1);

          let barClass = 'time-bar';
          if (bar.isMyMove) barClass += ' mine';
          else barClass += ' opponent';
          if (isActive) barClass += ' active';
          if (bar.timeMs < 5000 && bar.isMyMove) barClass += ' fast-move';
          if (bar.isFlagged) barClass += ' flagged';

          return (
            <button
              key={bar.index}
              className={barClass}
              style={{ height: `${heightPct}%` }}
              onClick={() => onMoveSelect(bar.index)}
              title={`${bar.moveLabel} ${moves[bar.index].san} — ${timeSec}s`}
              type="button"
            >
              {isActive && <span className="bar-tooltip">{timeSec}s</span>}
            </button>
          );
        })}
      </div>
      <div className="time-chart-threshold">
        <div
          className="threshold-line"
          style={{ bottom: `${Math.max((5000 / maxTime) * 100, 0)}%` }}
        >
          <span className="threshold-label">5s</span>
        </div>
      </div>
    </div>
  );
};
