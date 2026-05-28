import React, { useMemo } from 'react';
import type { GameRecord } from '@/shared/types';
import { analyzePonzianiGames, type PonzianiMatch } from '@/openings/detector';

interface PrepDeviationProps {
  games: GameRecord[];
}

export const PrepDeviation: React.FC<PrepDeviationProps> = ({ games }) => {
  const matches = useMemo(() => analyzePonzianiGames(games), [games]);

  const deviations = useMemo(() => {
    return matches
      .filter(m => m.deviationPly !== null)
      .sort((a, b) => {
        const dateA = new Date(a.game.date).getTime();
        const dateB = new Date(b.game.date).getTime();
        return dateB - dateA;
      });
  }, [matches]);

  const playerDeviations = deviations.filter(d => d.deviatedBy === 'player');
  const opponentDeviations = deviations.filter(d => d.deviatedBy === 'opponent');

  if (matches.length === 0) return null;

  if (deviations.length === 0) {
    return (
      <div className="prep-deviation-card">
        <div className="prep-deviation-header">
          <span className="prep-deviation-title">Prep Deviations</span>
        </div>
        <div className="prep-deviation-perfect">
          All {matches.length} Ponziani games followed known preparation lines.
        </div>
      </div>
    );
  }

  return (
    <div className="prep-deviation-card">
      <div className="prep-deviation-header">
        <span className="prep-deviation-title">Prep Deviations</span>
        <span className="prep-deviation-count">{deviations.length} of {matches.length} games</span>
      </div>

      <div className="prep-deviation-summary">
        <div className="prep-deviation-stat">
          <span className="prep-stat-value deviation-player">{playerDeviations.length}</span>
          <span className="prep-stat-label">Your deviations</span>
        </div>
        <div className="prep-deviation-stat">
          <span className="prep-stat-value deviation-opponent">{opponentDeviations.length}</span>
          <span className="prep-stat-label">Opponent deviations</span>
        </div>
      </div>

      {playerDeviations.length > 0 && (
        <div className="prep-deviation-section">
          <div className="prep-section-title">Your Deviations from Prep</div>
          {playerDeviations.map((d, i) => (
            <DeviationRow key={`player-${d.game.id}-${i}`} match={d} />
          ))}
        </div>
      )}

      {opponentDeviations.length > 0 && (
        <div className="prep-deviation-section">
          <div className="prep-section-title">Opponent Deviations</div>
          {opponentDeviations.map((d, i) => (
            <DeviationRow key={`opp-${d.game.id}-${i}`} match={d} />
          ))}
        </div>
      )}
    </div>
  );
};

const DeviationRow: React.FC<{ match: PonzianiMatch }> = ({ match: m }) => {
  if (m.deviationPly === null) return null;

  const moveNum = Math.ceil((m.deviationPly + 1) / 2);
  const color = m.deviationPly % 2 === 0 ? 'White' : 'Black';
  const won =
    (m.game.myColor === 'w' && m.game.result === '1-0') ||
    (m.game.myColor === 'b' && m.game.result === '0-1');
  const drew = m.game.result === '1/2-1/2';
  const resultClass = won ? 'win' : drew ? 'draw' : 'loss';
  const resultText = won ? 'Won' : drew ? 'Draw' : 'Lost';

  const dateStr = new Date(m.game.date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="deviation-row">
      <div className="deviation-row-top">
        <span className="deviation-move">
          Move {moveNum} ({color}): played <strong>{m.deviationMove}</strong>
        </span>
        <span className={`deviation-result ${resultClass}`}>{resultText}</span>
      </div>
      <div className="deviation-row-bottom">
        <span className="deviation-line">In: {m.variationName}</span>
        <span className="deviation-date">vs {m.game.opponentName} · {dateStr}</span>
      </div>
      {m.expectedMoves.length > 0 && (
        <div className="deviation-expected">
          Expected: {m.expectedMoves.join(', ')}
        </div>
      )}
    </div>
  );
};
