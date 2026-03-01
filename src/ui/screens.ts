import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

import { FRAME_CHARS, LOBSTER_ART, TITLE_ART } from '../data/ascii-art.js';
import { clearScreen, moveCursor, setColor } from './renderer.js';

const SCORE_FILE = join(homedir(), '.claw-royale-scores.json');

export interface LeaderboardEntry {
  readonly name: string;
  readonly score: number;
  readonly date: string;
}

async function readKeypress(): Promise<string> {
  const stdin = process.stdin;
  return new Promise((resolve) => {
    const cleanup = (): void => {
      stdin.removeListener('data', onData);
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
    };

    const onData = (buffer: Buffer): void => {
      cleanup();
      resolve(buffer.toString('utf8'));
    };

    stdin.resume();
    stdin.setEncoding('utf8');
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.on('data', onData);
  });
}

function drawFrame(width: number, height: number): void {
  const inner = width - 2;
  moveCursor(1, 1);
  process.stdout.write(FRAME_CHARS.topLeft + FRAME_CHARS.horizontal.repeat(inner) + FRAME_CHARS.topRight);

  for (let row = 2; row < height; row += 1) {
    moveCursor(row, 1);
    process.stdout.write(FRAME_CHARS.vertical + ' '.repeat(inner) + FRAME_CHARS.vertical);
  }

  moveCursor(height, 1);
  process.stdout.write(FRAME_CHARS.bottomLeft + FRAME_CHARS.horizontal.repeat(inner) + FRAME_CHARS.bottomRight);
}

export async function showTitleScreen(): Promise<void> {
  clearScreen();
  const width = Math.max(...TITLE_ART.map((line) => line.length), 80) + 8;
  const height = TITLE_ART.length + 18;
  drawFrame(width, height);

  setColor('cyan');
  TITLE_ART.forEach((line, index) => {
    moveCursor(3 + index, 5);
    process.stdout.write(line);
  });

  const helpStart = 3 + TITLE_ART.length + 2;
  setColor('white');
  moveCursor(helpStart, 5);
  process.stdout.write('HOW TO PLAY');
  const help = [
    'WASD / Arrows  Move & attack enemies',
    '1-4            Use abilities (Claw Strike, Shield, Ink Cloud, Pincer Grab)',
    'i              View inventory',
    '>              Walk onto stairs to descend deeper',
    'q              Quit',
  ];
  setColor('reset');
  help.forEach((line, i) => {
    moveCursor(helpStart + 1 + i, 7);
    process.stdout.write(line);
  });

  setColor('yellow');
  moveCursor(height - 3, 5);
  process.stdout.write('Press ENTER to start');
  setColor('reset');

  while (true) {
    const key = await readKeypress();
    if (key === '\r' || key === '\n') {
      return;
    }
  }
}

export async function showGameOverScreen(score: number): Promise<'again' | 'quit'> {
  clearScreen();
  const width = 74;
  const height = 18;
  drawFrame(width, height);

  setColor('red');
  moveCursor(3, 5);
  process.stdout.write('GAME OVER');

  setColor('magenta');
  LOBSTER_ART.forEach((line, index) => {
    moveCursor(5 + index, 5);
    process.stdout.write(line);
  });

  setColor('yellow');
  moveCursor(13, 5);
  process.stdout.write(`Final score: ${score}`);
  moveCursor(15, 5);
  process.stdout.write('Press ENTER to play again, or Q to quit');
  setColor('reset');

  while (true) {
    const key = await readKeypress();
    if (key.toLowerCase() === 'q' || key === '\u0003') return 'quit';
    if (key === '\r' || key === '\n') return 'again';
  }
}

export async function readLeaderboard(): Promise<readonly LeaderboardEntry[]> {
  try {
    const raw = await readFile(SCORE_FILE, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const safe: LeaderboardEntry[] = [];
    for (const entry of parsed) {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        'name' in entry &&
        'score' in entry &&
        'date' in entry &&
        typeof entry.name === 'string' &&
        typeof entry.score === 'number' &&
        typeof entry.date === 'string'
      ) {
        safe.push({ name: entry.name, score: entry.score, date: entry.date });
      }
    }

    return safe
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function saveLeaderboardEntry(entry: LeaderboardEntry): Promise<readonly LeaderboardEntry[]> {
  const current = await readLeaderboard();
  const merged = [...current, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  await mkdir(dirname(SCORE_FILE), { recursive: true });
  await writeFile(SCORE_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  return merged;
}

export async function showLeaderboard(entries: readonly LeaderboardEntry[]): Promise<void> {
  clearScreen();
  const width = 74;
  const height = 15;
  drawFrame(width, height);

  setColor('cyan');
  moveCursor(3, 5);
  process.stdout.write('Leaderboard (Top 5)');

  setColor('white');
  if (entries.length === 0) {
    moveCursor(6, 5);
    process.stdout.write('No scores yet.');
  } else {
    entries.forEach((entry, index) => {
      const line = `${index + 1}. ${entry.name.padEnd(12, ' ')} ${String(entry.score).padStart(6, ' ')}  ${entry.date}`;
      moveCursor(6 + index, 5);
      process.stdout.write(line);
    });
  }

  setColor('yellow');
  moveCursor(height - 2, 5);
  process.stdout.write('Press ENTER to continue');
  setColor('reset');

  while (true) {
    const key = await readKeypress();
    if (key === '\r' || key === '\n') {
      return;
    }
  }
}
