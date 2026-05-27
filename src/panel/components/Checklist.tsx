import React from 'react';
import type { Checklist as ChecklistType } from '@/shared/types';
import { CHECKLIST_LABELS } from '@/shared/types';

interface ChecklistProps {
  checklist: ChecklistType;
  onChange: (checklist: ChecklistType) => void;
  disabled?: boolean;
  collapsed?: boolean;
}

export const Checklist: React.FC<ChecklistProps> = ({
  checklist,
  onChange,
  disabled,
  collapsed = false,
}) => {
  const toggle = (index: number) => {
    if (disabled) return;
    const updated = [...checklist] as ChecklistType;
    updated[index] = !updated[index];
    onChange(updated);
  };

  const completedCount = checklist.filter(Boolean).length;

  if (collapsed) {
    return (
      <div className="checklist-collapsed">
        <span className="checklist-summary">
          Protocol: {completedCount}/7
        </span>
        <div className="checklist-dots">
          {checklist.map((checked, i) => (
            <span
              key={i}
              className={`dot ${checked ? 'checked' : ''}`}
              title={CHECKLIST_LABELS[i]}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="checklist">
      <div className="checklist-header">
        Protocol ({completedCount}/7)
      </div>
      {CHECKLIST_LABELS.map((label, i) => (
        <label key={i} className="checklist-item">
          <input
            type="checkbox"
            checked={checklist[i]}
            onChange={() => toggle(i)}
            disabled={disabled}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
};
