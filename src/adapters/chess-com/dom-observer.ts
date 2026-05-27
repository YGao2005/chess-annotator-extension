import { SELECTORS, querySelector } from './dom-selectors';

export interface DOMObserverCallbacks {
  onMoveListChange: () => void;
  onClockChange: () => void;
  onGameOverDetected: () => void;
  onBoardAppear: () => void;
}

export class DOMObserver {
  private moveListObserver: MutationObserver | null = null;
  private clockObserver: MutationObserver | null = null;
  private bodyObserver: MutationObserver | null = null;
  private callbacks: DOMObserverCallbacks;
  private boardDetected = false;

  constructor(callbacks: DOMObserverCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    this.observeBody();
    this.tryAttachObservers();
  }

  stop(): void {
    this.moveListObserver?.disconnect();
    this.clockObserver?.disconnect();
    this.bodyObserver?.disconnect();
    this.moveListObserver = null;
    this.clockObserver = null;
    this.bodyObserver = null;
    this.boardDetected = false;
  }

  private observeBody(): void {
    this.bodyObserver = new MutationObserver(() => {
      this.tryAttachObservers();
      this.checkGameOver();
    });

    this.bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private tryAttachObservers(): void {
    if (!this.boardDetected) {
      const board = querySelector(SELECTORS.board) ?? querySelector(SELECTORS.boardFallback);
      if (board) {
        this.boardDetected = true;
        this.callbacks.onBoardAppear();
      }
    }

    if (!this.moveListObserver) {
      const moveList = querySelector(SELECTORS.moveList);
      if (moveList) {
        this.moveListObserver = new MutationObserver(() => {
          this.callbacks.onMoveListChange();
        });
        this.moveListObserver.observe(moveList, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
    }

    if (!this.clockObserver) {
      const clockWhite = querySelector(SELECTORS.clockWhite);
      const clockBlack = querySelector(SELECTORS.clockBlack);
      if (clockWhite && clockBlack) {
        this.clockObserver = new MutationObserver(() => {
          this.callbacks.onClockChange();
        });
        this.clockObserver.observe(clockWhite, {
          childList: true, subtree: true, characterData: true,
        });
        this.clockObserver.observe(clockBlack, {
          childList: true, subtree: true, characterData: true,
        });
      }
    }
  }

  private checkGameOver(): void {
    const gameOverEl = querySelector(SELECTORS.gameOverModal);
    if (gameOverEl) {
      this.callbacks.onGameOverDetected();
    }
  }
}
