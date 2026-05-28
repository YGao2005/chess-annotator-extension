import type { Certainty, Checklist, GameRecord, GameResult, MoveTag, ResultReason } from './types';

// ===== Raw data from adapter =====

export interface RawMove {
  san: string;
  color: 'w' | 'b';
  number: number;
  wallClockAt: number;
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
}

export interface GameMeta {
  gameId: string;
  url: string;
  myColor: 'w' | 'b';
  myRating: number;
  opponentName: string;
  opponentRating: number;
  timeControl: string;
  date: string;
}

export interface GameEndInfo {
  result: GameResult;
  resultBy: ResultReason;
  opening: string;
  openingEco: string;
  openingVariation?: string;
  myRatingChange?: number;
}

// ===== Annotation data from panel =====

export interface MoveAnnotation {
  tags: MoveTag[];
  certainty: Certainty;
  checklist: Checklist;
  noteDuring: string;
  notePost: string;
  engineEval?: number;
  evalType?: 'cp' | 'mate';
  cpl?: number;
  bestMove?: string;
}

// ===== Extension Messages =====

export type ExtensionMessage =
  | { type: 'GAME_STARTED'; payload: GameMeta }
  | { type: 'MOVE_PLAYED'; payload: { move: RawMove; clockState: ClockState } }
  | { type: 'CLOCK_UPDATE'; payload: ClockState }
  | { type: 'GAME_ENDED'; payload: GameEndInfo }
  | { type: 'ANNOTATION_SAVED'; payload: { moveIndex: number; annotation: Partial<MoveAnnotation> } }
  | { type: 'EXPORT_REQUEST'; payload: { gameId: string; format: 'jsonl' | 'markdown' } }
  | { type: 'STATE_SYNC'; payload: GameRecord }
  | { type: 'REQUEST_STATE'; payload: null }
  | { type: 'GAME_IMPRESSION'; payload: { impressionPre?: string; impressionPost?: string; mainLesson?: string } }
  | { type: 'ACTIVE_MOVE_CHANGED'; payload: { moveIndex: number } }
  | { type: 'CONTENT_SCRIPT_READY'; payload: null }
  | { type: 'SIDE_PANEL_READY'; payload: null };
