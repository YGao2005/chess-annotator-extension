import React, { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { downloadJsonl } from '@/export/jsonl';
import { downloadMarkdown } from '@/export/markdown';
import { exportGameToDirectory } from '@/export/file-system';
import { getAllGames } from '@/storage/db';

export const ExportControls: React.FC = () => {
  const { game } = useGameStore();
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!game) return null;

  const handleExportJsonl = () => {
    downloadJsonl([game], `${game.id}.jsonl`);
    setStatus('JSONL downloaded');
  };

  const handleExportMarkdown = () => {
    downloadMarkdown(game);
    setStatus('Markdown downloaded');
  };

  const handleExportToDirectory = async () => {
    setExporting(true);
    setStatus(null);
    const result = await exportGameToDirectory(game, 'both');
    setExporting(false);
    setStatus(result.success ? 'Exported to directory' : `Error: ${result.error}`);
  };

  const handleExportAll = async () => {
    setExporting(true);
    setStatus(null);
    try {
      const allGames = await getAllGames();
      downloadJsonl(allGames, 'all-games.jsonl');
      setStatus(`Exported ${allGames.length} games`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'unknown'}`);
    }
    setExporting(false);
  };

  return (
    <div className="export-controls">
      <h4>Export</h4>
      <div className="export-buttons">
        <button onClick={handleExportJsonl} disabled={exporting} type="button">
          📄 JSONL
        </button>
        <button onClick={handleExportMarkdown} disabled={exporting} type="button">
          📝 Markdown
        </button>
        <button onClick={handleExportToDirectory} disabled={exporting} type="button">
          📁 To Directory
        </button>
        <button onClick={handleExportAll} disabled={exporting} type="button">
          📦 All Games (JSONL)
        </button>
      </div>
      {status && <p className="export-status">{status}</p>}
    </div>
  );
};
