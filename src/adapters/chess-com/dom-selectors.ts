export const SELECTORS = {
  board: 'wc-chess-board',
  boardFallback: '.board',

  playerTop: '.board-layout-player.board-layout-top',
  playerBottom: '.board-layout-player.board-layout-bottom',
  playerUsername: '.cc-user-username-component',

  clockTop: '.clock-component.clock-top',
  clockBottom: '.clock-component.clock-bottom',
  clockTime: '.clock-time-monospace',

  clockWhite: '.clock-component.clock-white',
  clockBlack: '.clock-component.clock-black',

  sidebar: '.board-layout-sidebar',
  moveList: '.move-list-component, [class*="vertical-move-list"]',

  gameOverModal: '.game-over-modal-component, [class*="game-over"]',
  gameResult: '.game-over-header-component, [class*="game-result"]',

  boardLayout: '.board-layout-main, .board-layout',
} as const;

export function querySelector<T extends Element = Element>(
  selector: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(selector);
}

export function querySelectorAll<T extends Element = Element>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}
