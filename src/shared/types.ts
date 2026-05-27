// ===== Move Tags =====

export type MoveTag =
  | 'blunder'
  | 'mistake'
  | 'inaccuracy'
  | 'good'
  | 'excellent'
  | 'no_plan'
  | 'time_pressure'
  | 'opening_prep'
  | 'protocol_skip'
  | 'forced';

export const MOVE_TAGS: MoveTag[] = [
  'blunder',
  'mistake',
  'inaccuracy',
  'good',
  'excellent',
  'no_plan',
  'time_pressure',
  'opening_prep',
  'protocol_skip',
  'forced',
];

// ===== Checklist =====

export type Checklist = [boolean, boolean, boolean, boolean, boolean, boolean, boolean];

export const CHECKLIST_LABELS = [
  'Checks',
  'Captures',
  'Threats',
  'Opponent plan',
  'My plan',
  'Calculate lines',
  'Evaluate position',
] as const;

export const EMPTY_CHECKLIST: Checklist = [false, false, false, false, false, false, false];

// ===== Certainty =====

export type Certainty = 1 | 2 | 3 | 4 | 5 | null;

// ===== Engine Classification =====

export type EngineClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder';

// ===== Move Record =====

export interface MoveRecord {
  number: number;
  color: 'w' | 'b';
  san: string;
  fen: string;

  wallClockAt: number;
  timeSpentMs: number;
  clockRemainingMs: number;
  opponentClockRemainingMs: number;

  checklist: Checklist;
  tags: MoveTag[];
  certainty: Certainty;
  noteDuring: string;

  notePost: string;

  engineEval?: number;
  evalType?: 'cp' | 'mate';
  cpl?: number;
  bestMove?: string;
  engineClassification?: EngineClassification;
}

// ===== Game Result =====

export type GameResult = '1-0' | '0-1' | '1/2-1/2';

export type ResultReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'insufficient'
  | 'agreement'
  | 'repetition'
  | '50move'
  | 'abandonment';

export type TimeControlType = 'bullet' | 'blitz' | 'rapid' | 'classical';

// ===== Game Record =====

export interface GameRecord {
  id: string;
  url: string;

  date: string;
  result: GameResult;
  resultBy: ResultReason;
  myColor: 'w' | 'b';
  myRating: number;
  myRatingChange?: number;
  opponentName: string;
  opponentRating: number;
  timeControl: string;
  timeControlType: TimeControlType;

  opening: string;
  openingEco: string;
  openingVariation?: string;

  moves: MoveRecord[];

  impressionPre: string;
  impressionPost: string;
  mainLesson: string;

  avgCpl?: number;
  blunderCount?: number;
  mistakeCount?: number;
  inaccuracyCount?: number;
  protocolViolationCount?: number;
  rushThresholdMove?: number;
  avgTimePerPhase?: {
    opening: number;
    middlegame: number;
    endgame: number;
  };

  createdAt: string;
  updatedAt: string;
  exportedAt?: string;
  reviewed: boolean;
}

// ===== Helpers =====

export function createEmptyMoveRecord(
  number: number,
  color: 'w' | 'b',
  san: string,
  fen: string,
): MoveRecord {
  return {
    number,
    color,
    san,
    fen,
    wallClockAt: Date.now(),
    timeSpentMs: 0,
    clockRemainingMs: 0,
    opponentClockRemainingMs: 0,
    checklist: [...EMPTY_CHECKLIST] as Checklist,
    tags: [],
    certainty: null,
    noteDuring: '',
    notePost: '',
  };
}

export function classifyTimeControl(timeControl: string): TimeControlType {
  const parts = timeControl.split('+');
  const baseSeconds = parseInt(parts[0], 10);
  const increment = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  const estimated = baseSeconds + 40 * increment;

  if (estimated < 180) return 'bullet';
  if (estimated < 600) return 'blitz';
  if (estimated < 1800) return 'rapid';
  return 'classical';
}
