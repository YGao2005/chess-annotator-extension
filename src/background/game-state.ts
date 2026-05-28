import type { GameMeta, GameEndInfo, RawMove, ClockState, MoveAnnotation } from '@/shared/protocol';
import type { GameRecord, MoveRecord } from '@/shared/types';
import { createEmptyMoveRecord, classifyTimeControl } from '@/shared/types';
import { computeAllFens } from '@/chess/fen';

export class GameStateManager {
  private currentGame: GameRecord | null = null;
  private moveTimestamps: number[] = [];

  startGame(meta: GameMeta): GameRecord {
    this.moveTimestamps = [];

    this.currentGame = {
      id: meta.gameId,
      url: meta.url,
      date: meta.date,
      result: '1/2-1/2',
      resultBy: 'agreement',
      myColor: meta.myColor,
      myRating: meta.myRating,
      opponentName: meta.opponentName,
      opponentRating: meta.opponentRating,
      timeControl: meta.timeControl,
      timeControlType: classifyTimeControl(meta.timeControl),
      opening: '',
      openingEco: '',
      moves: [],
      impressionPre: '',
      impressionPost: '',
      mainLesson: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewed: false,
    };

    return { ...this.currentGame };
  }

  addMove(move: RawMove, clockState: ClockState): GameRecord | null {
    if (!this.currentGame) return null;

    const moveIndex = this.currentGame.moves.length;
    const prevTimestamp = this.moveTimestamps[moveIndex - 1] ?? move.wallClockAt;
    const timeSpentMs = moveIndex === 0 ? 0 : move.wallClockAt - prevTimestamp;

    this.moveTimestamps.push(move.wallClockAt);

    const clockRemainingMs = move.color === 'w' ? clockState.whiteMs : clockState.blackMs;
    const opponentClockRemainingMs = move.color === 'w' ? clockState.blackMs : clockState.whiteMs;

    // Compute FEN for this position
    const allSans = this.currentGame.moves.map(m => m.san).concat(move.san);
    const fens = computeAllFens(allSans);
    const fen = fens[fens.length - 1] ?? '';

    const moveRecord: MoveRecord = {
      ...createEmptyMoveRecord(move.number, move.color, move.san, fen),
      wallClockAt: move.wallClockAt,
      timeSpentMs: Math.max(0, timeSpentMs),
      clockRemainingMs,
      opponentClockRemainingMs,
    };

    // Auto-tag: possible_protocol_skip for moves under 5s (skip first move)
    if (moveIndex > 0 && moveRecord.timeSpentMs > 0 && moveRecord.timeSpentMs < 5000) {
      if (!moveRecord.tags.includes('possible_protocol_skip')) {
        moveRecord.tags.push('possible_protocol_skip');
      }
    }

    // Auto-tag: time_pressure when clock < 30s remaining
    if (clockRemainingMs > 0 && clockRemainingMs < 30000) {
      if (!moveRecord.tags.includes('time_pressure')) {
        moveRecord.tags.push('time_pressure');
      }
    }

    this.currentGame.moves.push(moveRecord);
    this.currentGame.updatedAt = new Date().toISOString();

    return { ...this.currentGame };
  }

  endGame(endInfo: GameEndInfo): GameRecord | null {
    if (!this.currentGame) return null;

    this.currentGame.result = endInfo.result;
    this.currentGame.resultBy = endInfo.resultBy;
    this.currentGame.opening = endInfo.opening;
    this.currentGame.openingEco = endInfo.openingEco;
    this.currentGame.openingVariation = endInfo.openingVariation;
    this.currentGame.myRatingChange = endInfo.myRatingChange;
    this.currentGame.updatedAt = new Date().toISOString();

    this.computeAggregates();

    return { ...this.currentGame };
  }

  updateAnnotation(moveIndex: number, annotation: Partial<MoveAnnotation>): GameRecord | null {
    if (!this.currentGame) return null;
    if (moveIndex < 0 || moveIndex >= this.currentGame.moves.length) return null;

    const move = this.currentGame.moves[moveIndex];

    if (annotation.tags !== undefined) move.tags = annotation.tags;
    if (annotation.certainty !== undefined) move.certainty = annotation.certainty;
    if (annotation.checklist !== undefined) move.checklist = annotation.checklist;
    if (annotation.noteDuring !== undefined) move.noteDuring = annotation.noteDuring;
    if (annotation.notePost !== undefined) move.notePost = annotation.notePost;
    if (annotation.engineEval !== undefined) move.engineEval = annotation.engineEval;
    if (annotation.evalType !== undefined) move.evalType = annotation.evalType;
    if (annotation.cpl !== undefined) move.cpl = annotation.cpl;
    if (annotation.bestMove !== undefined) move.bestMove = annotation.bestMove;

    this.currentGame.updatedAt = new Date().toISOString();

    return { ...this.currentGame };
  }

  updateImpression(data: {
    impressionPre?: string;
    impressionPost?: string;
    mainLesson?: string;
  }): GameRecord | null {
    if (!this.currentGame) return null;

    if (data.impressionPre !== undefined) this.currentGame.impressionPre = data.impressionPre;
    if (data.impressionPost !== undefined) this.currentGame.impressionPost = data.impressionPost;
    if (data.mainLesson !== undefined) this.currentGame.mainLesson = data.mainLesson;

    this.currentGame.updatedAt = new Date().toISOString();
    return { ...this.currentGame };
  }

  markReviewed(): GameRecord | null {
    if (!this.currentGame) return null;
    this.currentGame.reviewed = true;
    this.currentGame.updatedAt = new Date().toISOString();
    return { ...this.currentGame };
  }

  getCurrentGame(): GameRecord | null {
    return this.currentGame ? { ...this.currentGame } : null;
  }

  setCurrentGame(game: GameRecord): void {
    this.currentGame = game;
  }

  private computeAggregates(): void {
    if (!this.currentGame) return;

    const moves = this.currentGame.moves;

    // Protocol violations
    const protocolViolations = moves.filter(m => {
      return m.checklist.some((checked, _i) => !checked);
    }).length;
    this.currentGame.protocolViolationCount = protocolViolations;

    // Tag counts
    this.currentGame.blunderCount = moves.filter(m => m.tags.includes('blunder')).length;
    this.currentGame.mistakeCount = moves.filter(m => m.tags.includes('mistake')).length;
    this.currentGame.inaccuracyCount = moves.filter(m => m.tags.includes('inaccuracy')).length;

    // Rush threshold
    const totalTimeMs = parseInt(this.currentGame.timeControl, 10) * 1000 || 600000;
    const threshold = totalTimeMs * 0.2;
    const myMoves = moves.filter(m => m.color === this.currentGame!.myColor);
    const rushMove = myMoves.find(m => m.clockRemainingMs > 0 && m.clockRemainingMs < threshold);
    this.currentGame.rushThresholdMove = rushMove?.number;

    // Average time per phase
    const phaseMoves = {
      opening: myMoves.filter(m => m.number <= 10),
      middlegame: myMoves.filter(m => m.number > 10 && m.number <= 30),
      endgame: myMoves.filter(m => m.number > 30),
    };

    const avgTime = (arr: MoveRecord[]) =>
      arr.length > 0 ? arr.reduce((s, m) => s + m.timeSpentMs, 0) / arr.length : 0;

    this.currentGame.avgTimePerPhase = {
      opening: avgTime(phaseMoves.opening),
      middlegame: avgTime(phaseMoves.middlegame),
      endgame: avgTime(phaseMoves.endgame),
    };

    // Average CPL
    const movesWithCpl = moves.filter(m => m.cpl !== undefined);
    if (movesWithCpl.length > 0) {
      this.currentGame.avgCpl = movesWithCpl.reduce((s, m) => s + (m.cpl ?? 0), 0) / movesWithCpl.length;
    }
  }
}
