import React from 'react';
import type { Certainty } from '@/shared/types';

interface CertaintyRatingProps {
  value: Certainty;
  onChange: (value: Certainty) => void;
  disabled?: boolean;
}

export const CertaintyRating: React.FC<CertaintyRatingProps> = ({ value, onChange, disabled }) => {
  const handleClick = (star: 1 | 2 | 3 | 4 | 5) => {
    if (disabled) return;
    onChange(value === star ? null : star);
  };

  return (
    <div className="certainty-rating">
      <span className="certainty-label">Confidence:</span>
      <div className="stars">
        {([1, 2, 3, 4, 5] as const).map(star => (
          <button
            key={star}
            className={`star ${value !== null && star <= value ? 'filled' : ''}`}
            onClick={() => handleClick(star)}
            disabled={disabled}
            type="button"
            title={`${star}/5`}
          >
            {value !== null && star <= value ? '★' : '☆'}
          </button>
        ))}
      </div>
    </div>
  );
};
