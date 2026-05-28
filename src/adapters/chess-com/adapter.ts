import { SELECTORS, querySelector } from './dom-selectors';
import { DOMObserver } from './dom-observer';
import type { WcChessBoardElement, ChessComGameObject } from './types';
import type { RawMove, ClockState, GameMeta, GameEndInfo } from '@/shared/protocol';
import type { GameResult, ResultReason } from '@/shared/types';

type EventCallback<T> = (data: T) => void;

export class ChessComAdapter {
  private game: ChessComGameObject | null = null;
  private domObserver: DOMObserver;
  private moveCount = 0;
  private lastClockState: ClockState = { whiteMs: 0, blackMs: 0 };
  private gameActive = false;
  private gameEndEmitted = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private syntheticGameId: string | null = null;

  private onGameStartCallbacks: EventCallback<GameMeta>[] = [];
  private onMoveCallbacks: EventCallback<{ move: RawMove; clockState: ClockState }>[] = [];
  private onClockUpdateCallbacks: EventCallback<ClockState>[] = [];
  private onGameEndCallbacks: EventCallback<GameEndInfo>[] = [];

  constructor() {
    this.domObserver = new DOMObserver({
      onMoveListChange: () => this.handleMoveListChange(),
      onClockChange: () => this.handleClockChange(),
      onGameOverDetected: () => this.handleGameOver(),
      onBoardAppear: () => this.handleBoardAppear(),
    });
  }

  initialize(): void {
    this.tryAttachGameObject();
    this.domObserver.start();

    if (this.game) {
      this.attachGameEvents();
      this.tryDetectActiveGame();
    }

    // Poll for game object (handles late-loading boards and new games after end)
    this.pollInterval = setInterval(() => {
      if (!this.game) {
        this.tryAttachGameObject();
        if (this.game) {
          this.attachGameEvents();
          this.tryDetectActiveGame();
        }
      } else if (!this.gameActive) {
        // Re-fetch game object — chess.com may have replaced it for a new game
        const oldGame = this.game;
        this.tryAttachGameObject();
        if (this.game !== oldGame) {
          this.syntheticGameId = null;
          this.moveCount = 0;
          this.attachGameEvents();
        }
        this.tryDetectActiveGame();
      }
    }, 1000);
  }

  destroy(): void {
    this.detachGameEvents();
    this.domObserver.stop();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.game = null;
    this.gameActive = false;
    this.syntheticGameId = null;
  }

  // ===== Event registration =====

  onGameStart(cb: EventCallback<GameMeta>): void {
    this.onGameStartCallbacks.push(cb);
  }

  onMove(cb: EventCallback<{ move: RawMove; clockState: ClockState }>): void {
    this.onMoveCallbacks.push(cb);
  }

  onClockUpdate(cb: EventCallback<ClockState>): void {
    this.onClockUpdateCallbacks.push(cb);
  }

  onGameEnd(cb: EventCallback<GameEndInfo>): void {
    this.onGameEndCallbacks.push(cb);
  }

  // ===== Queries =====

  getCurrentFEN(): string | null {
    return this.game?.getFEN() ?? null;
  }

  getGameId(): string | null {
    // Try to extract from /game/live/<id> URL
    const liveMatch = window.location.pathname.match(/\/game\/live\/(\d+)/);
    if (liveMatch) return liveMatch[1];

    // For bot games (/play/computer) and other non-live URLs, generate a synthetic ID
    if (window.location.pathname.match(/\/play\//)) {
      if (!this.syntheticGameId) {
        this.syntheticGameId = `bot-${Date.now()}`;
      }
      return this.syntheticGameId;
    }

    return null;
  }

  getMoveHistory(): string[] {
    return this.game?.getHistorySANs() ?? [];
  }

  isGameActive(): boolean {
    return this.gameActive;
  }

  getClockState(): ClockState {
    return { ...this.lastClockState };
  }

  // ===== Private: Game Object Access =====

  private tryAttachGameObject(): void {
    const boardEl = querySelector<WcChessBoardElement>(SELECTORS.board)
      ?? querySelector<WcChessBoardElement>(SELECTORS.boardFallback);

    if (boardEl && 'game' in boardEl) {
      this.game = boardEl.game;
    }
  }

  private attachGameEvents(): void {
    if (!this.game) return;

    this.game.on('Move', (data: unknown) => this.handleGameMove(data));
    this.game.on('CreateGame', () => this.handleCreateGame());
    this.game.on('Load', () => this.handleGameLoad());
  }

  private detachGameEvents(): void {
    // Game object events are cleaned up when the game object is released
  }

  // ===== Private: Event Handlers =====

  private handleBoardAppear(): void {
    this.tryAttachGameObject();
    if (this.game) {
      this.attachGameEvents();
      this.tryDetectActiveGame();
    }
  }

  private tryDetectActiveGame(): void {
    if (this.gameActive || !this.game) return;

    // Check if a game is already in progress (handles late attachment)
    const sans = this.game.getHistorySANs();
    const isOver = this.game.isGameOver();

    // A game is active if there are moves and it's not over,
    // OR if we're on /play/ page with a non-finished game
    const onPlayPage = window.location.pathname.match(/\/play\//);
    if ((sans.length > 0 && !isOver) || (onPlayPage && !isOver)) {
      this.gameActive = true;
      this.gameEndEmitted = false;

      const meta = this.extractGameMeta();
      if (meta) {
        this.onGameStartCallbacks.forEach(cb => cb(meta));
      }

      // Emit any existing moves
      if (sans.length > this.moveCount) {
        for (let i = this.moveCount; i < sans.length; i++) {
          const moveNumber = Math.ceil((i + 1) / 2);
          const color: 'w' | 'b' = (i + 1) % 2 === 1 ? 'w' : 'b';
          const clockState = this.scrapeClocks();
          this.lastClockState = clockState;

          const move: RawMove = {
            san: sans[i],
            color,
            number: moveNumber,
            wallClockAt: Date.now(),
          };

          this.onMoveCallbacks.forEach(cb => cb({ move, clockState }));
        }
        this.moveCount = sans.length;
      }

      if (isOver) {
        this.handleGameOver();
      }
    }
  }

  private handleCreateGame(): void {
    this.gameActive = true;
    this.gameEndEmitted = false;
    this.moveCount = 0;
    this.syntheticGameId = null;

    const meta = this.extractGameMeta();
    if (meta) {
      this.onGameStartCallbacks.forEach(cb => cb(meta));
    }
  }

  private handleGameLoad(): void {
    this.tryAttachGameObject();
    if (this.game && !this.gameActive) {
      const sans = this.game.getHistorySANs();
      if (sans.length > 0) {
        this.moveCount = sans.length;
      }
    }
  }

  private handleGameMove(_data: unknown): void {
    if (!this.game) return;

    const sans = this.game.getHistorySANs();
    if (sans.length <= this.moveCount) return;

    const newSan = sans[sans.length - 1];
    const moveNumber = Math.ceil(sans.length / 2);
    const color: 'w' | 'b' = sans.length % 2 === 1 ? 'w' : 'b';

    const clockState = this.scrapeClocks();
    this.lastClockState = clockState;

    const move: RawMove = {
      san: newSan,
      color,
      number: moveNumber,
      wallClockAt: Date.now(),
    };

    this.moveCount = sans.length;

    this.onMoveCallbacks.forEach(cb => cb({ move, clockState }));

    if (this.game.isGameOver()) {
      this.handleGameOver();
    }
  }

  private handleMoveListChange(): void {
    if (!this.game) {
      this.tryAttachGameObject();
    }

    if (!this.game) return;

    const sans = this.game.getHistorySANs();
    if (sans.length > this.moveCount) {
      for (let i = this.moveCount; i < sans.length; i++) {
        const moveNumber = Math.ceil((i + 1) / 2);
        const color: 'w' | 'b' = (i + 1) % 2 === 1 ? 'w' : 'b';
        const clockState = this.scrapeClocks();
        this.lastClockState = clockState;

        const move: RawMove = {
          san: sans[i],
          color,
          number: moveNumber,
          wallClockAt: Date.now(),
        };

        this.onMoveCallbacks.forEach(cb => cb({ move, clockState }));
      }
      this.moveCount = sans.length;
    }
  }

  private handleClockChange(): void {
    const clockState = this.scrapeClocks();
    if (
      clockState.whiteMs !== this.lastClockState.whiteMs ||
      clockState.blackMs !== this.lastClockState.blackMs
    ) {
      this.lastClockState = clockState;
      this.onClockUpdateCallbacks.forEach(cb => cb(clockState));
    }
  }

  private handleGameOver(): void {
    if (this.gameEndEmitted) return;
    this.gameEndEmitted = true;
    this.gameActive = false;

    const endInfo = this.extractGameEndInfo();
    if (endInfo) {
      this.onGameEndCallbacks.forEach(cb => cb(endInfo));
    }
  }

  // ===== Private: Data Extraction =====

  private extractGameMeta(): GameMeta | null {
    const gameId = this.getGameId();
    if (!gameId) return null;

    const headers = this.game?.getHeaders() ?? {};
    const playingAs = this.game?.getPlayingAs();

    const { topName, topRating, bottomName, bottomRating } = this.scrapePlayerInfo();
    const myColor: 'w' | 'b' = playingAs === 2 ? 'b' : 'w';

    const isFlipped = this.game?.state?.isFlipped ?? false;
    const bottomIsWhite = !isFlipped;

    let myRating: number, opponentName: string, opponentRating: number;
    if ((myColor === 'w' && bottomIsWhite) || (myColor === 'b' && !bottomIsWhite)) {
      myRating = bottomRating;
      opponentName = topName;
      opponentRating = topRating;
    } else {
      myRating = topRating;
      opponentName = bottomName;
      opponentRating = bottomRating;
    }

    const timeControl = this.extractTimeControl(headers);

    return {
      gameId,
      url: window.location.href,
      myColor,
      myRating,
      opponentName,
      opponentRating,
      timeControl,
      date: new Date().toISOString(),
    };
  }

  private extractGameEndInfo(): GameEndInfo {
    const headers = this.game?.getHeaders() ?? {};
    const resultStr = this.game?.getResult() ?? headers['Result'] ?? '*';

    let result: GameResult = '1/2-1/2';
    if (resultStr === '1-0') result = '1-0';
    else if (resultStr === '0-1') result = '0-1';

    const resultBy = this.inferResultReason(headers);

    const eco = this.game?.eco?.get?.();
    const openingData = this.game?.state?.openingData;

    return {
      result,
      resultBy,
      opening: eco?.name ?? openingData?.name ?? headers['Opening'] ?? 'Unknown',
      openingEco: eco?.code ?? headers['ECO'] ?? '',
      openingVariation: headers['Variation'],
    };
  }

  private inferResultReason(headers: Record<string, string>): ResultReason {
    const termination = (headers['Termination'] ?? '').toLowerCase();
    if (termination.includes('checkmate')) return 'checkmate';
    if (termination.includes('resign')) return 'resignation';
    if (termination.includes('time')) return 'timeout';
    if (termination.includes('stalemate')) return 'stalemate';
    if (termination.includes('insufficient')) return 'insufficient';
    if (termination.includes('agreement') || termination.includes('draw')) return 'agreement';
    if (termination.includes('repetition')) return 'repetition';
    if (termination.includes('50') || termination.includes('fifty')) return '50move';
    if (termination.includes('abandon')) return 'abandonment';

    // Fallback: check if game is in checkmate position
    if (this.game?.isGameOver()) {
      const fen = this.game.getFEN();
      if (fen.includes(' ')) {
        return 'resignation';
      }
    }

    return 'resignation';
  }

  private extractTimeControl(headers: Record<string, string>): string {
    if (headers['TimeControl']) return headers['TimeControl'];

    const clockEl = querySelector(SELECTORS.clockTime);
    const text = clockEl?.textContent?.trim() ?? '';
    const match = text.match(/(\d+):(\d+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      return String(minutes * 60 + seconds);
    }

    return '600';
  }

  // ===== Private: DOM Scraping =====

  private scrapeClocks(): ClockState {
    const whiteMs = this.scrapeClockMs(SELECTORS.clockWhite);
    const blackMs = this.scrapeClockMs(SELECTORS.clockBlack);
    return { whiteMs, blackMs };
  }

  private scrapeClockMs(selector: string): number {
    const clockEl = querySelector(selector);
    if (!clockEl) return 0;

    const timeEl = clockEl.querySelector(SELECTORS.clockTime);
    const text = timeEl?.textContent?.trim() ?? '';
    return this.parseClockText(text);
  }

  private parseClockText(text: string): number {
    // Formats: "10:00", "5:30", "0:45", "0:05.3", "1:23:45"
    const parts = text.split(':');

    if (parts.length === 3) {
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const s = parseFloat(parts[2]) || 0;
      return (h * 3600 + m * 60 + s) * 1000;
    }

    if (parts.length === 2) {
      const m = parseInt(parts[0], 10) || 0;
      const s = parseFloat(parts[1]) || 0;
      return (m * 60 + s) * 1000;
    }

    const s = parseFloat(text) || 0;
    return s * 1000;
  }

  private scrapePlayerInfo(): {
    topName: string; topRating: number;
    bottomName: string; bottomRating: number;
  } {
    const extractFromPlayer = (selector: string) => {
      const el = querySelector(selector);
      if (!el) return { name: 'Unknown', rating: 0 };

      const nameEl = el.querySelector(SELECTORS.playerUsername);
      const name = nameEl?.textContent?.trim() ?? 'Unknown';

      // Rating is typically in parentheses or a separate element
      const taglineText = el.textContent ?? '';
      const ratingMatch = taglineText.match(/\((\d{3,4})\)/);
      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0;

      return { name, rating };
    };

    const top = extractFromPlayer(SELECTORS.playerTop);
    const bottom = extractFromPlayer(SELECTORS.playerBottom);

    return {
      topName: top.name,
      topRating: top.rating,
      bottomName: bottom.name,
      bottomRating: bottom.rating,
    };
  }
}
