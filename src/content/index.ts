import type { ExtensionMessage } from '@/shared/protocol';

const BRIDGE_PREFIX = 'chess-annotation-bridge';

function sendMessage(message: ExtensionMessage): void {
  try {
    chrome.runtime.sendMessage(message);
  } catch (err) {
    console.warn('[ChessAnnotation] Failed to send message:', err);
  }
}

// Listen for bridge messages from MAIN world injector
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== BRIDGE_PREFIX) return;

  const { type, payload } = event.data;
  switch (type) {
    case 'GAME_STARTED':
      console.log('[ChessAnnotation] Game started:', payload.gameId);
      sendMessage({ type: 'GAME_STARTED', payload });
      break;
    case 'MOVE_PLAYED':
      console.log('[ChessAnnotation] Move:', payload.move.san);
      sendMessage({ type: 'MOVE_PLAYED', payload });
      break;
    case 'GAME_ENDED':
      console.log('[ChessAnnotation] Game ended:', payload.result);
      sendMessage({ type: 'GAME_ENDED', payload });
      break;
    case 'STATE_RESPONSE':
      // Handled by REQUEST_STATE listener below
      break;
  }
});

// Listen for messages from service worker / side panel
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
  if (message.type === 'REQUEST_STATE') {
    // Ask the bridge for current state
    const handler = (event: MessageEvent) => {
      if (event.data?.source === BRIDGE_PREFIX && event.data?.type === 'STATE_RESPONSE') {
        window.removeEventListener('message', handler);
        sendResponse(event.data.payload);
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({ source: `${BRIDGE_PREFIX}-request`, type: 'REQUEST_STATE' }, '*');
    return true; // async response
  }
  return true;
});

sendMessage({ type: 'CONTENT_SCRIPT_READY', payload: null });
console.log('[ChessAnnotation] Content script initialized');
