import React from 'react';
import type { MoveTag } from '@/shared/types';
import { MOVE_TAGS, AUTO_TAGS } from '@/shared/types';

interface TagSelectorProps {
  selected: MoveTag[];
  onChange: (tags: MoveTag[]) => void;
  disabled?: boolean;
}

const TAG_COLORS: Record<MoveTag, string> = {
  blunder: '#ef4444',
  mistake: '#f97316',
  inaccuracy: '#eab308',
  good: '#22c55e',
  excellent: '#16a34a',
  no_plan: '#a855f7',
  time_pressure: '#ef4444',
  opening_prep: '#3b82f6',
  protocol_skip: '#f97316',
  possible_protocol_skip: '#f97316',
  forced: '#94a3b8',
};

const TAG_LABELS: Record<MoveTag, string> = {
  blunder: '??',
  mistake: '?',
  inaccuracy: '?!',
  good: '!',
  excellent: '!!',
  no_plan: 'No Plan',
  time_pressure: 'Time',
  opening_prep: 'Prep',
  protocol_skip: 'Skip',
  possible_protocol_skip: 'Auto-Skip',
  forced: 'Forced',
};

const MANUAL_TAGS = MOVE_TAGS.filter(t => !AUTO_TAGS.includes(t));

export const TagSelector: React.FC<TagSelectorProps> = ({ selected, onChange, disabled }) => {
  const toggle = (tag: MoveTag) => {
    if (disabled) return;
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="tag-selector">
      {MANUAL_TAGS.map(tag => (
        <button
          key={tag}
          className={`tag-chip ${selected.includes(tag) ? 'active' : ''}`}
          style={{
            '--tag-color': TAG_COLORS[tag],
          } as React.CSSProperties}
          onClick={() => toggle(tag)}
          disabled={disabled}
          title={tag}
          type="button"
        >
          {TAG_LABELS[tag]}
        </button>
      ))}
      {AUTO_TAGS.filter(t => selected.includes(t)).map(tag => (
        <span
          key={tag}
          className="tag-chip active auto-tag"
          style={{
            '--tag-color': TAG_COLORS[tag],
          } as React.CSSProperties}
          title={`${tag} (auto-applied)`}
        >
          {TAG_LABELS[tag]}
        </span>
      ))}
    </div>
  );
};
