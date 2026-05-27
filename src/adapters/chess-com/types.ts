export interface ChessComGameObject {
  getFEN(): string;
  getTurn(): number;
  getResult(): string;
  getPlayingAs(): number | undefined;
  setPlayingAs(color: number): void;
  getHistorySANs(): string[];
  getHistoryFENs(): string[];
  getHeaders(): Record<string, string>;
  isGameOver(): boolean;
  getPGN(): string;
  getLastMove(): ChessComMoveData | null;
  getMove(index: number): ChessComMoveData | null;
  getStartingMoveNumber(): number;
  getVariant(): string;

  on(event: string, callback: (data: unknown) => void): void;
  off(event: string, callback: (data: unknown) => void): void;

  timeControl: Record<string, unknown>;
  times: Record<string, unknown>;
  timestamps: Record<string, unknown>;

  eco: {
    get(): ChessComECOData | null;
    update(): void;
  };

  state: ChessComBoardState;
}

export interface ChessComMoveData {
  san?: string;
  from?: string;
  to?: string;
  color?: number;
  piece?: number;
  flags?: number;
}

export interface ChessComBoardState {
  isAtEndOfLine: boolean;
  isFlipped: boolean;
  selectedNode: unknown;
  openingData: {
    fen: string;
    link: string | null;
    name: string;
    flipped: boolean;
    moveList: unknown[];
    variant: string;
    moveNumber: number;
  };
}

export interface ChessComECOData {
  name: string;
  code: string;
  url: string;
}

export interface WcChessBoardElement extends HTMLElement {
  game: ChessComGameObject;
  state: ChessComBoardState;
}
