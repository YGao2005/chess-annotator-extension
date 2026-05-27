import React, { useState, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { ANNOTATION_DEBOUNCE_MS } from '@/shared/constants';

export const PostGameReview: React.FC = () => {
  const { game, updateImpression } = useGameStore();

  const [impressionPre, setImpressionPre] = useState(game?.impressionPre ?? '');
  const [impressionPost, setImpressionPost] = useState(game?.impressionPost ?? '');
  const [mainLesson, setMainLesson] = useState(game?.mainLesson ?? '');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedUpdate = useCallback(
    (data: { impressionPre?: string; impressionPost?: string; mainLesson?: string }) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateImpression(data);
      }, ANNOTATION_DEBOUNCE_MS);
    },
    [updateImpression],
  );

  if (!game) return null;

  return (
    <div className="post-game-review">
      <h3>Post-Game Review</h3>

      <div className="review-section">
        <label>Pre-Engine Impression</label>
        <p className="review-hint">How do you feel about this game before checking the engine?</p>
        <textarea
          value={impressionPre}
          onChange={(e) => {
            setImpressionPre(e.target.value);
            debouncedUpdate({ impressionPre: e.target.value });
          }}
          placeholder="I think I played well in the opening but got lost around move 20..."
          rows={4}
        />
      </div>

      <div className="review-section">
        <label>Main Lesson</label>
        <p className="review-hint">What's the one thing you should take away from this game?</p>
        <textarea
          value={mainLesson}
          onChange={(e) => {
            setMainLesson(e.target.value);
            debouncedUpdate({ mainLesson: e.target.value });
          }}
          placeholder="I need to calculate more carefully before pushing pawns in the center..."
          rows={3}
        />
      </div>

      <div className="review-section">
        <label>Post-Engine Impression</label>
        <p className="review-hint">After checking with the engine, what changed?</p>
        <textarea
          value={impressionPost}
          onChange={(e) => {
            setImpressionPost(e.target.value);
            debouncedUpdate({ impressionPost: e.target.value });
          }}
          placeholder="Engine confirmed my middlegame was solid. The missed tactic on move 15..."
          rows={4}
        />
      </div>

      <div className="review-stats">
        <h4>Game Stats</h4>
        <div className="stat-grid">
          <StatItem label="Result" value={game.result} />
          <StatItem label="Opening" value={game.opening || '—'} />
          <StatItem label="Moves" value={String(game.moves.length)} />
          {game.blunderCount !== undefined && <StatItem label="Blunders" value={String(game.blunderCount)} />}
          {game.mistakeCount !== undefined && <StatItem label="Mistakes" value={String(game.mistakeCount)} />}
          {game.protocolViolationCount !== undefined && (
            <StatItem label="Protocol Skips" value={String(game.protocolViolationCount)} />
          )}
          {game.rushThresholdMove !== undefined && (
            <StatItem label="Rush After" value={`Move ${game.rushThresholdMove}`} />
          )}
          {game.avgCpl !== undefined && <StatItem label="Avg CPL" value={game.avgCpl.toFixed(1)} />}
        </div>
      </div>
    </div>
  );
};

const StatItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="stat-item">
    <span className="stat-label">{label}</span>
    <span className="stat-value">{value}</span>
  </div>
);
