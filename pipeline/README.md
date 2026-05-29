# Chess Annotation Pipeline

CLI tool that reads exported JSONL game files from the Chrome extension and generates structured analysis reports for your personal Chess Bible.

## Usage

```bash
# Run the full pipeline
npm run pipeline:run -- -i ./game-logs -o ./output

# Individual commands
npm run pipeline:metrics -- -i ./game-logs -o ./output
npm run pipeline:mistakes -- -i ./game-logs -o ./output
npm run pipeline:weekly -- -i ./game-logs -o ./output
npm run pipeline:openings -- -i ./game-logs -o ./output
npm run pipeline:bible -- -i ./game-logs -o ./output

# With custom week number
npm run pipeline:weekly -- -i ./game-logs -o ./output --week 22
```

## Pipeline Stages

### 1. Metrics Tracker (`metrics`)
Generates `metrics.md` with:
- Rating trend (with ASCII chart)
- Avg CPL, blunder rate, mistake rate
- Protocol violation rate
- Games played/reviewed this week

### 2. Mistake Database (`mistakes`)
Generates `mistake-database.md` with:
- Recurring mistake patterns clustered by tag + move phase
- Keyword extraction from your notes
- Links back to source games

### 3. Weekly Review (`weekly`)
Generates `weekly-reviews/week-N.md` answering 7 review questions:
1. Volume — games played and reviewed
2. Rating — start, end, change
3. Move Quality — CPL, blunders, mistakes, violations
4. Openings — breakdown with win rates
5. Time Management — avg time/move, rush moves
6. Recurring Mistakes — top patterns from this week
7. Focus for Next Week — auto-generated recommendations

### 4. Opening Prep (`openings`)
Generates `opening-prep.md` with:
- Repertoire summary (W/D/L per opening)
- Struggling positions (< 50% win rate)
- Slowest positions (decision fatigue points)
- Study questions for each problem position

### 5. Game Bible Writer (`bible`)
Generates `game-logs/YYYY-MM-DD_vs_Opponent_Result.md` per game with:
- YAML metadata block
- Pass 1 (live) and Pass 2 (review) annotations
- Protocol checklist status
- Auto-tag status (pending/confirmed/dismissed)
- Engine data
- Related mistake database patterns
- Full move list

## Input Format

Place `.jsonl` files in the input directory. Each line should be a JSON object matching the `GameRecord` type exported by the Chrome extension.

## Integration with Claude Code

The pipeline outputs are designed to be read by Claude Code for further analysis:

```bash
# Export games from the extension, then run:
npm run pipeline:run -- -i ~/chess-bible/game-logs -o ~/chess-bible

# Claude Code can then read and analyze:
# - output/metrics.md
# - output/mistake-database.md
# - output/weekly-reviews/week-N.md
# - output/opening-prep.md
# - output/game-logs/*.md
```
