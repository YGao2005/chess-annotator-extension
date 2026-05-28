import React from 'react';
import { useGameStore } from '../stores/gameStore';
import { TimeDistributionChart } from './TimeDistributionChart';
import { TimePhaseBreakdown } from './TimePhaseBreakdown';
import { RushThresholdMarker } from './RushThresholdMarker';

export const TimeAnalytics: React.FC = () => {
  const { game, activeMoveIndex, setActiveMoveIndex } = useGameStore();

  if (!game || game.moves.length === 0) {
    return (
      <div className="time-analytics empty">
        <p>Play some moves to see time analytics</p>
      </div>
    );
  }

  const myMoves = game.moves.filter(m => m.color === game.myColor);
  const fastMoves = myMoves.filter(m => m.timeSpentMs > 0 && m.timeSpentMs < 5000);
  const slowestMove = myMoves.length > 0
    ? myMoves.reduce((max, m) => (m.timeSpentMs > max.timeSpentMs ? m : max), myMoves[0])
    : null;
  const fastestMove = myMoves.filter(m => m.timeSpentMs > 0).length > 0
    ? myMoves.filter(m => m.timeSpentMs > 0).reduce((min, m) => (m.timeSpentMs < min.timeSpentMs ? m : min), myMoves[0])
    : null;

  const autoFlaggedProtocol = game.moves.filter(
    m => m.color === game.myColor && m.tags.includes('possible_protocol_skip'),
  );
  const autoFlaggedTimePressure = game.moves.filter(
    m => m.color === game.myColor && m.tags.includes('time_pressure'),
  );

  return (
    <div className="time-analytics">
      <TimeDistributionChart
        moves={game.moves}
        myColor={game.myColor}
        activeMoveIndex={activeMoveIndex}
        onMoveSelect={setActiveMoveIndex}
      />

      <TimePhaseBreakdown
        moves={game.moves}
        myColor={game.myColor}
      />

      <RushThresholdMarker
        moves={game.moves}
        myColor={game.myColor}
        timeControl={game.timeControl}
        onMoveSelect={setActiveMoveIndex}
      />

      <div className="time-summary">
        <div className="time-summary-header">Quick Stats</div>
        <div className="time-summary-grid">
          {slowestMove && (
            <SummaryItem
              label="Slowest move"
              value={`${slowestMove.number}${slowestMove.color === 'w' ? '.' : '...'} ${slowestMove.san} (${(slowestMove.timeSpentMs / 1000).toFixed(1)}s)`}
              onClick={() => {
                const idx = game.moves.indexOf(slowestMove);
                if (idx >= 0) setActiveMoveIndex(idx);
              }}
            />
          )}
          {fastestMove && (
            <SummaryItem
              label="Fastest move"
              value={`${fastestMove.number}${fastestMove.color === 'w' ? '.' : '...'} ${fastestMove.san} (${(fastestMove.timeSpentMs / 1000).toFixed(1)}s)`}
              onClick={() => {
                const idx = game.moves.indexOf(fastestMove);
                if (idx >= 0) setActiveMoveIndex(idx);
              }}
            />
          )}
          <SummaryItem
            label="Moves under 5s"
            value={`${fastMoves.length}/${myMoves.length}`}
          />
          {autoFlaggedProtocol.length > 0 && (
            <SummaryItem
              label="Auto-flagged (skip)"
              value={String(autoFlaggedProtocol.length)}
              className="flag-warning"
            />
          )}
          {autoFlaggedTimePressure.length > 0 && (
            <SummaryItem
              label="Auto-flagged (time)"
              value={String(autoFlaggedTimePressure.length)}
              className="flag-warning"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryItem: React.FC<{
  label: string;
  value: string;
  onClick?: () => void;
  className?: string;
}> = ({ label, value, onClick, className }) => (
  <div className={`time-summary-item ${className ?? ''}`}>
    <span className="time-summary-label">{label}</span>
    {onClick ? (
      <button className="time-summary-value clickable" onClick={onClick} type="button">
        {value}
      </button>
    ) : (
      <span className="time-summary-value">{value}</span>
    )}
  </div>
);
