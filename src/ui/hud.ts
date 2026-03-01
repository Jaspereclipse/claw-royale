import { moveCursor, setColor } from './renderer.js';

export interface HudStats {
  readonly hp: number;
  readonly maxHp: number;
  readonly score: number;
  readonly depth: number;
  readonly turn: number;
}

export type AbilityCooldowns = Readonly<Record<1 | 2 | 3 | 4, number>>;

export interface AbilityDisplay {
  readonly slot: number;
  readonly name: string;
  readonly cooldown: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hpBar(hp: number, maxHp: number, width = 20): string {
  const ratio = maxHp <= 0 ? 0 : clamp(hp / maxHp, 0, 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`;
}

function printLine(row: number, col: number, text: string): void {
  moveCursor(row, col);
  setColor('white');
  process.stdout.write(text);
}

export function renderHud(
  stats: HudStats,
  cooldowns: AbilityCooldowns,
  messages: readonly string[],
  originRow: number,
  originCol = 1,
  abilities?: readonly AbilityDisplay[],
): void {
  const hpText = `HP ${stats.hp}/${stats.maxHp} ${hpBar(stats.hp, stats.maxHp)}`;
  const infoText = `Score ${stats.score} | Depth ${stats.depth} | Turn ${stats.turn}`;

  let cooldownText: string;
  if (abilities && abilities.length > 0) {
    cooldownText = abilities
      .map((a) => {
        const ready = a.cooldown === 0 ? 'RDY' : String(a.cooldown);
        return `${a.slot}:${a.name}[${ready}]`;
      })
      .join(' ');
  } else {
    cooldownText = `Abilities: 1[${cooldowns[1]}] 2[${cooldowns[2]}] 3[${cooldowns[3]}] 4[${cooldowns[4]}]`;
  }

  printLine(originRow, originCol, hpText.padEnd(80, ' '));
  printLine(originRow + 1, originCol, infoText.padEnd(80, ' '));
  printLine(originRow + 2, originCol, cooldownText.padEnd(80, ' '));

  setColor('yellow');
  printLine(originRow + 3, originCol, 'Recent events:'.padEnd(80, ' '));

  const recent = messages.slice(-3);
  for (let i = 0; i < 3; i += 1) {
    const message = recent[i] ?? '';
    printLine(originRow + 4 + i, originCol, `- ${message}`.padEnd(80, ' '));
  }

  setColor('reset');
}
