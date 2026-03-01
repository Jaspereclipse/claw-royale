import { Enemy, Item, Position } from './entity.js';

export type TileType = 'water' | 'rock' | 'sand' | 'coral' | 'kelp' | 'stairs';

export interface Tile {
  type: TileType;
  symbol: string;
  color: string;
  passable: boolean;
  destructible: boolean;
}

export const LEVEL_WIDTH = 80;
export const LEVEL_HEIGHT = 24;

const TILES: Record<TileType, Tile> = {
  water: { type: 'water', symbol: '.', color: '\x1b[34m', passable: true, destructible: false },
  rock: { type: 'rock', symbol: '#', color: '\x1b[90m', passable: false, destructible: false },
  sand: { type: 'sand', symbol: '~', color: '\x1b[33m', passable: true, destructible: false },
  coral: { type: 'coral', symbol: '%', color: '\x1b[35m', passable: false, destructible: true },
  kelp: { type: 'kelp', symbol: '"', color: '\x1b[32m', passable: true, destructible: false },
  stairs: { type: 'stairs', symbol: '>', color: '\x1b[37;1m', passable: true, destructible: false },
};

function makeTile(type: TileType): Tile {
  return { ...TILES[type] };
}

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Level {
  grid: Tile[][];
  enemies: Enemy[];
  items: Item[];
  playerStart: Position;
  stairsPosition: Position;
  difficulty: number;

  constructor(difficulty: number) {
    this.difficulty = difficulty;
    this.enemies = [];
    this.items = [];
    this.playerStart = { x: 0, y: 0 };
    this.stairsPosition = { x: 0, y: 0 };
    this.grid = [];

    for (let y = 0; y < LEVEL_HEIGHT; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < LEVEL_WIDTH; x++) {
        row.push(makeTile('rock'));
      }
      this.grid.push(row);
    }
  }

  getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= LEVEL_WIDTH || y < 0 || y >= LEVEL_HEIGHT) return null;
    return this.grid[y][x];
  }

  setTile(x: number, y: number, type: TileType): void {
    if (x < 0 || x >= LEVEL_WIDTH || y < 0 || y >= LEVEL_HEIGHT) return;
    this.grid[y][x] = makeTile(type);
  }

  isPassable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== null && tile.passable;
  }

  getEnemyAt(x: number, y: number): Enemy | undefined {
    return this.enemies.find(e => e.isAlive && e.position.x === x && e.position.y === y);
  }

  getItemAt(x: number, y: number): Item | undefined {
    return this.items.find(i => i.position !== undefined && i.position.x === x && i.position.y === y);
  }

  removeItem(item: Item): void {
    const idx = this.items.indexOf(item);
    if (idx !== -1) this.items.splice(idx, 1);
  }

  removeEnemy(enemy: Enemy): void {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
  }
}

function roomsOverlap(a: Room, b: Room): boolean {
  return !(a.x + a.width + 1 < b.x || b.x + b.width + 1 < a.x ||
           a.y + a.height + 1 < b.y || b.y + b.height + 1 < a.y);
}

function carveRoom(level: Level, room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      level.setTile(x, y, 'water');
    }
  }
}

function carveCorridor(level: Level, x1: number, y1: number, x2: number, y2: number): void {
  let x = x1;
  let y = y1;

  // Horizontal first, then vertical
  while (x !== x2) {
    level.setTile(x, y, 'water');
    x += x < x2 ? 1 : -1;
  }
  while (y !== y2) {
    level.setTile(x, y, 'water');
    y += y < y2 ? 1 : -1;
  }
  level.setTile(x2, y2, 'water');
}

function roomCenter(room: Room): Position {
  return {
    x: Math.floor(room.x + room.width / 2),
    y: Math.floor(room.y + room.height / 2),
  };
}

function scatterTerrain(level: Level, rooms: Room[]): void {
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        const roll = Math.random();
        if (roll < 0.05) {
          level.setTile(x, y, 'sand');
        } else if (roll < 0.08) {
          level.setTile(x, y, 'kelp');
        } else if (roll < 0.1) {
          level.setTile(x, y, 'coral');
        }
      }
    }
  }
}

interface EnemyTemplate {
  name: string;
  health: number;
  attack: number;
  defense: number;
  symbol: string;
  color: string;
  xpReward: number;
  behavior: 'aggressive' | 'passive' | 'fleeing';
}

const ENEMY_POOL: EnemyTemplate[] = [
  { name: 'Hermit Crab', health: 8, attack: 4, defense: 6, symbol: 'c', color: '\x1b[33m', xpReward: 5, behavior: 'passive' },
  { name: 'Moray Eel', health: 15, attack: 9, defense: 2, symbol: 'e', color: '\x1b[32m', xpReward: 10, behavior: 'aggressive' },
  { name: 'Pufferfish', health: 12, attack: 6, defense: 8, symbol: 'p', color: '\x1b[36m', xpReward: 8, behavior: 'fleeing' },
  { name: 'Sea Urchin', health: 6, attack: 7, defense: 3, symbol: 'u', color: '\x1b[35m', xpReward: 6, behavior: 'passive' },
  { name: 'Shark', health: 25, attack: 12, defense: 5, symbol: 'S', color: '\x1b[37;1m', xpReward: 20, behavior: 'aggressive' },
  { name: 'Electric Eel', health: 18, attack: 11, defense: 3, symbol: 'E', color: '\x1b[33;1m', xpReward: 15, behavior: 'aggressive' },
];

const ITEM_POOL: Array<{ name: string; symbol: string; color: string; effect: 'heal' | 'armor' | 'weapon' | 'score'; value: number }> = [
  { name: 'Seaweed', symbol: '*', color: '\x1b[32m', effect: 'heal', value: 8 },
  { name: 'Pearl', symbol: 'o', color: '\x1b[37;1m', effect: 'score', value: 15 },
  { name: 'Shell', symbol: ')', color: '\x1b[33m', effect: 'armor', value: 1 },
  { name: 'Trident', symbol: '/', color: '\x1b[36;1m', effect: 'weapon', value: 2 },
];

function getWaterTiles(level: Level): Position[] {
  const positions: Position[] = [];
  for (let y = 0; y < LEVEL_HEIGHT; y++) {
    for (let x = 0; x < LEVEL_WIDTH; x++) {
      const tile = level.getTile(x, y);
      if (tile && tile.type === 'water') {
        positions.push({ x, y });
      }
    }
  }
  return positions;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns true every 3 depths (3, 6, 9, ...).
 */
export function isBossLevel(depth: number): boolean {
  return depth > 0 && depth % 3 === 0;
}

/**
 * Generate a large open boss room with the boss in center and few minions.
 */
export function generateBossRoom(difficulty: number, allocId: () => number): Level {
  const level = new Level(difficulty);

  // Carve one large open room (leaving 2-tile border of rock)
  const roomX = 2;
  const roomY = 2;
  const roomW = LEVEL_WIDTH - 4;
  const roomH = LEVEL_HEIGHT - 4;

  for (let y = roomY; y < roomY + roomH; y++) {
    for (let x = roomX; x < roomX + roomW; x++) {
      level.setTile(x, y, 'water');
    }
  }

  // Scatter some terrain variation (sand/kelp only, no coral blocking)
  for (let y = roomY; y < roomY + roomH; y++) {
    for (let x = roomX; x < roomX + roomW; x++) {
      const roll = Math.random();
      if (roll < 0.03) {
        level.setTile(x, y, 'sand');
      } else if (roll < 0.05) {
        level.setTile(x, y, 'kelp');
      }
    }
  }

  // Player starts near the bottom-left
  const playerX = roomX + 3;
  const playerY = roomY + roomH - 3;
  level.playerStart = { x: playerX, y: playerY };
  level.setTile(playerX, playerY, 'water'); // ensure passable

  // Stairs at bottom-right (only accessible after boss is defeated)
  const stairsX = roomX + roomW - 3;
  const stairsY = roomY + roomH - 3;
  level.stairsPosition = { x: stairsX, y: stairsY };
  level.setTile(stairsX, stairsY, 'stairs');

  // Place a few minions (fewer than a normal level)
  const waterTiles = getWaterTiles(level);
  const usedPositions = new Set<string>();
  usedPositions.add(`${playerX},${playerY}`);
  usedPositions.add(`${stairsX},${stairsY}`);
  // Reserve center for boss
  const centerX = Math.floor(LEVEL_WIDTH / 2);
  const centerY = Math.floor(LEVEL_HEIGHT / 2);
  usedPositions.add(`${centerX},${centerY}`);

  const minionCount = Math.min(3, Math.floor(difficulty * 0.5));
  const availableEnemies = ENEMY_POOL.filter((_, idx) => idx <= Math.min(difficulty, ENEMY_POOL.length - 1));

  for (let i = 0; i < minionCount && waterTiles.length > 0; i++) {
    let pos: Position | null = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = pickRandom(waterTiles);
      const key = `${candidate.x},${candidate.y}`;
      if (!usedPositions.has(key)) {
        pos = candidate;
        usedPositions.add(key);
        break;
      }
    }
    if (!pos) continue;

    const template = pickRandom(availableEnemies);
    const scaledHealth = template.health + Math.floor(difficulty * 2);
    const scaledAttack = template.attack + Math.floor(difficulty * 0.5);
    level.enemies.push(
      new Enemy(allocId(), template.name, pos, scaledHealth, scaledAttack, template.defense, template.symbol, template.color, template.xpReward, template.behavior),
    );
  }

  return level;
}

export function generateLevel(difficulty: number, allocId: () => number): Level {
  const level = new Level(difficulty);

  // Generate rooms
  const rooms: Room[] = [];
  const maxRooms = 6 + Math.floor(difficulty * 1.5);
  const maxAttempts = maxRooms * 10;

  for (let attempt = 0; attempt < maxAttempts && rooms.length < maxRooms; attempt++) {
    const width = 4 + Math.floor(Math.random() * 8);
    const height = 3 + Math.floor(Math.random() * 5);
    const x = 1 + Math.floor(Math.random() * (LEVEL_WIDTH - width - 2));
    const y = 1 + Math.floor(Math.random() * (LEVEL_HEIGHT - height - 2));

    const newRoom: Room = { x, y, width, height };

    if (rooms.some(r => roomsOverlap(r, newRoom))) continue;

    rooms.push(newRoom);
    carveRoom(level, newRoom);
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const prev = roomCenter(rooms[i - 1]);
    const curr = roomCenter(rooms[i]);
    carveCorridor(level, prev.x, prev.y, curr.x, curr.y);
  }

  // Scatter terrain variation
  scatterTerrain(level, rooms);

  // Place player start in first room
  level.playerStart = roomCenter(rooms[0]);

  // Place stairs in last room
  const lastCenter = roomCenter(rooms[rooms.length - 1]);
  level.stairsPosition = lastCenter;
  level.setTile(lastCenter.x, lastCenter.y, 'stairs');

  // Place enemies
  const waterTiles = getWaterTiles(level);
  const usedPositions = new Set<string>();
  usedPositions.add(`${level.playerStart.x},${level.playerStart.y}`);
  usedPositions.add(`${level.stairsPosition.x},${level.stairsPosition.y}`);

  const enemyCount = 3 + Math.floor(difficulty * 1.5);
  const availableEnemies = ENEMY_POOL.filter((_, idx) => idx <= Math.min(difficulty, ENEMY_POOL.length - 1));

  for (let i = 0; i < enemyCount && waterTiles.length > 0; i++) {
    let pos: Position | null = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = pickRandom(waterTiles);
      const key = `${candidate.x},${candidate.y}`;
      if (!usedPositions.has(key)) {
        pos = candidate;
        usedPositions.add(key);
        break;
      }
    }
    if (!pos) continue;

    const template = pickRandom(availableEnemies);
    const scaledHealth = template.health + Math.floor(difficulty * 2);
    const scaledAttack = template.attack + Math.floor(difficulty * 0.5);
    level.enemies.push(
      new Enemy(allocId(), template.name, pos, scaledHealth, scaledAttack, template.defense, template.symbol, template.color, template.xpReward, template.behavior),
    );
  }

  // Place items
  const itemCount = 2 + Math.floor(difficulty * 0.8);
  for (let i = 0; i < itemCount && waterTiles.length > 0; i++) {
    let pos: Position | null = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = pickRandom(waterTiles);
      const key = `${candidate.x},${candidate.y}`;
      if (!usedPositions.has(key)) {
        pos = candidate;
        usedPositions.add(key);
        break;
      }
    }
    if (!pos) continue;

    const template = pickRandom(ITEM_POOL);
    const item = new Item(template.name, template.symbol, template.color, template.effect, template.value, { ...pos });
    level.items.push(item);
  }

  return level;
}
