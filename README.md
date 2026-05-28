# Chess Annotation Extension

Chrome extension for chess.com that captures rich per-move annotations, timing, and thought process during live games. Exports structured data for analysis with Claude Code or other pipelines.

## Features (v0.1–v0.3)

- **Game Detection** — Detects game start/end, extracts metadata (opponent, ratings, time control, opening)
- **Per-Move Capture** — SAN notation, FEN, wall-clock timestamps, time spent, clock remaining
- **Annotation Panel** — Side panel UI with per-move notes, tag selector, certainty rating, 7-step protocol checklist
- **Post-Game Review** — Scroll through moves with live annotations, add second-pass notes, enter engine data
- **Export** — JSONL and Markdown formats, File System Access API for direct writes to your project folder

## Stack

- React + TypeScript + Vite
- Chrome Extension Manifest V3
- IndexedDB (via Dexie.js) for local storage
- Zustand for state management
- chess.js for FEN computation

## Development

```bash
npm install
npm run dev      # Start dev server with hot reload
npm run build    # Production build
npm run typecheck # TypeScript type checking
```

### Loading the Extension

1. Run `npm run build` to generate the `dist/` folder
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select the `dist/` folder
5. Navigate to chess.com and start a game
6. Click the extension icon to open the side panel

### During Development

Run `npm run dev` for hot-reload during development. The CRXJS Vite plugin handles automatic extension reloading.

## Architecture

```
src/
├── adapters/chess-com/   ← Chess.com scraping (isolated, swappable)
├── background/           ← Service worker, game state management
├── content/              ← Content script injected into chess.com
├── panel/                ← React side panel UI
├── storage/              ← IndexedDB via Dexie.js
├── export/               ← JSONL, Markdown, File System Access API
├── chess/                ← chess.js wrapper for FEN computation
└── shared/               ← Types, constants, message protocol
```

### Data Flow

```
chess.com DOM / game object API
  → Content Script (adapter)
    → Service Worker (game state manager + IndexedDB)
      → Side Panel (React UI)
        → Export (JSONL / Markdown / File System)
```

### Chess.com Integration

The adapter uses a layered approach:
1. **Game Object API** — `wc-chess-board` web component exposes `game` property with methods like `getFEN()`, `getHistorySANs()`, `on('Move', cb)` etc.
2. **DOM Observation** — MutationObserver fallback for move list changes, clock updates
3. **WebSocket Intercept** — (planned) For the most reliable real-time data capture

## Export Formats

### JSONL
One game per line, full `GameRecord` object. Designed for Claude Code pipeline ingestion.

### Markdown
Chess Bible game-log format with annotated moves, timing data, protocol checklist, pre/post engine impressions.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+N` | Focus note field |
| `Alt+1-5` | Set certainty rating |
| `Alt+P` | Toggle review mode |
| `←/→` | Navigate moves |
