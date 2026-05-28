import type { GameRecord } from '@/shared/types';

export function gameToJsonl(game: GameRecord): string {
  return JSON.stringify(game);
}

export function gamesToJsonl(games: GameRecord[]): string {
  return games.map(g => JSON.stringify(g)).join('\n') + '\n';
}

export function downloadJsonl(games: GameRecord[], filename?: string): void {
  const content = gamesToJsonl(games);
  const blob = new Blob([content], { type: 'application/jsonl' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `chess-annotations-${new Date().toISOString().slice(0, 10)}.jsonl`;
  a.click();

  URL.revokeObjectURL(url);
}
