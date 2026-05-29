import React, { useEffect, useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { MoveList } from './components/MoveList';
import { AnnotationPanel } from './components/AnnotationPanel';
import { PostGameReview } from './components/PostGameReview';
import { ExportControls } from './components/ExportControls';
import { TimeAnalytics } from './components/TimeAnalytics';
import { PatternDashboard } from './components/PatternDashboard';
import { OpeningTracker } from './components/OpeningTracker';
import './styles.css';

type PanelTab = 'annotate' | 'time' | 'patterns' | 'openings';

export const App: React.FC = () => {
  const {
    game,
    activeMoveIndex,
    isReviewMode,
    isConnected,
    connect,
    setActiveMoveIndex,
    setReviewMode,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<PanelTab>('annotate');

  useEffect(() => {
    connect();
    return () => {
      useGameStore.getState().disconnect();
    };
  }, [connect]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!game) return;

      if (e.altKey) {
        switch (e.key) {
          case 'p':
          case 'P':
            e.preventDefault();
            setReviewMode(!isReviewMode);
            break;
          case '1':
          case '2':
          case '3':
          case '4':
          case '5': {
            e.preventDefault();
            const certainty = parseInt(e.key) as 1 | 2 | 3 | 4 | 5;
            useGameStore.getState().setMoveCertainty(activeMoveIndex, certainty);
            break;
          }
          case 'n':
          case 'N':
            e.preventDefault();
            document.querySelector<HTMLTextAreaElement>('.note-input')?.focus();
            break;
        }
      }

      // Arrow keys for move navigation
      if (e.key === 'ArrowLeft' && activeMoveIndex > 0) {
        e.preventDefault();
        setActiveMoveIndex(activeMoveIndex - 1);
      }
      if (e.key === 'ArrowRight' && game && activeMoveIndex < game.moves.length - 1) {
        e.preventDefault();
        setActiveMoveIndex(activeMoveIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game, activeMoveIndex, isReviewMode, setActiveMoveIndex, setReviewMode]);

  if (!isConnected) {
    return (
      <div className="panel-container">
        <div className="panel-status">Connecting...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="panel-container">
        <div className="panel-empty">
          <h2>♟ Chess Annotation</h2>
          <p>Start or load a game on chess.com to begin annotating.</p>
          <div className="shortcuts-help">
            <h4>Keyboard Shortcuts</h4>
            <ul>
              <li><kbd>Alt+N</kbd> Focus note field</li>
              <li><kbd>Alt+1-5</kbd> Set certainty</li>
              <li><kbd>Alt+P</kbd> Toggle review mode</li>
              <li><kbd>←/→</kbd> Navigate moves</li>
            </ul>
          </div>
          <button
            className="panel-tab patterns-btn"
            onClick={() => setActiveTab('patterns')}
            type="button"
          >
            View Pattern Dashboard
          </button>
        </div>
        {activeTab === 'patterns' && <PatternDashboard />}
      </div>
    );
  }

  const resultText = game.result !== '1/2-1/2' || game.moves.length > 0
    ? `${game.result} (${game.resultBy})`
    : 'In progress';

  return (
    <div className="panel-container">
      <div className="panel-header">
        <div className="game-info">
          <span className="opponent-name">vs {game.opponentName}</span>
          <span className="game-result">{resultText}</span>
        </div>
        <div className="panel-controls">
          <button
            className={`mode-toggle ${isReviewMode ? 'review' : 'live'}`}
            onClick={() => setReviewMode(!isReviewMode)}
            type="button"
          >
            {isReviewMode ? '📖 Review' : '✏️ Live'}
          </button>
        </div>
      </div>

      <div className="panel-tabs">
        <button
          className={`panel-tab ${activeTab === 'annotate' ? 'active' : ''}`}
          onClick={() => setActiveTab('annotate')}
          type="button"
        >
          Annotate
        </button>
        <button
          className={`panel-tab ${activeTab === 'time' ? 'active' : ''}`}
          onClick={() => setActiveTab('time')}
          type="button"
        >
          Time
        </button>
        <button
          className={`panel-tab ${activeTab === 'patterns' ? 'active' : ''}`}
          onClick={() => setActiveTab('patterns')}
          type="button"
        >
          Patterns
        </button>
        <button
          className={`panel-tab ${activeTab === 'openings' ? 'active' : ''}`}
          onClick={() => setActiveTab('openings')}
          type="button"
        >
          Openings
        </button>
      </div>

      <MoveList
        moves={game.moves}
        activeMoveIndex={activeMoveIndex}
        onMoveSelect={setActiveMoveIndex}
      />

      {activeTab === 'annotate' && (
        <>
          <AnnotationPanel />

          {isReviewMode && (
            <>
              <PostGameReview />
              <ExportControls />
            </>
          )}
        </>
      )}

      {activeTab === 'time' && <TimeAnalytics />}

      {activeTab === 'patterns' && <PatternDashboard />}

      {activeTab === 'openings' && <OpeningTracker />}
    </div>
  );
};
