import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { TagSelector } from './TagSelector';
import { CertaintyRating } from './CertaintyRating';
import { Checklist } from './Checklist';
import { ANNOTATION_DEBOUNCE_MS } from '@/shared/constants';

export const AnnotationPanel: React.FC = () => {
  const {
    game,
    activeMoveIndex,
    isReviewMode,
    setMoveTags,
    setMoveCertainty,
    setMoveChecklist,
    setMoveNote,
    setMovePostNote,
  } = useGameStore();

  const [checklistExpanded, setChecklistExpanded] = useState(true);
  const [localNote, setLocalNote] = useState('');
  const [localPostNote, setLocalPostNote] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const postDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const move = game?.moves[activeMoveIndex];

  // Sync local state when active move changes
  useEffect(() => {
    if (move) {
      setLocalNote(move.noteDuring);
      setLocalPostNote(move.notePost);
    }
  }, [activeMoveIndex, move?.noteDuring, move?.notePost]);

  const handleNoteChange = useCallback(
    (value: string) => {
      setLocalNote(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setMoveNote(activeMoveIndex, value);
      }, ANNOTATION_DEBOUNCE_MS);
    },
    [activeMoveIndex, setMoveNote],
  );

  const handlePostNoteChange = useCallback(
    (value: string) => {
      setLocalPostNote(value);
      clearTimeout(postDebounceRef.current);
      postDebounceRef.current = setTimeout(() => {
        setMovePostNote(activeMoveIndex, value);
      }, ANNOTATION_DEBOUNCE_MS);
    },
    [activeMoveIndex, setMovePostNote],
  );

  if (!game || !move) {
    return (
      <div className="annotation-panel empty">
        <p>No move selected</p>
      </div>
    );
  }

  const timeStr = (move.timeSpentMs / 1000).toFixed(1);
  const clockStr = formatClock(move.clockRemainingMs);

  return (
    <div className="annotation-panel">
      <div className="annotation-header">
        <span className="move-info">
          {move.number}{move.color === 'b' ? '...' : '.'} {move.san}
        </span>
        <span className="time-info">
          ⏱ {timeStr}s | 🕐 {clockStr}
        </span>
      </div>

      <div className="annotation-section">
        <Checklist
          checklist={move.checklist}
          onChange={(cl) => setMoveChecklist(activeMoveIndex, cl)}
          disabled={isReviewMode}
          collapsed={!checklistExpanded}
        />
        <button
          className="toggle-btn"
          onClick={() => setChecklistExpanded(!checklistExpanded)}
          type="button"
        >
          {checklistExpanded ? '▼' : '▶'} Protocol
        </button>
      </div>

      <div className="annotation-section">
        <TagSelector
          selected={move.tags}
          onChange={(tags) => setMoveTags(activeMoveIndex, tags)}
        />
      </div>

      <div className="annotation-section">
        <CertaintyRating
          value={move.certainty}
          onChange={(c) => setMoveCertainty(activeMoveIndex, c)}
        />
      </div>

      <div className="annotation-section">
        <label className="note-label">
          {isReviewMode ? 'Live Note (read-only):' : 'Note:'}
        </label>
        <textarea
          className="note-input"
          value={localNote}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="What are you thinking about this move?"
          rows={3}
          readOnly={isReviewMode}
        />
      </div>

      {isReviewMode && (
        <div className="annotation-section">
          <label className="note-label">Post-Game Note:</label>
          <textarea
            className="note-input post-note"
            value={localPostNote}
            onChange={(e) => handlePostNoteChange(e.target.value)}
            placeholder="What do you think now, after seeing the engine analysis?"
            rows={3}
          />
        </div>
      )}

      {isReviewMode && (
        <div className="annotation-section engine-section">
          <label className="note-label">Engine Data (manual entry):</label>
          <div className="engine-inputs">
            <input
              type="number"
              placeholder="Eval (cp)"
              className="engine-input"
              value={move.engineEval ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                useGameStore.getState().updateMoveAnnotation(activeMoveIndex, { engineEval: val, evalType: 'cp' });
              }}
            />
            <input
              type="number"
              placeholder="CPL"
              className="engine-input"
              value={move.cpl ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                useGameStore.getState().updateMoveAnnotation(activeMoveIndex, { cpl: val });
              }}
            />
            <input
              type="text"
              placeholder="Best move"
              className="engine-input"
              value={move.bestMove ?? ''}
              onChange={(e) => {
                useGameStore.getState().updateMoveAnnotation(activeMoveIndex, { bestMove: e.target.value || undefined });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
