import { create } from 'zustand';
import type { AutoTagState, GameRecord, MoveTag, Certainty, Checklist } from '@/shared/types';
import type { ExtensionMessage, MoveAnnotation } from '@/shared/protocol';

interface GameStore {
  game: GameRecord | null;
  allGames: GameRecord[];
  activeMoveIndex: number;
  isReviewMode: boolean;
  isConnected: boolean;
  port: chrome.runtime.Port | null;
  allGames: GameRecord[];

  setGame: (game: GameRecord) => void;
  setAllGames: (games: GameRecord[]) => void;
  requestAllGames: () => void;
  setActiveMoveIndex: (index: number) => void;
  setReviewMode: (review: boolean) => void;
  connect: () => void;
  disconnect: () => void;

  updateMoveAnnotation: (moveIndex: number, annotation: Partial<MoveAnnotation>) => void;
  updateImpression: (data: { impressionPre?: string; impressionPost?: string; mainLesson?: string }) => void;

  setMoveTags: (moveIndex: number, tags: MoveTag[]) => void;
  setMoveCertainty: (moveIndex: number, certainty: Certainty) => void;
  setMoveChecklist: (moveIndex: number, checklist: Checklist) => void;
  setMoveNote: (moveIndex: number, note: string) => void;
  setMovePostNote: (moveIndex: number, note: string) => void;
  setMoveAutoTags: (moveIndex: number, autoTags: AutoTagState[]) => void;

  setAllGames: (games: GameRecord[]) => void;
  requestAllGames: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  allGames: [],
  activeMoveIndex: -1,
  isReviewMode: false,
  isConnected: false,
  port: null,
  allGames: [],

  setGame: (game) => {
    set({ game });
    // Auto-set active move to the latest if not in review mode
    if (!get().isReviewMode && game.moves.length > 0) {
      set({ activeMoveIndex: game.moves.length - 1 });
    }
  },

  setAllGames: (games) => set({ allGames: games }),

  requestAllGames: () => {
    const { port } = get();
    if (!port) return;
    port.postMessage({ type: 'REQUEST_ALL_GAMES', payload: null });
  },

  setActiveMoveIndex: (index) => set({ activeMoveIndex: index }),

  setReviewMode: (review) => set({ isReviewMode: review }),

  connect: () => {
    const port = chrome.runtime.connect({ name: 'side-panel' });

    port.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'STATE_SYNC') {
        get().setGame(message.payload);
      }
      if (message.type === 'ALL_GAMES_SYNC') {
        get().setAllGames(message.payload);
      }
    });

    port.onDisconnect.addListener(() => {
      set({ isConnected: false, port: null });
    });

    set({ isConnected: true, port });

    // Request current state
    port.postMessage({ type: 'SIDE_PANEL_READY', payload: null });
  },

  disconnect: () => {
    const { port } = get();
    port?.disconnect();
    set({ isConnected: false, port: null });
  },

  updateMoveAnnotation: (moveIndex, annotation) => {
    const { port, game } = get();
    if (!port || !game) return;

    port.postMessage({
      type: 'ANNOTATION_SAVED',
      payload: { moveIndex, annotation },
    } satisfies ExtensionMessage);

    // Optimistic update
    const updatedGame = { ...game, moves: [...game.moves] };
    const move = { ...updatedGame.moves[moveIndex] };
    if (annotation.tags !== undefined) move.tags = annotation.tags;
    if (annotation.certainty !== undefined) move.certainty = annotation.certainty;
    if (annotation.checklist !== undefined) move.checklist = annotation.checklist;
    if (annotation.noteDuring !== undefined) move.noteDuring = annotation.noteDuring;
    if (annotation.notePost !== undefined) move.notePost = annotation.notePost;
    if (annotation.autoTags !== undefined) move.autoTags = annotation.autoTags;
    updatedGame.moves[moveIndex] = move;
    set({ game: updatedGame });
  },

  updateImpression: (data) => {
    const { port, game } = get();
    if (!port || !game) return;

    port.postMessage({
      type: 'GAME_IMPRESSION',
      payload: data,
    } satisfies ExtensionMessage);

    // Optimistic update
    const updatedGame = { ...game };
    if (data.impressionPre !== undefined) updatedGame.impressionPre = data.impressionPre;
    if (data.impressionPost !== undefined) updatedGame.impressionPost = data.impressionPost;
    if (data.mainLesson !== undefined) updatedGame.mainLesson = data.mainLesson;
    set({ game: updatedGame });
  },

  setMoveTags: (moveIndex, tags) => {
    get().updateMoveAnnotation(moveIndex, { tags });
  },

  setMoveCertainty: (moveIndex, certainty) => {
    get().updateMoveAnnotation(moveIndex, { certainty });
  },

  setMoveChecklist: (moveIndex, checklist) => {
    get().updateMoveAnnotation(moveIndex, { checklist });
  },

  setMoveNote: (moveIndex, note) => {
    get().updateMoveAnnotation(moveIndex, { noteDuring: note });
  },

  setMovePostNote: (moveIndex, note) => {
    get().updateMoveAnnotation(moveIndex, { notePost: note });
  },

  setMoveAutoTags: (moveIndex, autoTags) => {
    get().updateMoveAnnotation(moveIndex, { autoTags });
  },

  setAllGames: (games) => set({ allGames: games }),

  requestAllGames: () => {
    const { port } = get();
    if (!port) return;
    port.postMessage({ type: 'REQUEST_ALL_GAMES', payload: null });
  },
}));
