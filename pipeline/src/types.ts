/**
 * Pipeline types — re-exports the extension's shared types for CLI use.
 * Also defines pipeline-specific types.
 */

// Re-export core types from extension (copied inline to avoid path alias issues in CLI)
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
  | 'possible_protocol_skip'
  | 'forced';

export type Certainty = 1 | 2 | 3 | 4 | 5 | null;
export type Checklist = [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
export type GameResult = '1-0' | '0-1' | '1/2-1/2';
export type ResultReason =
  | 'checkmate' | 'resignation' | 'timeout' | 'stalemate'
  | 'insufficient' | 'agreement' | 'repetition' | '50move' | 'abandonment';
export type TimeControlType = 'bullet' | 'blitz' | 'rapid' | 'classical';
export type EngineClassification =
  | 'brilliant' | 'great' | 'best' | 'excellent' | 'good'
  | 'book' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';

export type AutoTagStatus = 'pending' | 'confirmed' | 'dismissed';

export interface AutoTagState {
  tag: MoveTag;
  status: AutoTagStatus;
  reason: string;
}

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
  autoTags?: AutoTagState[];
  engineEval?: number;
  evalType?: 'cp' | 'mate';
  cpl?: number;
  bestMove?: string;
  engineClassification?: EngineClassification;
}

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

// Pipeline-specific types

export interface MetricsData {
  totalGames: number;
  gamesReviewed: number;
  currentRating: number;
  ratingTrend: number[];
  avgCpl: number;
  blunderRate: number;
  mistakeRate: number;
  protocolViolationRate: number;
  gamesThisWeek: number;
  gamesReviewedThisWeek: number;
}

export interface MistakePattern {
  id: string;
  description: string;
  frequency: number;
  lastSeen: string;
  moveRange: string;
  tags: MoveTag[];
  gameIds: string[];
  notes: string[];
}

export interface WeeklyReviewData {
  weekNumber: number;
  startDate: string;
  endDate: string;
  gamesPlayed: number;
  gamesReviewed: number;
  avgCpl: number;
  blunders: number;
  mistakes: number;
  protocolViolations: number;
  openingBreakdown: { name: string; games: number; winRate: number }[];
  topMistakePatterns: MistakePattern[];
  timeManagement: { avgTimePerMove: number; rushMoves: number; timePressureMoves: number };
  rating: { start: number; end: number; change: number };
}

export interface OpeningPosition {
  fen: string;
  moveNumber: number;
  timesReached: number;
  avgTimeSpent: number;
  results: { wins: number; draws: number; losses: number };
  notes: string[];
  questions: string[];
}
