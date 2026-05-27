import { ChessComAdapter } from '@/adapters/chess-com/adapter';
import type { ExtensionMessage } from '@/shared/protocol';

const adapter = new ChessComAdapter();
let initialized = false;

function sendMessage(message: ExtensionMessage): void {
  try {
    chrome.runtime.sendMessage(message);
  } catch (err) {
    console.warn('[ChessAnnotation] Failed to send message:', err);
  }
}

function init(): void {
  if (initialized) return;
  initialized = true;

  adapter.onGameStart((meta) => {
    console.log('[ChessAnnotation] Game started:', meta.gameId);
    sendMessage({ type: 'GAME_STARTED', payload: meta });
  });

  adapter.onMove(({ move, clockState }) => {
    console.log('[ChessAnnotation] Move:', move.san);
    sendMessage({ type: 'MOVE_PLAYED', payload: { move, clockState } });
  });

  adapter.onClockUpdate((clockState) => {
    sendMessage({ type: 'CLOCK_UPDATE', payload: clockState });
  });

  adapter.onGameEnd((endInfo) => {
    console.log('[ChessAnnotation] Game ended:', endInfo.result);
    sendMessage({ type: 'GAME_ENDED', payload: endInfo });
  });

  adapter.initialize();
  sendMessage({ type: 'CONTENT_SCRIPT_READY', payload: null });
  console.log('[ChessAnnotation] Content script initialized');
}

// Listen for messages from service worker / side panel
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
  if (message.type === 'REQUEST_STATE') {
    const gameId = adapter.getGameId();
    const fen = adapter.getCurrentFEN();
    const moves = adapter.getMoveHistory();
    const clocks = adapter.getClockState();
    const isActive = adapter.isGameActive();

    sendResponse({
      gameId,
      fen,
      moves,
      clocks,
      isActive,
    });
  }
  return true;
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-initialize on SPA navigation (chess.com is a React SPA)
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (location.pathname.match(/\/game\/|\/play\//)) {
      console.log('[ChessAnnotation] SPA navigation detected, re-initializing');
      adapter.destroy();
      initialized = false;
      init();
    }
  }
});

urlObserver.observe(document.body, {
  childList: true,
  subtree: true,
});
