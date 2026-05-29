import React, { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { OpeningStats } from './OpeningStats';
import { PonzianiTracker } from './PonzianiTracker';
import { PrepDeviation } from './PrepDeviation';

export const OpeningTracker: React.FC = () => {
  const { allGames, requestAllGames } = useGameStore();

  useEffect(() => {
    requestAllGames();
  }, [requestAllGames]);

  if (allGames.length === 0) {
    return (
      <div className="opening-tracker empty">
        <p>No games stored yet.</p>
        <p className="opening-hint">Play and annotate some games to track your openings.</p>
      </div>
    );
  }

  return (
    <div className="opening-tracker">
      <OpeningStats games={allGames} />
      <PonzianiTracker games={allGames} />
      <PrepDeviation games={allGames} />
    </div>
  );
};
