import { getExportDirectoryHandle, setExportDirectoryHandle } from '@/storage/db';
import type { GameRecord } from '@/shared/types';
import { gameToJsonl } from './jsonl';
import { gameToMarkdown } from './markdown';

export async function pickExportDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await setExportDirectoryHandle(handle);
    return handle;
  } catch {
    return null;
  }
}

export async function getOrPickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const existing = await getExportDirectoryHandle();
  if (existing) return existing;
  return pickExportDirectory();
}

export async function writeToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function exportGameToDirectory(
  game: GameRecord,
  format: 'jsonl' | 'markdown' | 'both',
): Promise<{ success: boolean; error?: string }> {
  const dirHandle = await getOrPickDirectory();
  if (!dirHandle) {
    return { success: false, error: 'No export directory selected' };
  }

  try {
    const date = game.date.slice(0, 10);
    const opponent = game.opponentName.replace(/[^a-zA-Z0-9]/g, '_');
    const baseName = `${date}_vs_${opponent}_${game.id}`;

    if (format === 'jsonl' || format === 'both') {
      await writeToDirectory(dirHandle, `${baseName}.jsonl`, gameToJsonl(game) + '\n');
    }

    if (format === 'markdown' || format === 'both') {
      await writeToDirectory(dirHandle, `${baseName}.md`, gameToMarkdown(game));
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Export failed',
    };
  }
}

export async function exportAllGamesToDirectory(
  games: GameRecord[],
): Promise<{ success: boolean; error?: string }> {
  const dirHandle = await getOrPickDirectory();
  if (!dirHandle) {
    return { success: false, error: 'No export directory selected' };
  }

  try {
    // Create a game-logs subdirectory
    const logsDir = await dirHandle.getDirectoryHandle('game-logs', { create: true });

    for (const game of games) {
      const date = game.date.slice(0, 10);
      const opponent = game.opponentName.replace(/[^a-zA-Z0-9]/g, '_');
      const baseName = `${date}_vs_${opponent}_${game.id}`;

      await writeToDirectory(logsDir, `${baseName}.jsonl`, gameToJsonl(game) + '\n');
      await writeToDirectory(logsDir, `${baseName}.md`, gameToMarkdown(game));
    }

    // Also write a combined JSONL
    const combined = games.map(g => gameToJsonl(g)).join('\n') + '\n';
    await writeToDirectory(dirHandle, 'all-games.jsonl', combined);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Export failed',
    };
  }
}
