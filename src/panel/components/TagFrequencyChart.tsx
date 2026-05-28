import React, { useMemo } from 'react';
import type { GameRecord, MoveTag } from '@/shared/types';
import { MOVE_TAGS } from '@/shared/types';

interface TagFrequencyChartProps {
  games: GameRecord[];
}

interface TagCount {
  tag: MoveTag;
  count: number;
  pct: number;
}

const TAG_DISPLAY: Record<MoveTag, { label: string; color: string }> = {
  blunder: { label: 'Blunder (??)', color: '#e74c3c' },
  mistake: { label: 'Mistake (?)', color: '#e67e22' },
  inaccuracy: { label: 'Inaccuracy (?!)', color: '#f1c40f' },
  good: { label: 'Good (!)', color: '#2ecc71' },
  excellent: { label: 'Excellent (!!)', color: '#27ae60' },
  no_plan: { label: 'No Plan', color: '#9b59b6' },
  time_pressure: { label: 'Time Pressure', color: '#e74c3c' },
  opening_prep: { label: 'Opening Prep', color: '#3498db' },
  protocol_skip: { label: 'Protocol Skip', color: '#e67e22' },
  possible_protocol_skip: { label: 'Auto-Skip (<5s)', color: '#d35400' },
  forced: { label: 'Forced', color: '#95a5a6' },
};

export const TagFrequencyChart: React.FC<TagFrequencyChartProps> = ({ games }) => {
  const data = useMemo((): TagCount[] => {
    const counts: Record<string, number> = {};
    let totalTags = 0;

    for (const game of games) {
      for (const move of game.moves) {
        for (const tag of move.tags) {
          counts[tag] = (counts[tag] ?? 0) + 1;
          totalTags++;
        }
      }
    }

    return MOVE_TAGS
      .map(tag => ({
        tag,
        count: counts[tag] ?? 0,
        pct: totalTags > 0 ? ((counts[tag] ?? 0) / totalTags) * 100 : 0,
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [games]);

  if (data.length === 0) {
    return (
      <div className="pattern-card">
        <div className="pattern-card-header">Tag Frequencies</div>
        <div className="pattern-empty">No tags applied yet</div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="pattern-card">
      <div className="pattern-card-header">
        Tag Frequencies
        <span className="pattern-card-subtitle">across {games.length} games</span>
      </div>
      <div className="tag-freq-list">
        {data.map(({ tag, count, pct }) => (
          <div key={tag} className="tag-freq-row">
            <span
              className="tag-freq-label"
              style={{ color: TAG_DISPLAY[tag].color }}
            >
              {TAG_DISPLAY[tag].label}
            </span>
            <div className="tag-freq-bar-track">
              <div
                className="tag-freq-bar-fill"
                style={{
                  width: `${(count / maxCount) * 100}%`,
                  background: TAG_DISPLAY[tag].color,
                }}
              />
            </div>
            <span className="tag-freq-count">
              {count} <span className="tag-freq-pct">({pct.toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
