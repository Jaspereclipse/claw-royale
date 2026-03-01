#!/usr/bin/env node
import { CREATURES } from './data/creatures.js';
import { ITEMS } from './data/items.js';
import { Game } from './engine/game.js';
import { renderHud, type AbilityCooldowns, type HudStats } from './ui/hud.js';
import { getInput } from './ui/input.js';
import {
  clearScreen,
  hideCursor,
  renderMap,
  showCursor,
  type RenderEntity,
  type RenderLevel,
  type RenderPlayer,
  type RenderTile,
  type TileType,
} from './ui/renderer.js';
import {
  readLeaderboard,
  saveLeaderboardEntry,
  showGameOverScreen,
  showLeaderboard,
  showTitleScreen,
} from './ui/screens.js';

interface SessionResult {
  readonly score: number;
  readonly survivedTurns: number;
}

interface RuntimeEnemy extends RenderEntity {
  hp: number;
  attack: number;
  defense: number;
  xpReward: number;
  name: string;
}

interface RuntimeItem extends RenderEntity {
  id: string;
  name: string;
  hp?: number;
  attack?: number;
  defense?: number;
  score?: number;
}

const MAP_WIDTH = 50;
const MAP_HEIGHT = 18;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function tileTemplate(type: TileType): RenderTile {
  if (type === 'water') return { type, symbol: '.' };
  if (type === 'sand') return { type, symbol: ':' };
  if (type === 'rock') return { type, symbol: '#' };
  if (type === 'coral') return { type, symbol: '%' };
  return { type, symbol: '"' };
}

function generateTiles(): RenderTile[][] {
  const tiles: RenderTile[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    const row: RenderTile[] = [];
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const roll = Math.random();
      const type: TileType = roll < 0.55 ? 'water' : roll < 0.7 ? 'sand' : roll < 0.82 ? 'kelp' : roll < 0.92 ? 'coral' : 'rock';
      row.push(tileTemplate(type));
    }
    tiles.push(row);
  }
  return tiles;
}

function isWalkable(tile: RenderTile | undefined): boolean {
  if (!tile) return false;
  return tile.type !== 'rock';
}

function randomOpenPosition(tiles: readonly (readonly RenderTile[])[]): { x: number; y: number } {
  while (true) {
    const x = randomInt(MAP_WIDTH);
    const y = randomInt(MAP_HEIGHT);
    if (isWalkable(tiles[y]?.[x])) return { x, y };
  }
}

function computeDamage(attack: number, defense: number): number {
  return Math.max(1, attack - Math.floor(defense / 2) + randomInt(4));
}

function decrementCooldowns(cooldowns: AbilityCooldowns): AbilityCooldowns {
  return {
    1: Math.max(0, cooldowns[1] - 1),
    2: Math.max(0, cooldowns[2] - 1),
    3: Math.max(0, cooldowns[3] - 1),
    4: Math.max(0, cooldowns[4] - 1),
  };
}

async function runSession(): Promise<SessionResult> {
  const engine = new Game();
  void engine;

  const tiles = generateTiles();
  const visible = new Set<string>();
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      visible.add(`${x},${y}`);
    }
  }

  const player: RenderPlayer = {
    ...randomOpenPosition(tiles),
    symbol: '@',
  };

  const enemies: RuntimeEnemy[] = CREATURES.map((creature) => {
    const pos = randomOpenPosition(tiles);
    return {
      x: pos.x,
      y: pos.y,
      symbol: creature.symbol,
      color: creature.color === 'magenta' ? 'magenta' : 'red',
      hp: creature.baseHealth,
      attack: creature.baseAttack,
      defense: creature.baseDefense,
      xpReward: creature.xpReward,
      name: creature.name,
    };
  });

  const items: RuntimeItem[] = ITEMS.slice(0, 8).map((item) => {
    const pos = randomOpenPosition(tiles);
    return {
      x: pos.x,
      y: pos.y,
      symbol: item.symbol,
      color: item.color === 'gray' ? 'gray' : item.color === 'green' ? 'green' : 'yellow',
      id: item.id,
      name: item.name,
      hp: item.hp,
      attack: item.attack,
      defense: item.defense,
      score: item.score,
    };
  });

  let hp = 100;
  const maxHp = 100;
  let score = 0;
  let attack = 10;
  let defense = 3;
  let turn = 0;
  let depth = 1;
  let cooldowns: AbilityCooldowns = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const messages: string[] = ['Dive started. Use arrows/WASD to move.'];

  hideCursor();
  try {
    while (hp > 0) {
      clearScreen();

      const level: RenderLevel = {
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        tiles,
        enemies,
        items,
      };
      renderMap(level, player, visible, 1, 1);

      const stats: HudStats = { hp, maxHp, score, depth, turn };
      renderHud(stats, cooldowns, messages, MAP_HEIGHT + 2, 1);

      const action = await getInput();
      if (action.type === 'quit') {
        messages.push('You retreat to the surface.');
        break;
      }

      if (action.type === 'inventory') {
        messages.push(`Loadout ATK ${attack}, DEF ${defense}`);
      }

      if (action.type === 'ability') {
        if (cooldowns[action.slot] > 0) {
          messages.push(`Ability ${action.slot} cooling down (${cooldowns[action.slot]}).`);
        } else {
          if (action.slot === 1) {
            const heal = 12;
            hp = clamp(hp + heal, 0, maxHp);
            messages.push(`Ability 1: Mend shell (+${heal} HP).`);
          } else if (action.slot === 2) {
            attack += 2;
            messages.push('Ability 2: Rending claw (+2 ATK this run).');
          } else if (action.slot === 3) {
            defense += 2;
            messages.push('Ability 3: Harden carapace (+2 DEF this run).');
          } else {
            const stunDamage = 10;
            const target = enemies[0];
            if (target) {
              target.hp -= stunDamage;
              messages.push(`Ability 4: Shock pulse hits ${target.name} for ${stunDamage}.`);
              if (target.hp <= 0) {
                const idx = enemies.indexOf(target);
                if (idx >= 0) {
                  enemies.splice(idx, 1);
                }
                score += target.xpReward;
                messages.push(`${target.name} is defeated.`);
              }
            } else {
              messages.push('Ability 4 fizzles. No target in range.');
            }
          }
          cooldowns = {
            ...cooldowns,
            [action.slot]: action.slot === 4 ? 6 : 4,
          };
        }
      }

      if (action.type === 'move') {
        const nextX = clamp(player.x + action.dx, 0, MAP_WIDTH - 1);
        const nextY = clamp(player.y + action.dy, 0, MAP_HEIGHT - 1);

        if (!isWalkable(tiles[nextY]?.[nextX])) {
          messages.push('Rock wall blocks your path.');
        } else {
          player.x = nextX;
          player.y = nextY;

          const enemy = enemies.find((e) => e.x === player.x && e.y === player.y);
          if (enemy) {
            const outgoing = computeDamage(attack, enemy.defense);
            enemy.hp -= outgoing;
            messages.push(`You hit ${enemy.name} for ${outgoing}.`);

            if (enemy.hp <= 0) {
              const idx = enemies.indexOf(enemy);
              if (idx >= 0) {
                enemies.splice(idx, 1);
              }
              score += enemy.xpReward;
              messages.push(`${enemy.name} falls. +${enemy.xpReward} score.`);
            } else {
              const incoming = computeDamage(enemy.attack, defense);
              hp -= incoming;
              messages.push(`${enemy.name} hits back for ${incoming}.`);
            }
          }

          const item = items.find((it) => it.x === player.x && it.y === player.y);
          if (item) {
            const idx = items.indexOf(item);
            if (idx >= 0) {
              items.splice(idx, 1);
            }

            if (item.hp) {
              hp = clamp(hp + item.hp, 0, maxHp);
              messages.push(`You use ${item.name} (+${item.hp} HP).`);
            }
            if (item.attack) {
              attack += item.attack;
              messages.push(`${item.name} equipped (+${item.attack} ATK).`);
            }
            if (item.defense) {
              defense += item.defense;
              messages.push(`${item.name} equipped (+${item.defense} DEF).`);
            }
            if (item.score) {
              score += item.score;
              messages.push(`Collected ${item.name} (+${item.score} score).`);
            }
          }
        }
      }

      if (messages.length > 12) {
        messages.splice(0, messages.length - 12);
      }

      turn += 1;
      if (turn % 30 === 0) {
        depth += 1;
      }
      cooldowns = decrementCooldowns(cooldowns);

      if (enemies.length === 0) {
        messages.push('Floor cleared. You descend deeper.');
        score += 250;
        break;
      }
    }
  } finally {
    showCursor();
  }

  return { score, survivedTurns: turn };
}

async function main(): Promise<void> {
  await showTitleScreen();

  while (true) {
    const result = await runSession();
    const now = new Date().toISOString().slice(0, 10);
    const leaderboard = await saveLeaderboardEntry({
      name: 'Lobster',
      score: result.score,
      date: now,
    });

    const choice = await showGameOverScreen(result.score);
    await showLeaderboard(leaderboard.length > 0 ? leaderboard : await readLeaderboard());

    if (choice === 'quit') {
      clearScreen();
      process.exit(0);
    }
  }
}

main().catch((error: unknown) => {
  showCursor();
  clearScreen();
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
