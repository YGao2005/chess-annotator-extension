import React, { useMemo, useState } from 'react';
import type { GameRecord } from '@/shared/types';
import { aggregateOpenings, type OpeningStats as Stats } from '@/openings/detector';

interface OpeningStatsProps {
  games: GameRecord[];
}

type ColorFilter = 'all' | 'white' | 'black';
type SortBy = 'frequency' | 'winrate';

export const OpeningStats: React.FC<OpeningStatsProps> = ({ games }) => {
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('frequency');

  const filteredGames = useMemo(() => {
    if (colorFilter === 'all') return games;
    const c = colorFilter === 'white' ? 'w' : 'b';
    return games.filter(g => g.myColor === c);
  }, [games, colorFilter]);

  const stats = useMemo(() => {
    const agg = aggregateOpenings(filteredGames);
    if (sortBy === 'winrate') {
      return [...agg].sort((a, b) => b.winRate - a.winRate);
    }
    return agg;
  }, [filteredGames, sortBy]);

  return (
    <div className="opening-stats-card">
      <div className="opening-stats-header">
        <span className="opening-stats-title">Win/Loss/Draw by Opening</span>
        <span className="opening-stats-count">{filteredGames.length} games</span>
      </div>

      <div className="opening-filter-row">
        <div className="opening-color-filter">
          {(['all', 'white', 'black'] as ColorFilter[]).map(c => (
            <button
              key={c}
              className={`filter-btn ${colorFilter === c ? 'active' : ''}`}
              onClick={() => setColorFilter(c)}
              type="button"
            >
              {c === 'all' ? 'All' : c === 'white' ? 'As White' : 'As Black'}
            </button>
          ))}
        </div>
        <div className="opening-sort">
          <button
            className={`filter-btn ${sortBy === 'frequency' ? 'active' : ''}`}
            onClick={() => setSortBy('frequency')}
            type="button"
          >
            # Games
          </button>
          <button
            className={`filter-btn ${sortBy === 'winrate' ? 'active' : ''}`}
            onClick={() => setSortBy('winrate')}
            type="button"
          >
            Win %
          </button>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="opening-empty">No games match the current filter.</div>
      ) : (
        <div className="opening-table">
          {stats.map(s => (
            <OpeningRow key={s.name} stats={s} />
          ))}
        </div>
      )}
    </div>
  );
};

const OpeningRow: React.FC<{ stats: Stats }> = ({ stats: s }) => {
  const winPct = s.total > 0 ? Math.round(s.winRate * 100) : 0;
  const drawPct = s.total > 0 ? Math.round((s.draws / s.total) * 100) : 0;
  const lossPct = 100 - winPct - drawPct;

  return (
    <div className="opening-row">
      <div className="opening-row-top">
        <span className="opening-name">{s.name}</span>
        {s.eco && <span className="opening-eco">{s.eco}</span>}
        <span className="opening-games">{s.total}g</span>
      </div>
      <div className="opening-bar-track">
        {s.wins > 0 && (
          <div
            className="opening-bar-fill win"
            style={{ width: `${winPct}%` }}
            title={`${s.wins} wins (${winPct}%)`}
          />
        )}
        {s.draws > 0 && (
          <div
            className="opening-bar-fill draw"
            style={{ width: `${drawPct}%` }}
            title={`${s.draws} draws (${drawPct}%)`}
          />
        )}
        {s.losses > 0 && (
          <div
            className="opening-bar-fill loss"
            style={{ width: `${lossPct}%` }}
            title={`${s.losses} losses (${lossPct}%)`}
          />
        )}
      </div>
      <div className="opening-row-bottom">
        <span className="wld-label win-label">W {s.wins}</span>
        <span className="wld-label draw-label">D {s.draws}</span>
        <span className="wld-label loss-label">L {s.losses}</span>
        <span className="opening-winrate">{winPct}%</span>
      </div>
    </div>
  );
};
