import { GameStateManager } from './game-state';
import { saveGame, getGame, getAllGames, gameExists } from '@/storage/db';
import type { ExtensionMessage } from '@/shared/protocol';

const gameState = new GameStateManager();

// Track connected ports for side panel communication
const connectedPorts: chrome.runtime.Port[] = [];

// ===== Message Handling =====

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender: chrome.runtime.MessageSender, _sendResponse: (response?: unknown) => void) => {
    handleMessage(message);
    return true;
  },
);

// Long-lived connection from side panel
chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  if (port.name === 'side-panel') {
    connectedPorts.push(port);

    port.onDisconnect.addListener(() => {
      const index = connectedPorts.indexOf(port);
      if (index >= 0) connectedPorts.splice(index, 1);
    });

    port.onMessage.addListener((message: ExtensionMessage) => {
      handleMessage(message);
    });

    // Send current state to newly connected panel
    const current = gameState.getCurrentGame();
    if (current) {
      port.postMessage({ type: 'STATE_SYNC', payload: current });
    }
  }
});

async function handleMessage(message: ExtensionMessage): Promise<void> {
  switch (message.type) {
    case 'GAME_STARTED': {
      const exists = await gameExists(message.payload.gameId);
      if (exists) {
        console.log(`[ChessAnnotation] Game ${message.payload.gameId} already exists, loading`);
        const existing = await getGame(message.payload.gameId);
        if (existing) {
          gameState.setCurrentGame(existing);
          broadcastToPanel({ type: 'STATE_SYNC', payload: existing });
        }
        return;
      }

      const game = gameState.startGame(message.payload);
      await saveGame(game);
      broadcastToPanel({ type: 'STATE_SYNC', payload: game });
      break;
    }

    case 'MOVE_PLAYED': {
      const game = gameState.addMove(message.payload.move, message.payload.clockState);
      if (game) {
        await saveGame(game);
        broadcastToPanel({ type: 'STATE_SYNC', payload: game });
      }
      break;
    }

    case 'GAME_ENDED': {
      const game = gameState.endGame(message.payload);
      if (game) {
        await saveGame(game);
        broadcastToPanel({ type: 'STATE_SYNC', payload: game });
      }
      break;
    }

    case 'ANNOTATION_SAVED': {
      const game = gameState.updateAnnotation(
        message.payload.moveIndex,
        message.payload.annotation,
      );
      if (game) {
        await saveGame(game);
        broadcastToPanel({ type: 'STATE_SYNC', payload: game });
      }
      break;
    }

    case 'GAME_IMPRESSION': {
      const game = gameState.updateImpression(message.payload);
      if (game) {
        await saveGame(game);
        broadcastToPanel({ type: 'STATE_SYNC', payload: game });
      }
      break;
    }

    case 'REQUEST_STATE': {
      const current = gameState.getCurrentGame();
      if (current) {
        broadcastToPanel({ type: 'STATE_SYNC', payload: current });
      }
      break;
    }

    case 'SIDE_PANEL_READY': {
      const current = gameState.getCurrentGame();
      if (current) {
        broadcastToPanel({ type: 'STATE_SYNC', payload: current });
      }
      break;
    }

    case 'CONTENT_SCRIPT_READY': {
      // Content script is ready, nothing to do yet
      break;
    }

    case 'REQUEST_ALL_GAMES': {
      const allGames = await getAllGames();
      broadcastToPanel({ type: 'ALL_GAMES_SYNC', payload: allGames });
      break;
    }

    default:
      break;
  }
}

function broadcastToPanel(message: ExtensionMessage): void {
  for (const port of connectedPorts) {
    try {
      port.postMessage(message);
    } catch {
      // Port disconnected
    }
  }
}

// ===== Side Panel Setup =====

chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });

// Open side panel when action icon is clicked
chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  if (tab.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (err) {
      console.warn('[ChessAnnotation] Failed to open side panel:', err);
    }
  }
});
