import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { GameRecord } from './types.js';

/**
 * Read and parse JSONL game files from a directory.
 */
export function ingestGames(dir: string): GameRecord[] {
  if (!existsSync(dir)) {
    console.error(`[ingest] Directory not found: ${dir}`);
    return [];
  }

  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
  if (files.length === 0) {
    console.warn(`[ingest] No .jsonl files found in ${dir}`);
    return [];
  }

  const games: GameRecord[] = [];
  const seenIds = new Set<string>();

  for (const file of files) {
    const filepath = join(dir, file);
    const content = readFileSync(filepath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const game = JSON.parse(line) as GameRecord;
        if (!game.id || !game.moves) {
          console.warn(`[ingest] Skipping invalid record in ${file}: missing id or moves`);
          continue;
        }
        if (seenIds.has(game.id)) {
          continue;
        }
        seenIds.add(game.id);
        games.push(game);
      } catch (e) {
        console.warn(`[ingest] Failed to parse line in ${file}: ${(e as Error).message}`);
      }
    }
  }

  console.log(`[ingest] Loaded ${games.length} games from ${files.length} file(s)`);
  return games.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Read a single JSONL file.
 */
export function ingestFile(filepath: string): GameRecord[] {
  if (!existsSync(filepath)) {
    console.error(`[ingest] File not found: ${filepath}`);
    return [];
  }

  const content = readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const games: GameRecord[] = [];

  for (const line of lines) {
    try {
      games.push(JSON.parse(line) as GameRecord);
    } catch (e) {
      console.warn(`[ingest] Failed to parse line: ${(e as Error).message}`);
    }
  }

  return games;
}
