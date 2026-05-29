import React, { useMemo, useState } from 'react';
import type { GameRecord, MoveTag } from '@/shared/types';

interface MoveNumberHeatmapProps {
  games: GameRecord[];
}

type HeatmapTag = 'blunder' | 'mistake' | 'inaccuracy' | 'time_pressure' | 'possible_protocol_skip' | 'no_plan';

const HEATMAP_TAGS: { tag: HeatmapTag; label: string; color: string }[] = [
  { tag: 'blunder', label: 'Blunder', color: '#e74c3c' },
  { tag: 'mistake', label: 'Mistake', color: '#e67e22' },
  { tag: 'inaccuracy', label: 'Inaccuracy', color: '#f1c40f' },
  { tag: 'time_pressure', label: 'Time Pressure', color: '#c0392b' },
  { tag: 'possible_protocol_skip', label: 'Fast (<5s)', color: '#d35400' },
  { tag: 'no_plan', label: 'No Plan', color: '#9b59b6' },
];

const BUCKET_SIZE = 5;
const MAX_MOVE = 60;

interface HeatCell {
  bucketStart: number;
  bucketEnd: number;
  count: number;
  intensity: number;
}

export const MoveNumberHeatmap: React.FC<MoveNumberHeatmapProps> = ({ games }) => {
  const [selectedTag, setSelectedTag] = useState<HeatmapTag>('blunder');

  const heatmapData = useMemo(() => {
    const result: Record<string, HeatCell[]> = {};

    for (const { tag } of HEATMAP_TAGS) {
      const buckets: Record<number, number> = {};

      for (const game of games) {
        for (const move of game.moves) {
          if (move.color !== game.myColor) continue;
          if (!move.tags.includes(tag as MoveTag)) continue;

          const bucket = Math.floor((move.number - 1) / BUCKET_SIZE) * BUCKET_SIZE + 1;
          buckets[bucket] = (buckets[bucket] ?? 0) + 1;
        }
      }

      const cells: HeatCell[] = [];
      for (let start = 1; start <= MAX_MOVE; start += BUCKET_SIZE) {
        cells.push({
          bucketStart: start,
          bucketEnd: start + BUCKET_SIZE - 1,
          count: buckets[start] ?? 0,
          intensity: 0,
        });
      }

      const maxCount = Math.max(...cells.map(c => c.count), 1);
      for (const cell of cells) {
        cell.intensity = cell.count / maxCount;
      }

      result[tag] = cells;
    }

    return result;
  }, [games]);

  const currentData = heatmapData[selectedTag] ?? [];
  const tagInfo = HEATMAP_TAGS.find(t => t.tag === selectedTag);
  const totalForTag = currentData.reduce((s, c) => s + c.count, 0);

  const peakBucket = currentData.reduce(
    (max, c) => (c.count > max.count ? c : max),
    currentData[0],
  );

  return (
    <div className="pattern-card">
      <div className="pattern-card-header">
        Tag Clustering by Move Number
        <span className="pattern-card-subtitle">where do your mistakes cluster?</span>
      </div>

      <div className="heatmap-tag-selector">
        {HEATMAP_TAGS.map(({ tag, label, color }) => (
          <button
            key={tag}
            className={`heatmap-tag-btn ${selectedTag === tag ? 'active' : ''}`}
            style={{
              '--heatmap-tag-color': color,
            } as React.CSSProperties}
            onClick={() => setSelectedTag(tag)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {totalForTag === 0 ? (
        <div className="pattern-empty">No {tagInfo?.label.toLowerCase()} tags found</div>
      ) : (
        <>
          <div className="heatmap-grid">
            {currentData.map(cell => (
              <div
                key={cell.bucketStart}
                className="heatmap-cell"
                style={{
                  backgroundColor: cell.count > 0
                    ? `color-mix(in srgb, ${tagInfo?.color ?? '#888'} ${Math.max(cell.intensity * 100, 15)}%, transparent)`
                    : '#0f3460',
                }}
                title={`Moves ${cell.bucketStart}–${cell.bucketEnd}: ${cell.count} occurrences`}
              >
                <span className="heatmap-cell-range">
                  {cell.bucketStart}–{cell.bucketEnd}
                </span>
                {cell.count > 0 && (
                  <span className="heatmap-cell-count">{cell.count}</span>
                )}
              </div>
            ))}
          </div>

          <div className="heatmap-insight">
            {peakBucket && peakBucket.count > 0 && (
              <span>
                Peak: moves {peakBucket.bucketStart}–{peakBucket.bucketEnd} ({peakBucket.count} total)
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
