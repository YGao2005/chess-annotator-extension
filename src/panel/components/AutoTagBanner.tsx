import React from 'react';
import type { AutoTagState, MoveTag } from '@/shared/types';

interface AutoTagBannerProps {
  autoTags: AutoTagState[];
  onConfirm: (tag: MoveTag) => void;
  onDismiss: (tag: MoveTag) => void;
  onConfirmAll: () => void;
  onDismissAll: () => void;
}

const TAG_LABELS: Record<string, string> = {
  possible_protocol_skip: 'Protocol Skip',
  time_pressure: 'Time Pressure',
};

const TAG_ICONS: Record<string, string> = {
  possible_protocol_skip: '⚡',
  time_pressure: '⏰',
};

export const AutoTagBanner: React.FC<AutoTagBannerProps> = ({
  autoTags,
  onConfirm,
  onDismiss,
  onConfirmAll,
  onDismissAll,
}) => {
  const pendingTags = autoTags.filter(at => at.status === 'pending');
  const resolvedTags = autoTags.filter(at => at.status !== 'pending');

  if (pendingTags.length === 0 && resolvedTags.length === 0) return null;

  return (
    <div className="auto-tag-banner">
      {pendingTags.length > 0 && (
        <>
          <div className="auto-tag-header">
            <span className="auto-tag-title">Auto-detected tags</span>
            {pendingTags.length > 1 && (
              <div className="auto-tag-bulk">
                <button
                  className="auto-tag-btn confirm-all"
                  onClick={onConfirmAll}
                  type="button"
                  title="Confirm all"
                >
                  ✓ All
                </button>
                <button
                  className="auto-tag-btn dismiss-all"
                  onClick={onDismissAll}
                  type="button"
                  title="Dismiss all"
                >
                  ✕ All
                </button>
              </div>
            )}
          </div>
          {pendingTags.map(at => (
            <div key={at.tag} className="auto-tag-item pending">
              <span className="auto-tag-icon">{TAG_ICONS[at.tag] ?? '🏷'}</span>
              <div className="auto-tag-info">
                <span className="auto-tag-label">{TAG_LABELS[at.tag] ?? at.tag}</span>
                <span className="auto-tag-reason">{at.reason}</span>
              </div>
              <div className="auto-tag-actions">
                <button
                  className="auto-tag-btn confirm"
                  onClick={() => onConfirm(at.tag)}
                  type="button"
                  title="Confirm tag"
                >
                  ✓
                </button>
                <button
                  className="auto-tag-btn dismiss"
                  onClick={() => onDismiss(at.tag)}
                  type="button"
                  title="Dismiss tag"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </>
      )}
      {resolvedTags.length > 0 && (
        <div className="auto-tag-resolved">
          {resolvedTags.map(at => (
            <span
              key={at.tag}
              className={`auto-tag-badge ${at.status}`}
              title={`${TAG_LABELS[at.tag] ?? at.tag}: ${at.reason} (${at.status})`}
            >
              {at.status === 'confirmed' ? '✓' : '✕'} {TAG_LABELS[at.tag] ?? at.tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
