import Dexie, { type Table } from 'dexie';
import type { GameRecord } from '@/shared/types';

export interface SettingRecord {
  key: string;
  value: unknown;
}

export interface DirectoryHandleRecord {
  id: string;
  handle: FileSystemDirectoryHandle;
}

class ChessAnnotationDB extends Dexie {
  games!: Table<GameRecord, string>;
  settings!: Table<SettingRecord, string>;
  directoryHandles!: Table<DirectoryHandleRecord, string>;

  constructor() {
    super('ChessAnnotations');

    this.version(1).stores({
      games: 'id, date, myColor, opening, openingEco, result, timeControlType, reviewed',
      settings: 'key',
      directoryHandles: 'id',
    });
  }
}

export const db = new ChessAnnotationDB();

// ===== Game CRUD =====

export async function saveGame(game: GameRecord): Promise<void> {
  game.updatedAt = new Date().toISOString();
  await db.games.put(game);
}

export async function getGame(id: string): Promise<GameRecord | undefined> {
  return db.games.get(id);
}

export async function getAllGames(): Promise<GameRecord[]> {
  return db.games.orderBy('date').reverse().toArray();
}

export async function gameExists(id: string): Promise<boolean> {
  return (await db.games.where('id').equals(id).count()) > 0;
}

export async function deleteGame(id: string): Promise<void> {
  await db.games.delete(id);
}

// ===== Settings =====

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const record = await db.settings.get(key);
  return record ? (record.value as T) : defaultValue;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

// ===== Directory Handles =====

export async function getExportDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const record = await db.directoryHandles.get('export-dir');
  if (!record) return null;

  try {
    const perm = await record.handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return record.handle;
  } catch {
    // Handle is stale, remove it
    await db.directoryHandles.delete('export-dir');
  }

  return null;
}

export async function setExportDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await db.directoryHandles.put({ id: 'export-dir', handle });
}
