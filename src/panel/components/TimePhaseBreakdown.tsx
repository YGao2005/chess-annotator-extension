import React, { useMemo } from 'react';
import type { MoveRecord } from '@/shared/types';

interface TimePhaseBreakdownProps {
  moves: MoveRecord[];
  myColor: 'w' | 'b';
}

interface PhaseStats {
  name: string;
  moveRange: string;
  avgTimeMs: number;
  totalTimeMs: number;
  moveCount: number;
  fastMoves: number;
}

export const TimePhaseBreakdown: React.FC<TimePhaseBreakdownProps> = ({ moves, myColor }) => {
  const phases = useMemo((): PhaseStats[] => {
    const myMoves = moves.filter(m => m.color === myColor);

    const opening = myMoves.filter(m => m.number <= 10);
    const middlegame = myMoves.filter(m => m.number > 10 && m.number <= 30);
    const endgame = myMoves.filter(m => m.number > 30);

    const computePhase = (name: string, range: string, phaseMoves: MoveRecord[]): PhaseStats => {
      const totalMs = phaseMoves.reduce((s, m) => s + m.timeSpentMs, 0);
      return {
        name,
        moveRange: range,
        avgTimeMs: phaseMoves.length > 0 ? totalMs / phaseMoves.length : 0,
        totalTimeMs: totalMs,
        moveCount: phaseMoves.length,
        fastMoves: phaseMoves.filter(m => m.timeSpentMs < 5000).length,
      };
    };

    return [
      computePhase('Opening', '1–10', opening),
      computePhase('Middlegame', '11–30', middlegame),
      computePhase('Endgame', '30+', endgame),
    ];
  }, [moves, myColor]);

  const totalTime = phases.reduce((s, p) => s + p.totalTimeMs, 0);

  return (
    <div className="phase-breakdown">
      <div className="phase-breakdown-header">Time by Phase (your moves)</div>
      <div className="phase-bars-container">
        {phases.map(phase => {
          const pct = totalTime > 0 ? (phase.totalTimeMs / totalTime) * 100 : 0;
          return (
            <div key={phase.name} className="phase-row">
              <div className="phase-label">
                <span className="phase-name">{phase.name}</span>
                <span className="phase-range">{phase.moveRange}</span>
              </div>
              <div className="phase-bar-track">
                <div
                  className={`phase-bar-fill phase-${phase.name.toLowerCase()}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="phase-stats">
                <span className="phase-avg">{formatTime(phase.avgTimeMs)}/move</span>
                <span className="phase-total">{formatTime(phase.totalTimeMs)} total</span>
                {phase.fastMoves > 0 && phase.moveCount > 0 && (
                  <span className="phase-fast">
                    {phase.fastMoves}/{phase.moveCount} fast
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function formatTime(ms: number): string {
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${min}:${rem.toString().padStart(2, '0')}`;
}
