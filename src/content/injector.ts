// Bridge script — runs in MAIN world to access chess.com's game object.
// Communicates with the content script (ISOLATED world) via window.postMessage.

(() => {
  const PREFIX = 'chess-annotation-bridge';
  let game: any = null;
  let moveCount = 0;
  let gameActive = false;
  let gameEndEmitted = false;


  function postToBridge(type: string, payload: any): void {
    window.postMessage({ source: PREFIX, type, payload }, '*');
  }

  function tryAttachGame(): any {
    const board = document.querySelector('wc-chess-board') as any;
    if (board && board.game) {
      return board.game;
    }
    return null;
  }

  function scrapeClocks(): { whiteMs: number; blackMs: number } {
    function parseClockMs(selector: string): number {
      const el = document.querySelector(selector);
      if (!el) return 0;
      const text = el.textContent?.trim() ?? '';
      const parts = text.split(':').map(Number);
      if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
      if (parts.length === 1) return parts[0] * 1000;
      return 0;
    }
    return {
      whiteMs: parseClockMs('.clock-component.clock-white .clock-time-monospace') ||
               parseClockMs('.clock-component.clock-bottom .clock-time-monospace'),
      blackMs: parseClockMs('.clock-component.clock-black .clock-time-monospace') ||
               parseClockMs('.clock-component.clock-top .clock-time-monospace'),
    };
  }

  function scrapePlayerInfo(): { topName: string; topRating: number; bottomName: string; bottomRating: number } {
    function extractPlayer(selector: string): { name: string; rating: number } {
      const el = document.querySelector(selector);
      if (!el) return { name: 'Unknown', rating: 0 };
      const nameEl = el.querySelector('.cc-user-username-component');
      const name = nameEl?.textContent?.trim() ?? 'Unknown';
      const ratingMatch = el.textContent?.match(/\((\d+)\)/);
      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0;
      return { name, rating };
    }
    const top = extractPlayer('.board-layout-player.board-layout-top');
    const bottom = extractPlayer('.board-layout-player.board-layout-bottom');
    return { topName: top.name, topRating: top.rating, bottomName: bottom.name, bottomRating: bottom.rating };
  }

  function extractGameMeta(): any {
    if (!game) return null;

    const headers = game.getHeaders?.() ?? {};
    const playingAs = game.getPlayingAs?.();
    const myColor = playingAs === 2 ? 'b' : 'w';

    // Generate game ID from URL or timestamp
    const liveMatch = window.location.pathname.match(/\/game\/live\/(\d+)/);
    const gameId = liveMatch?.[1] ?? `bot-${Date.now()}`;

    const { topName, topRating, bottomName, bottomRating } = scrapePlayerInfo();
    const isFlipped = game.state?.isFlipped ?? false;
    const bottomIsWhite = !isFlipped;

    let myRating: number, opponentName: string, opponentRating: number;
    if ((myColor === 'w' && bottomIsWhite) || (myColor === 'b' && !bottomIsWhite)) {
      myRating = bottomRating;
      opponentName = topName;
      opponentRating = topRating;
    } else {
      myRating = topRating;
      opponentName = bottomName;
      opponentRating = bottomRating;
    }

    const timeControl = headers['TimeControl'] ?? '600';

    return {
      gameId,
      url: window.location.href,
      myColor,
      myRating,
      opponentName,
      opponentRating,
      timeControl,
      date: new Date().toISOString(),
    };
  }

  function extractGameEndInfo(): any {
    if (!game) return null;
    const headers = game.getHeaders?.() ?? {};
    const resultStr = game.getResult?.() ?? headers['Result'] ?? '*';

    let result = '1/2-1/2';
    if (resultStr === '1-0') result = '1-0';
    else if (resultStr === '0-1') result = '0-1';

    const termination = (headers['Termination'] ?? '').toLowerCase();
    let resultBy = 'resignation';
    if (termination.includes('checkmate')) resultBy = 'checkmate';
    else if (termination.includes('resign')) resultBy = 'resignation';
    else if (termination.includes('time')) resultBy = 'timeout';
    else if (termination.includes('stalemate')) resultBy = 'stalemate';
    else if (termination.includes('insufficient')) resultBy = 'insufficient';
    else if (termination.includes('agreement') || termination.includes('draw')) resultBy = 'agreement';
    else if (termination.includes('repetition')) resultBy = 'repetition';
    else if (termination.includes('50') || termination.includes('fifty')) resultBy = '50move';
    else if (termination.includes('abandon')) resultBy = 'abandonment';

    const eco = game.eco?.get?.();
    const openingData = game.state?.openingData;

    return {
      result,
      resultBy,
      opening: eco?.name ?? openingData?.name ?? headers['Opening'] ?? 'Unknown',
      openingEco: eco?.code ?? headers['ECO'] ?? '',
      openingVariation: headers['Variation'],
    };
  }

  function handleNewGame(): void {
    gameActive = true;
    gameEndEmitted = false;
    moveCount = 0;

    const meta = extractGameMeta();
    if (meta) {
      postToBridge('GAME_STARTED', meta);
    }
  }

  function emitMoves(): void {
    if (!game || !gameActive) return;
    const sans = game.getHistorySANs?.() ?? [];
    if (sans.length > moveCount) {
      for (let i = moveCount; i < sans.length; i++) {
        const moveNumber = Math.ceil((i + 1) / 2);
        const color = (i + 1) % 2 === 1 ? 'w' : 'b';
        const clockState = scrapeClocks();

        postToBridge('MOVE_PLAYED', {
          move: {
            san: sans[i],
            color,
            number: moveNumber,
            wallClockAt: Date.now(),
          },
          clockState,
        });
      }
      moveCount = sans.length;
    }
  }

  function checkGameEnd(): void {
    if (!game || !gameActive || gameEndEmitted) return;
    if (game.isGameOver?.()) {
      gameEndEmitted = true;
      gameActive = false;
      const endInfo = extractGameEndInfo();
      if (endInfo) {
        postToBridge('GAME_ENDED', endInfo);
      }
    }
  }

  function poll(): void {
    const newGame = tryAttachGame();

    if (!game && newGame) {
      // First time finding the game object
      game = newGame;
      game.on?.('CreateGame', () => handleNewGame());
      game.on?.('Move', () => emitMoves());

      // Check if game is already active
      const sans = game.getHistorySANs?.() ?? [];
      const isOver = game.isGameOver?.();
      const onPlayPage = window.location.pathname.match(/\/play\//);
      if ((sans.length > 0 && !isOver) || (onPlayPage && !isOver)) {
        handleNewGame();
        emitMoves();
      }
    } else if (game && newGame && game !== newGame) {
      // Game object was replaced (new game started)
      game = newGame;
      moveCount = 0;
      gameEndEmitted = false;
      game.on?.('CreateGame', () => handleNewGame());
      game.on?.('Move', () => emitMoves());

      const sans = game.getHistorySANs?.() ?? [];
      const isOver = game.isGameOver?.();
      if ((sans.length > 0 && !isOver) || !isOver) {
        handleNewGame();
        emitMoves();
      }
    } else if (game && !gameActive) {
      // Check if a new game started on the same object
      const sans = game.getHistorySANs?.() ?? [];
      const isOver = game.isGameOver?.();
      if (sans.length === 0 && !isOver && gameEndEmitted) {
        // Previous game ended, new game with 0 moves (starting position)
        moveCount = 0;
        handleNewGame();
      } else if (sans.length > 0 && !isOver && sans.length < moveCount) {
        // Fewer moves than before = new game started
        moveCount = 0;
        handleNewGame();
        emitMoves();
      } else if (sans.length > 0 && !isOver && moveCount === 0) {
        // New game with moves we haven't seen
        handleNewGame();
        emitMoves();
      }
    }

    // Continuously check for new moves and game end
    if (gameActive) {
      emitMoves();
      checkGameEnd();
    }

    // Also detect game-over modal in DOM
    const gameOverEl = document.querySelector('.game-over-modal-component, [class*="game-over"]');
    if (gameOverEl && gameActive && !gameEndEmitted) {
      checkGameEnd();
    }
  }

  // Listen for state requests from the content script
  window.addEventListener('message', (event) => {
    if (event.data?.source === `${PREFIX}-request` && event.data?.type === 'REQUEST_STATE') {
      const sans = game?.getHistorySANs?.() ?? [];
      const fen = game?.getFEN?.() ?? null;
      const clocks = scrapeClocks();
      postToBridge('STATE_RESPONSE', {
        gameId: game ? (window.location.pathname.match(/\/game\/live\/(\d+)/)?.[1] ?? `bot-${Date.now()}`) : null,
        fen,
        moves: sans,
        clocks,
        isActive: gameActive,
      });
    }
  });

  // Start polling
  setInterval(poll, 500);
  // Also run immediately
  poll();

  console.log('[ChessAnnotation] Bridge script loaded (MAIN world)');
})();
