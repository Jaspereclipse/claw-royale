export type AnsiColor =
  | 'reset'
  | 'blue'
  | 'gray'
  | 'yellow'
  | 'red'
  | 'green'
  | 'magenta'
  | 'cyan'
  | 'white';

const ANSI: Readonly<Record<AnsiColor, string>> = {
  reset: '\u001b[0m',
  blue: '\u001b[34m',
  gray: '\u001b[90m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
};

export type TileType = 'water' | 'rock' | 'sand' | 'coral' | 'kelp';

export interface RenderTile {
  readonly type: TileType;
  readonly symbol: string;
}

export interface RenderEntity {
  x: number;
  y: number;
  symbol: string;
  color?: AnsiColor;
}

export interface RenderLevel {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly (readonly RenderTile[])[];
  readonly enemies: readonly RenderEntity[];
  readonly items: readonly RenderEntity[];
}

export interface RenderPlayer {
  x: number;
  y: number;
  symbol: string;
}

export function clearScreen(): void {
  process.stdout.write('\u001b[2J\u001b[H');
}

export function moveCursor(row: number, col: number): void {
  process.stdout.write(`\u001b[${row};${col}H`);
}

export function setColor(color: AnsiColor): void {
  process.stdout.write(ANSI[color]);
}

export function hideCursor(): void {
  process.stdout.write('\u001b[?25l');
}

export function showCursor(): void {
  process.stdout.write('\u001b[?25h');
}

function tileColor(type: TileType): AnsiColor {
  if (type === 'water') return 'blue';
  if (type === 'rock') return 'gray';
  if (type === 'sand') return 'yellow';
  if (type === 'coral') return 'red';
  return 'green';
}

function coordKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function renderMap(
  level: RenderLevel,
  player: RenderPlayer,
  visibleTiles: ReadonlySet<string>,
  originRow = 1,
  originCol = 1,
): void {
  const enemyByPos = new Map<string, RenderEntity>();
  for (const enemy of level.enemies) {
    enemyByPos.set(coordKey(enemy.x, enemy.y), enemy);
  }

  const itemByPos = new Map<string, RenderEntity>();
  for (const item of level.items) {
    itemByPos.set(coordKey(item.x, item.y), item);
  }

  for (let y = 0; y < level.height; y += 1) {
    moveCursor(originRow + y, originCol);
    for (let x = 0; x < level.width; x += 1) {
      const key = coordKey(x, y);
      if (!visibleTiles.has(key)) {
        setColor('reset');
        process.stdout.write(' ');
        continue;
      }

      if (player.x === x && player.y === y) {
        setColor('cyan');
        process.stdout.write(player.symbol);
        continue;
      }

      const enemy = enemyByPos.get(key);
      if (enemy) {
        setColor(enemy.color ?? 'red');
        process.stdout.write(enemy.symbol);
        continue;
      }

      const item = itemByPos.get(key);
      if (item) {
        setColor(item.color ?? 'yellow');
        process.stdout.write(item.symbol);
        continue;
      }

      const tile = level.tiles[y]?.[x];
      if (!tile) {
        setColor('reset');
        process.stdout.write(' ');
        continue;
      }

      setColor(tileColor(tile.type));
      process.stdout.write(tile.symbol);
    }
  }

  setColor('reset');
}
