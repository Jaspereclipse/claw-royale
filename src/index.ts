#!/usr/bin/env node
import { Game, VISIBILITY_RADIUS } from './engine/game.js';
import type { Direction } from './engine/game.js';
import type { Enemy } from './engine/entity.js';
import { LEVEL_WIDTH, LEVEL_HEIGHT } from './engine/level.js';
import { useAbility } from './engine/combat.js';
import { renderHud, type AbilityDisplay, type AbilityCooldowns, type HudStats } from './ui/hud.js';
import { getInput } from './ui/input.js';
import {
  ansiToColor,
  clearScreen,
  hideCursor,
  renderMap,
  showCursor,
  type RenderEntity,
  type RenderLevel,
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
  readonly depth: number;
}

const ABILITY_SLOTS: Record<1 | 2 | 3 | 4, string> = {
  1: 'ClawStrike',
  2: 'ShellShield',
  3: 'InkCloud',
  4: 'PincerGrab',
};

function buildVisibleSet(game: Game): Set<string> {
  const visible = new Set<string>();
  const px = game.player.position.x;
  const py = game.player.position.y;
  for (let y = 0; y < LEVEL_HEIGHT; y++) {
    for (let x = 0; x < LEVEL_WIDTH; x++) {
      const dist = Math.abs(px - x) + Math.abs(py - y);
      if (dist <= VISIBILITY_RADIUS) {
        visible.add(`${x},${y}`);
      }
    }
  }
  return visible;
}

function buildRenderLevel(game: Game): RenderLevel {
  const tiles: RenderTile[][] = [];
  for (let y = 0; y < LEVEL_HEIGHT; y++) {
    const row: RenderTile[] = [];
    for (let x = 0; x < LEVEL_WIDTH; x++) {
      const tile = game.level.getTile(x, y);
      if (tile) {
        row.push({ type: tile.type as TileType, symbol: tile.symbol });
      } else {
        row.push({ type: 'rock', symbol: '#' });
      }
    }
    tiles.push(row);
  }

  const enemies: RenderEntity[] = game.level.enemies
    .filter((e) => e.isAlive)
    .map((e) => ({
      x: e.position.x,
      y: e.position.y,
      symbol: e.symbol,
      color: ansiToColor(e.color),
    }));

  const items: RenderEntity[] = game.level.items.map((item) => {
    const placed = item as { _position?: { x: number; y: number } };
    return {
      x: placed._position?.x ?? 0,
      y: placed._position?.y ?? 0,
      symbol: item.symbol,
      color: ansiToColor(item.color),
    };
  });

  return {
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    tiles,
    enemies,
    items,
  };
}

function getAbilityDisplays(game: Game): AbilityDisplay[] {
  return game.player.abilities.map((a, i) => ({
    slot: i + 1,
    name: a.name,
    cooldown: a.currentCooldown,
  }));
}

function getAbilityCooldowns(game: Game): AbilityCooldowns {
  const abilities = game.player.abilities;
  return {
    1: abilities[0]?.currentCooldown ?? 0,
    2: abilities[1]?.currentCooldown ?? 0,
    3: abilities[2]?.currentCooldown ?? 0,
    4: abilities[3]?.currentCooldown ?? 0,
  };
}

function showInventory(game: Game): string[] {
  const msgs: string[] = [];
  const inv = game.player.inventory;
  if (inv.length === 0) {
    msgs.push('Inventory is empty.');
  } else {
    msgs.push(`Inventory (${inv.length} items):`);
    inv.forEach((item, i) => {
      msgs.push(`  ${i + 1}. ${item.name} (${item.effect}: ${item.value})`);
    });
  }
  msgs.push(`ATK ${game.player.attack} | DEF ${game.player.defense}`);
  return msgs;
}

async function runSession(): Promise<SessionResult> {
  const game = new Game();
  const messages: string[] = [...game.messages];

  hideCursor();
  try {
    while (game.state !== 'gameover') {
      clearScreen();

      const visible = buildVisibleSet(game);
      const level = buildRenderLevel(game);
      renderMap(level, { x: game.player.position.x, y: game.player.position.y, symbol: '@' }, visible, 1, 1);

      const stats: HudStats = {
        hp: game.player.health,
        maxHp: game.player.maxHealth,
        score: game.player.score,
        depth: game.depth,
        turn: game.turnCount,
      };
      const cooldowns = getAbilityCooldowns(game);
      const abilityDisplays = getAbilityDisplays(game);
      renderHud(stats, cooldowns, messages, LEVEL_HEIGHT + 2, 1, abilityDisplays);

      const action = await getInput();

      if (action.type === 'quit') {
        messages.push('You retreat to the surface.');
        break;
      }

      if (action.type === 'inventory') {
        const invMessages = showInventory(game);
        messages.push(...invMessages);
        if (messages.length > 12) messages.splice(0, messages.length - 12);
        continue;
      }

      if (action.type === 'ability') {
        const abilityName = ABILITY_SLOTS[action.slot];
        if (game.state === 'combat' && game.combatTarget) {
          const result = game.processCombatTurn('ability', abilityName);
          messages.push(...result.messages);
        } else {
          // Use ability from exploration (target nearest visible enemy or null)
          const nearestEnemy = findNearestEnemy(game);
          const result = useAbility(game.player, nearestEnemy ?? null, abilityName);
          messages.push(result.message);
          if (result.success) {
            if (nearestEnemy && !nearestEnemy.isAlive) {
              game.level.removeEnemy(nearestEnemy);
            }
          }
        }
        if (messages.length > 12) messages.splice(0, messages.length - 12);
        continue;
      }

      if (action.type === 'move') {
        const direction = deltaToDirection(action.dx, action.dy);
        if (!direction) continue;

        if (game.state === 'combat') {
          // In combat, movement means attack
          const result = game.processCombatTurn('attack');
          messages.push(...result.messages);
        } else {
          const result = game.processTurn(direction);
          messages.push(...result.messages);
        }
      }

      if (action.type === 'confirm') {
        if (game.state === 'combat' && game.combatTarget) {
          const result = game.processCombatTurn('attack');
          messages.push(...result.messages);
        }
      }

      if (messages.length > 12) {
        messages.splice(0, messages.length - 12);
      }
    }
  } finally {
    showCursor();
  }

  return { score: game.player.score, depth: game.depth };
}

function findNearestEnemy(game: Game): Enemy | undefined {
  let nearest: Enemy | undefined;
  let bestDist = Infinity;
  const px = game.player.position.x;
  const py = game.player.position.y;
  for (const enemy of game.level.enemies) {
    if (!enemy.isAlive) continue;
    const dist = Math.abs(enemy.position.x - px) + Math.abs(enemy.position.y - py);
    if (dist <= VISIBILITY_RADIUS && dist < bestDist) {
      bestDist = dist;
      nearest = enemy;
    }
  }
  return nearest;
}

function deltaToDirection(dx: number, dy: number): Direction | null {
  if (dx === 1 && dy === 0) return 'right';
  if (dx === -1 && dy === 0) return 'left';
  if (dx === 0 && dy === -1) return 'up';
  if (dx === 0 && dy === 1) return 'down';
  return null;
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
