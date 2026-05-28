import React, { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { TagFrequencyChart } from './TagFrequencyChart';
import { CertaintyCalibration } from './CertaintyCalibration';
import { ProtocolViolationTrend } from './ProtocolViolationTrend';
import { MoveNumberHeatmap } from './MoveNumberHeatmap';

export const PatternDashboard: React.FC = () => {
  const { allGames, requestAllGames } = useGameStore();

  useEffect(() => {
    requestAllGames();
  }, [requestAllGames]);

  if (allGames.length === 0) {
    return (
      <div className="pattern-dashboard empty">
        <p>No games stored yet.</p>
        <p className="pattern-hint">Play and annotate some games to see patterns emerge.</p>
      </div>
    );
  }

  return (
    <div className="pattern-dashboard">
      <TagFrequencyChart games={allGames} />
      <CertaintyCalibration games={allGames} />
      <ProtocolViolationTrend games={allGames} />
      <MoveNumberHeatmap games={allGames} />
    </div>
  );
};
