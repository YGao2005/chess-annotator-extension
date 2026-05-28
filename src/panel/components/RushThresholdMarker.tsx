import React, { useMemo } from 'react';
import type { MoveRecord } from '@/shared/types';

interface RushThresholdMarkerProps {
  moves: MoveRecord[];
  myColor: 'w' | 'b';
  timeControl: string;
  onMoveSelect: (index: number) => void;
}

interface RushAnalysis {
  thresholdMove: number | null;
  thresholdMoveIndex: number | null;
  clockAtThreshold: number;
  totalTimeMs: number;
  thresholdMs: number;
  movesAfter: MoveRecord[];
  mistakeRateAfter: number;
  mistakeRateBefore: number;
  fastMovesAfter: number;
  totalMovesAfter: number;
}

export const RushThresholdMarker: React.FC<RushThresholdMarkerProps> = ({
  moves,
  myColor,
  timeControl,
  onMoveSelect,
}) => {
  const analysis = useMemo((): RushAnalysis => {
    const baseSeconds = parseInt(timeControl, 10) || 600;
    const totalTimeMs = baseSeconds * 1000;
    const thresholdMs = totalTimeMs * 0.2;

    const myMoves = moves.filter(m => m.color === myColor);
    const myMoveIndices = moves
      .map((m, i) => (m.color === myColor ? i : -1))
      .filter(i => i >= 0);

    let thresholdMove: number | null = null;
    let thresholdMoveIndex: number | null = null;
    let clockAtThreshold = 0;
    let splitIdx = myMoves.length;

    for (let i = 0; i < myMoves.length; i++) {
      if (myMoves[i].clockRemainingMs > 0 && myMoves[i].clockRemainingMs < thresholdMs) {
        thresholdMove = myMoves[i].number;
        thresholdMoveIndex = myMoveIndices[i];
        clockAtThreshold = myMoves[i].clockRemainingMs;
        splitIdx = i;
        break;
      }
    }

    const movesBefore = myMoves.slice(0, splitIdx);
    const movesAfter = myMoves.slice(splitIdx);

    const countMistakes = (arr: MoveRecord[]) =>
      arr.filter(m =>
        m.tags.includes('blunder') || m.tags.includes('mistake') || m.tags.includes('inaccuracy'),
      ).length;

    const mistakeRateBefore = movesBefore.length > 0
      ? countMistakes(movesBefore) / movesBefore.length
      : 0;
    const mistakeRateAfter = movesAfter.length > 0
      ? countMistakes(movesAfter) / movesAfter.length
      : 0;

    const fastMovesAfter = movesAfter.filter(m => m.timeSpentMs < 5000).length;

    return {
      thresholdMove,
      thresholdMoveIndex,
      clockAtThreshold,
      totalTimeMs,
      thresholdMs,
      movesAfter,
      mistakeRateAfter,
      mistakeRateBefore,
      fastMovesAfter,
      totalMovesAfter: movesAfter.length,
    };
  }, [moves, myColor, timeControl]);

  if (analysis.thresholdMove === null) {
    return (
      <div className="rush-marker">
        <div className="rush-marker-header">Rush Threshold</div>
        <div className="rush-no-threshold">
          Clock never dropped below 20% ({formatTime(analysis.thresholdMs)})
        </div>
      </div>
    );
  }

  const rateChange = analysis.mistakeRateAfter - analysis.mistakeRateBefore;
  const rateChangeClass = rateChange > 0.1 ? 'rate-worse' : rateChange < -0.1 ? 'rate-better' : 'rate-same';

  return (
    <div className="rush-marker">
      <div className="rush-marker-header">Rush Threshold</div>
      <div className="rush-details">
        <div className="rush-trigger">
          <button
            className="rush-move-link"
            onClick={() => analysis.thresholdMoveIndex !== null && onMoveSelect(analysis.thresholdMoveIndex)}
            type="button"
          >
            Move {analysis.thresholdMove}
          </button>
          <span className="rush-clock">
            Clock: {formatTime(analysis.clockAtThreshold)} / {formatTime(analysis.totalTimeMs)}
          </span>
        </div>

        <div className="rush-stats-grid">
          <div className="rush-stat">
            <span className="rush-stat-label">Moves after</span>
            <span className="rush-stat-value">{analysis.totalMovesAfter}</span>
          </div>
          <div className="rush-stat">
            <span className="rush-stat-label">Fast moves (&lt;5s)</span>
            <span className="rush-stat-value">
              {analysis.fastMovesAfter}/{analysis.totalMovesAfter}
            </span>
          </div>
          <div className="rush-stat">
            <span className="rush-stat-label">Mistake rate before</span>
            <span className="rush-stat-value">{(analysis.mistakeRateBefore * 100).toFixed(0)}%</span>
          </div>
          <div className="rush-stat">
            <span className="rush-stat-label">Mistake rate after</span>
            <span className={`rush-stat-value ${rateChangeClass}`}>
              {(analysis.mistakeRateAfter * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {rateChange > 0.1 && (
          <div className="rush-warning">
            Mistake rate increased {(rateChange * 100).toFixed(0)}% after time pressure
          </div>
        )}
      </div>
    </div>
  );
};

function formatTime(ms: number): string {
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(0)}s`;
  const min = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${min}:${rem.toString().padStart(2, '0')}`;
}
