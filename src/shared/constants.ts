export const PROTOCOL_SKIP_THRESHOLD_MS = 5000;
export const TIME_PRESSURE_THRESHOLD_MS = 30000;
export const RUSH_THRESHOLD_PERCENT = 0.2;

export const PHASE_BOUNDARIES = {
  opening: { start: 1, end: 10 },
  middlegame: { start: 11, end: 30 },
  endgame: { start: 31, end: Infinity },
} as const;

export const DB_NAME = 'ChessAnnotations';
export const DB_VERSION = 1;

export const ANNOTATION_DEBOUNCE_MS = 500;
