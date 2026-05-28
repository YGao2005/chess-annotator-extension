import React, { useMemo } from 'react';
import type { GameRecord, Certainty } from '@/shared/types';

interface CertaintyCalibrationProps {
  games: GameRecord[];
}

interface CalibrationBucket {
  certainty: number;
  totalMoves: number;
  goodMoves: number;
  badMoves: number;
  neutralMoves: number;
  accuracyRate: number;
}

export const CertaintyCalibration: React.FC<CertaintyCalibrationProps> = ({ games }) => {
  const buckets = useMemo((): CalibrationBucket[] => {
    const data: Record<number, { total: number; good: number; bad: number; neutral: number }> = {};
    for (let c = 1; c <= 5; c++) {
      data[c] = { total: 0, good: 0, bad: 0, neutral: 0 };
    }

    for (const game of games) {
      for (const move of game.moves) {
        const c = move.certainty as Certainty;
        if (c === null || c === undefined) continue;

        data[c].total++;

        const hasGood = move.tags.some(t =>
          t === 'good' || t === 'excellent' || t === 'opening_prep',
        );
        const hasBad = move.tags.some(t =>
          t === 'blunder' || t === 'mistake' || t === 'inaccuracy',
        );

        if (hasGood && !hasBad) data[c].good++;
        else if (hasBad) data[c].bad++;
        else data[c].neutral++;
      }
    }

    return [1, 2, 3, 4, 5].map(c => ({
      certainty: c,
      totalMoves: data[c].total,
      goodMoves: data[c].good,
      badMoves: data[c].bad,
      neutralMoves: data[c].neutral,
      accuracyRate: data[c].total > 0
        ? data[c].good / data[c].total
        : 0,
    }));
  }, [games]);

  const totalRated = buckets.reduce((s, b) => s + b.totalMoves, 0);

  if (totalRated === 0) {
    return (
      <div className="pattern-card">
        <div className="pattern-card-header">Certainty Calibration</div>
        <div className="pattern-empty">No certainty ratings yet</div>
      </div>
    );
  }

  return (
    <div className="pattern-card">
      <div className="pattern-card-header">
        Certainty Calibration
        <span className="pattern-card-subtitle">{totalRated} rated moves</span>
      </div>
      <p className="calibration-hint">
        Are you accurate about when you're uncertain?
      </p>
      <div className="calibration-grid">
        <div className="calibration-header-row">
          <span>Certainty</span>
          <span>Good</span>
          <span>Bad</span>
          <span>Neutral</span>
          <span>Accuracy</span>
        </div>
        {buckets.map(b => {
          const isCalibrated = b.certainty <= 2
            ? b.accuracyRate <= 0.5
            : b.accuracyRate >= 0.5;

          return (
            <div key={b.certainty} className="calibration-row">
              <span className="calibration-stars">
                {'★'.repeat(b.certainty)}{'☆'.repeat(5 - b.certainty)}
              </span>
              <span className="calibration-good">{b.goodMoves}</span>
              <span className="calibration-bad">{b.badMoves}</span>
              <span className="calibration-neutral">{b.neutralMoves}</span>
              <span className={`calibration-accuracy ${isCalibrated ? 'calibrated' : 'miscalibrated'}`}>
                {b.totalMoves > 0 ? `${(b.accuracyRate * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <CalibrationInsight buckets={buckets} />
    </div>
  );
};

const CalibrationInsight: React.FC<{ buckets: CalibrationBucket[] }> = ({ buckets }) => {
  const highCertainty = buckets.filter(b => b.certainty >= 4 && b.totalMoves > 0);
  const lowCertainty = buckets.filter(b => b.certainty <= 2 && b.totalMoves > 0);

  const insights: string[] = [];

  if (highCertainty.length > 0) {
    const avgAccuracy = highCertainty.reduce((s, b) => s + b.accuracyRate * b.totalMoves, 0) /
      highCertainty.reduce((s, b) => s + b.totalMoves, 0);
    if (avgAccuracy < 0.5) {
      insights.push('You tend to be overconfident — high certainty moves often turn out bad.');
    }
  }

  if (lowCertainty.length > 0) {
    const avgAccuracy = lowCertainty.reduce((s, b) => s + b.accuracyRate * b.totalMoves, 0) /
      lowCertainty.reduce((s, b) => s + b.totalMoves, 0);
    if (avgAccuracy > 0.5) {
      insights.push('You underestimate yourself — low certainty moves are often good.');
    }
  }

  if (insights.length === 0) return null;

  return (
    <div className="calibration-insights">
      {insights.map((insight, i) => (
        <div key={i} className="calibration-insight">{insight}</div>
      ))}
    </div>
  );
};
