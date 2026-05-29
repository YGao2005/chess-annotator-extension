import React, { useMemo } from 'react';
import type { GameRecord } from '@/shared/types';
import {
  analyzePonzianiGames,
  aggregatePonzianiVariations,
  type PonzianiMatch,
  type VariationStats,
} from '@/openings/detector';

interface PonzianiTrackerProps {
  games: GameRecord[];
}

export const PonzianiTracker: React.FC<PonzianiTrackerProps> = ({ games }) => {
  const matches = useMemo(() => analyzePonzianiGames(games), [games]);
  const variationStats = useMemo(() => aggregatePonzianiVariations(matches), [matches]);

  if (matches.length === 0) {
    return (
      <div className="ponziani-card">
        <div className="ponziani-header">
          <span className="ponziani-title">Ponziani Tracker</span>
        </div>
        <div className="ponziani-empty">
          No Ponziani games found. Play 1.e4 e5 2.Nf3 Nc6 3.c3 to track your lines.
        </div>
      </div>
    );
  }

  const totalWins = matches.filter(m =>
    (m.game.myColor === 'w' && m.game.result === '1-0') ||
    (m.game.myColor === 'b' && m.game.result === '0-1')
  ).length;
  const totalDraws = matches.filter(m => m.game.result === '1/2-1/2').length;
  const totalLosses = matches.length - totalWins - totalDraws;
  const overallWinRate = matches.length > 0 ? Math.round((totalWins / matches.length) * 100) : 0;

  return (
    <div className="ponziani-card">
      <div className="ponziani-header">
        <span className="ponziani-title">Ponziani Tracker</span>
        <span className="ponziani-count">{matches.length} games</span>
      </div>

      <div className="ponziani-overview">
        <div className="ponziani-stat">
          <span className="ponziani-stat-value win-label">{totalWins}</span>
          <span className="ponziani-stat-label">Wins</span>
        </div>
        <div className="ponziani-stat">
          <span className="ponziani-stat-value draw-label">{totalDraws}</span>
          <span className="ponziani-stat-label">Draws</span>
        </div>
        <div className="ponziani-stat">
          <span className="ponziani-stat-value loss-label">{totalLosses}</span>
          <span className="ponziani-stat-label">Losses</span>
        </div>
        <div className="ponziani-stat">
          <span className="ponziani-stat-value">{overallWinRate}%</span>
          <span className="ponziani-stat-label">Win Rate</span>
        </div>
      </div>

      {variationStats.length > 0 && (
        <div className="ponziani-variations">
          <div className="ponziani-var-header">Variation Breakdown</div>
          {variationStats.map(v => (
            <VariationRow key={v.name} stats={v} />
          ))}
        </div>
      )}

      <div className="ponziani-games-list">
        <div className="ponziani-var-header">Recent Ponziani Games</div>
        {matches.slice(0, 10).map((m, i) => (
          <PonzianiGameRow key={`${m.game.id}-${i}`} match={m} />
        ))}
      </div>
    </div>
  );
};

const VariationRow: React.FC<{ stats: VariationStats }> = ({ stats: v }) => {
  const winPct = v.total > 0 ? Math.round(v.winRate * 100) : 0;

  return (
    <div className="ponziani-var-row">
      <div className="ponziani-var-name">{v.name}</div>
      <div className="ponziani-var-stats">
        <span className="wld-label win-label">W{v.wins}</span>
        <span className="wld-label draw-label">D{v.draws}</span>
        <span className="wld-label loss-label">L{v.losses}</span>
        <span className="ponziani-var-winrate">{winPct}%</span>
      </div>
      {v.deviations > 0 && (
        <div className="ponziani-var-deviations">
          {v.playerDeviations > 0 && (
            <span className="deviation-badge player">You deviated: {v.playerDeviations}×</span>
          )}
          {v.opponentDeviations > 0 && (
            <span className="deviation-badge opponent">Opp deviated: {v.opponentDeviations}×</span>
          )}
        </div>
      )}
    </div>
  );
};

const PonzianiGameRow: React.FC<{ match: PonzianiMatch }> = ({ match: m }) => {
  const won =
    (m.game.myColor === 'w' && m.game.result === '1-0') ||
    (m.game.myColor === 'b' && m.game.result === '0-1');
  const drew = m.game.result === '1/2-1/2';

  const resultClass = won ? 'win' : drew ? 'draw' : 'loss';
  const resultText = won ? 'W' : drew ? 'D' : 'L';

  const dateStr = new Date(m.game.date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="ponziani-game-row">
      <span className={`ponziani-result ${resultClass}`}>{resultText}</span>
      <span className="ponziani-game-opp">vs {m.game.opponentName}</span>
      <span className="ponziani-game-var">{m.variationName}</span>
      <span className="ponziani-game-date">{dateStr}</span>
      {m.deviationPly !== null && (
        <span className={`deviation-badge ${m.deviatedBy}`}>
          {m.deviatedBy === 'player' ? 'You' : 'Opp'} deviated ply {m.deviationPly + 1}
        </span>
      )}
    </div>
  );
};
