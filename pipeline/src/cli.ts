#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { ingestGames } from './ingest.js';
import { computeMetrics, generateMetricsMarkdown } from './metrics.js';
import { findMistakePatterns, generateMistakeMarkdown } from './mistakes.js';
import { computeWeeklyReview, generateWeeklyMarkdown } from './weekly.js';
import { generateOpeningMarkdown } from './openings.js';
import { generateAllBibleEntries } from './bible.js';

const COMMANDS = ['run', 'ingest', 'metrics', 'mistakes', 'weekly', 'openings', 'bible', 'help'] as const;
type Command = typeof COMMANDS[number];

function usage(): void {
  console.log(`
Chess Annotation Pipeline — Claude Code Analysis Tool

Usage:
  npx tsx pipeline/src/cli.ts <command> [options]

Commands:
  run         Run all pipeline stages
  ingest      Validate and count game files
  metrics     Generate metrics.md
  mistakes    Generate mistake-database.md
  weekly      Generate weekly review
  openings    Generate opening prep analysis
  bible       Generate Chess Bible game-log entries
  help        Show this help message

Options:
  --input, -i <dir>      Input directory with .jsonl files (default: ./game-logs)
  --output, -o <dir>     Output directory for generated files (default: ./output)
  --week, -w <number>    Week number for weekly review (default: current week)
`);
}

function parseArgs(): { command: Command; input: string; output: string; week?: number } {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    usage();
    process.exit(0);
  }

  const command = args[0] as Command;
  if (!COMMANDS.includes(command)) {
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
  }

  let input = './game-logs';
  let output = './output';
  let week: number | undefined;

  for (let i = 1; i < args.length; i++) {
    if ((args[i] === '--input' || args[i] === '-i') && args[i + 1]) {
      input = args[++i];
    } else if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      output = args[++i];
    } else if ((args[i] === '--week' || args[i] === '-w') && args[i + 1]) {
      week = parseInt(args[++i], 10);
    }
  }

  return { command, input, output, week };
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeOutput(filepath: string, content: string): void {
  writeFileSync(filepath, content, 'utf-8');
  console.log(`[pipeline] Wrote ${filepath}`);
}

async function main(): Promise<void> {
  const { command, input, output, week } = parseArgs();

  console.log(`[pipeline] Command: ${command}`);
  console.log(`[pipeline] Input: ${input}`);
  console.log(`[pipeline] Output: ${output}`);

  // Ingest games
  const games = ingestGames(input);
  if (games.length === 0 && command !== 'help') {
    console.error('[pipeline] No games found. Place .jsonl files in the input directory.');
    process.exit(1);
  }

  ensureDir(output);

  switch (command) {
    case 'ingest': {
      console.log(`[pipeline] Successfully ingested ${games.length} games`);
      console.log(`[pipeline] Date range: ${games[0].date.slice(0, 10)} to ${games[games.length - 1].date.slice(0, 10)}`);
      const reviewed = games.filter(g => g.reviewed).length;
      console.log(`[pipeline] Reviewed: ${reviewed}/${games.length}`);
      break;
    }

    case 'metrics': {
      const metrics = computeMetrics(games);
      const md = generateMetricsMarkdown(metrics);
      writeOutput(join(output, 'metrics.md'), md);
      break;
    }

    case 'mistakes': {
      const patterns = findMistakePatterns(games);
      const md = generateMistakeMarkdown(patterns);
      writeOutput(join(output, 'mistake-database.md'), md);
      console.log(`[pipeline] Found ${patterns.length} recurring patterns`);
      break;
    }

    case 'weekly': {
      const review = computeWeeklyReview(games, week);
      const md = generateWeeklyMarkdown(review);
      ensureDir(join(output, 'weekly-reviews'));
      writeOutput(join(output, 'weekly-reviews', `week-${review.weekNumber}.md`), md);
      break;
    }

    case 'openings': {
      const md = generateOpeningMarkdown(games);
      writeOutput(join(output, 'opening-prep.md'), md);
      break;
    }

    case 'bible': {
      const entries = generateAllBibleEntries(games);
      ensureDir(join(output, 'game-logs'));
      for (const [filename, content] of entries) {
        writeOutput(join(output, 'game-logs', filename), content);
      }
      console.log(`[pipeline] Generated ${entries.size} Bible entries`);
      break;
    }

    case 'run': {
      console.log('[pipeline] Running full pipeline...');
      console.log('');

      // 1. Metrics
      console.log('=== Stage 1: Metrics ===');
      const metrics = computeMetrics(games);
      writeOutput(join(output, 'metrics.md'), generateMetricsMarkdown(metrics));

      // 2. Mistake Database
      console.log('');
      console.log('=== Stage 2: Mistake Database ===');
      const patterns = findMistakePatterns(games);
      writeOutput(join(output, 'mistake-database.md'), generateMistakeMarkdown(patterns));
      console.log(`[pipeline] Found ${patterns.length} recurring patterns`);

      // 3. Weekly Review
      console.log('');
      console.log('=== Stage 3: Weekly Review ===');
      const review = computeWeeklyReview(games, week);
      ensureDir(join(output, 'weekly-reviews'));
      writeOutput(join(output, 'weekly-reviews', `week-${review.weekNumber}.md`), generateWeeklyMarkdown(review));

      // 4. Opening Prep
      console.log('');
      console.log('=== Stage 4: Opening Prep ===');
      writeOutput(join(output, 'opening-prep.md'), generateOpeningMarkdown(games));

      // 5. Game Bible
      console.log('');
      console.log('=== Stage 5: Game Bible ===');
      const entries = generateAllBibleEntries(games);
      ensureDir(join(output, 'game-logs'));
      for (const [filename, content] of entries) {
        writeOutput(join(output, 'game-logs', filename), content);
      }
      console.log(`[pipeline] Generated ${entries.size} Bible entries`);

      console.log('');
      console.log('[pipeline] Full pipeline complete!');
      console.log(`[pipeline] Output directory: ${output}`);
      break;
    }

    default:
      usage();
  }
}

main().catch(err => {
  console.error('[pipeline] Fatal error:', err);
  process.exit(1);
});
