import React, { useRef, useEffect } from 'react';
import type { MoveRecord } from '@/shared/types';

interface MoveListProps {
  moves: MoveRecord[];
  activeMoveIndex: number;
  onMoveSelect: (index: number) => void;
}

export const MoveList: React.FC<MoveListProps> = ({ moves, activeMoveIndex, onMoveSelect }) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeMoveIndex]);

  if (moves.length === 0) {
    return <div className="move-list-empty">Waiting for moves...</div>;
  }

  const rows: { number: number; white?: { move: MoveRecord; index: number }; black?: { move: MoveRecord; index: number } }[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (move.color === 'w') {
      rows.push({ number: move.number, white: { move, index: i } });
    } else {
      const lastRow = rows[rows.length - 1];
      if (lastRow && lastRow.number === move.number && !lastRow.black) {
        lastRow.black = { move, index: i };
      } else {
        rows.push({ number: move.number, black: { move, index: i } });
      }
    }
  }

  return (
    <div className="move-list">
      {rows.map(row => (
        <div key={row.number} className="move-row">
          <span className="move-number">{row.number}.</span>
          {row.white ? (
            <button
              ref={row.white.index === activeMoveIndex ? activeRef : null}
              className={`move-btn ${row.white.index === activeMoveIndex ? 'active' : ''} ${getMoveClass(row.white.move)}`}
              onClick={() => onMoveSelect(row.white!.index)}
              type="button"
            >
              {row.white.move.san}
              {row.white.move.tags.length > 0 && <span className="move-indicator" />}
            </button>
          ) : (
            <span className="move-placeholder">...</span>
          )}
          {row.black ? (
            <button
              ref={row.black.index === activeMoveIndex ? activeRef : null}
              className={`move-btn ${row.black.index === activeMoveIndex ? 'active' : ''} ${getMoveClass(row.black.move)}`}
              onClick={() => onMoveSelect(row.black!.index)}
              type="button"
            >
              {row.black.move.san}
              {row.black.move.tags.length > 0 && <span className="move-indicator" />}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
};

function getMoveClass(move: MoveRecord): string {
  if (move.tags.includes('blunder')) return 'tag-blunder';
  if (move.tags.includes('mistake')) return 'tag-mistake';
  if (move.tags.includes('inaccuracy')) return 'tag-inaccuracy';
  if (move.tags.includes('excellent')) return 'tag-excellent';
  if (move.tags.includes('good')) return 'tag-good';
  if (move.tags.includes('possible_protocol_skip')) return 'tag-auto-skip';
  return '';
}
