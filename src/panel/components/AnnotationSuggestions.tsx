import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { findSimilarPositions, findMovePatternMatches } from '@/chess/similarity';
import type { PositionMatch } from '@/chess/similarity';

export const AnnotationSuggestions: React.FC = () => {
  const { game, activeMoveIndex, allGames, requestAllGames } = useGameStore();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (allGames.length === 0) {
      requestAllGames();
    }
  }, [allGames.length, requestAllGames]);

  const move = game?.moves[activeMoveIndex];

  const suggestions = useMemo((): PositionMatch[] => {
    if (!game || !move || allGames.length === 0) return [];

    const results: PositionMatch[] = [];

    // FEN-based similarity
    if (move.fen) {
      const fenMatches = findSimilarPositions(move.fen, game.id, allGames, {
        minSimilarity: 0.85,
        maxResults: 3,
        requireNotes: false,
      });
      results.push(...fenMatches);
    }

    // Move pattern matches (same move at same move number)
    const patternMatches = findMovePatternMatches(
      move.number,
      move.color,
      move.san,
      game.id,
      allGames,
      3,
    );

    // Deduplicate by gameId+moveIndex
    const seen = new Set(results.map(r => `${r.gameId}:${r.moveIndex}`));
    for (const pm of patternMatches) {
      const key = `${pm.gameId}:${pm.moveIndex}`;
      if (!seen.has(key)) {
        results.push(pm);
        seen.add(key);
      }
    }

    // Sort: matches with notes first, then by similarity
    results.sort((a, b) => {
      const aNotes = (a.move.noteDuring || a.move.notePost) ? 1 : 0;
      const bNotes = (b.move.noteDuring || b.move.notePost) ? 1 : 0;
      if (bNotes !== aNotes) return bNotes - aNotes;
      return b.similarity - a.similarity;
    });

    return results.slice(0, 5);
  }, [game, move, allGames, activeMoveIndex]);

  if (!move || suggestions.length === 0) return null;

  const withNotes = suggestions.filter(s => s.move.noteDuring || s.move.notePost);

  return (
    <div className="annotation-suggestions">
      <button
        className="suggestions-toggle"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span className="suggestions-icon">💡</span>
        <span className="suggestions-label">
          You&apos;ve been here before
          <span className="suggestions-count">
            {suggestions.length} similar {suggestions.length === 1 ? 'position' : 'positions'}
            {withNotes.length > 0 && ` (${withNotes.length} with notes)`}
          </span>
        </span>
        <span className="suggestions-arrow">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="suggestions-list">
          {suggestions.map((match, i) => (
            <SuggestionCard key={`${match.gameId}-${match.moveIndex}-${i}`} match={match} />
          ))}
        </div>
      )}
    </div>
  );
};

const SuggestionCard: React.FC<{ match: PositionMatch }> = ({ match }) => {
  const resultClass = match.result === '1-0' ? 'win' : match.result === '0-1' ? 'loss' : 'draw';
  const dateStr = new Date(match.gameDate).toLocaleDateString();
  const simPercent = Math.round(match.similarity * 100);

  const matchLabel =
    match.matchType === 'exact_fen' ? 'Exact position' :
    match.matchType === 'move_pattern' ? 'Same move' :
    `${simPercent}% similar`;

  return (
    <div className="suggestion-card">
      <div className="suggestion-header">
        <span className="suggestion-opponent">vs {match.opponentName}</span>
        <span className={`suggestion-result ${resultClass}`}>{match.result}</span>
        <span className="suggestion-date">{dateStr}</span>
      </div>
      <div className="suggestion-meta">
        <span className="suggestion-move">
          {match.move.number}{match.move.color === 'b' ? '...' : '.'} {match.move.san}
        </span>
        <span className="suggestion-match-type">{matchLabel}</span>
      </div>
      {match.move.noteDuring && (
        <div className="suggestion-note">
          <span className="note-badge live">Live</span>
          {match.move.noteDuring}
        </div>
      )}
      {match.move.notePost && (
        <div className="suggestion-note">
          <span className="note-badge post">Post</span>
          {match.move.notePost}
        </div>
      )}
      {match.move.tags.length > 0 && (
        <div className="suggestion-tags">
          {match.move.tags.map(tag => (
            <span key={tag} className="suggestion-tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
};
