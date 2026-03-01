import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Entity, Player, Enemy, Item } from './entity.js';
import { calculateDamage, resolveCombat, useAbility, useItem, resetCombatState } from './combat.js';
import { generateLevel, LEVEL_WIDTH, LEVEL_HEIGHT } from './level.js';
import { Game } from './game.js';

describe('Entity', () => {
  it('should create an entity with correct properties', () => {
    const entity = new Entity('Test', { x: 5, y: 10 }, 20, 8, 4, '@', '\x1b[31m');
    assert.equal(entity.name, 'Test');
    assert.equal(entity.position.x, 5);
    assert.equal(entity.position.y, 10);
    assert.equal(entity.health, 20);
    assert.equal(entity.maxHealth, 20);
    assert.equal(entity.attack, 8);
    assert.equal(entity.defense, 4);
    assert.equal(entity.symbol, '@');
    assert.equal(entity.isAlive, true);
  });

  it('should take damage and track death', () => {
    const entity = new Entity('Test', { x: 0, y: 0 }, 10, 5, 2, 'x', '');
    entity.takeDamage(7);
    assert.equal(entity.health, 3);
    assert.equal(entity.isAlive, true);
    entity.takeDamage(5);
    assert.equal(entity.health, 0);
    assert.equal(entity.isAlive, false);
  });

  it('should heal up to max health', () => {
    const entity = new Entity('Test', { x: 0, y: 0 }, 20, 5, 2, 'x', '');
    entity.takeDamage(15);
    assert.equal(entity.health, 5);
    const healed = entity.heal(10);
    assert.equal(healed, 10);
    assert.equal(entity.health, 15);
    const overHeal = entity.heal(100);
    assert.equal(overHeal, 5);
    assert.equal(entity.health, 20);
  });
});

describe('Player', () => {
  it('should create a player with abilities and inventory', () => {
    const player = new Player({ x: 0, y: 0 });
    assert.equal(player.name, 'Lobster');
    assert.equal(player.abilities.length, 4);
    assert.equal(player.inventory.length, 0);
    assert.equal(player.score, 0);
    assert.equal(player.level, 1);
  });

  it('should manage ability cooldowns', () => {
    const player = new Player({ x: 0, y: 0 });
    assert.equal(player.canUseAbility('ClawStrike'), true);
    player.useAbility('ClawStrike');
    assert.equal(player.canUseAbility('ClawStrike'), false);
    const ability = player.getAbility('ClawStrike');
    assert.ok(ability);
    assert.equal(ability.currentCooldown, 3);
    player.tickCooldowns();
    assert.equal(ability.currentCooldown, 2);
    player.tickCooldowns();
    player.tickCooldowns();
    assert.equal(ability.currentCooldown, 0);
    assert.equal(player.canUseAbility('ClawStrike'), true);
  });
});

describe('Enemy', () => {
  it('should create an enemy with behavior and xpReward', () => {
    const enemy = new Enemy('Crab', { x: 3, y: 4 }, 10, 5, 3, 'c', '\x1b[33m', 8, 'aggressive');
    assert.equal(enemy.name, 'Crab');
    assert.equal(enemy.xpReward, 8);
    assert.equal(enemy.behavior, 'aggressive');
  });
});

describe('Item', () => {
  it('should create an item with effect', () => {
    const item = new Item('Seaweed', '*', '\x1b[32m', 'heal', 5);
    assert.equal(item.name, 'Seaweed');
    assert.equal(item.effect, 'heal');
    assert.equal(item.value, 5);
  });
});

describe('Combat', () => {
  it('should calculate damage with minimum of 1', () => {
    for (let i = 0; i < 20; i++) {
      const dmg = calculateDamage(5, 3);
      assert.ok(dmg >= 1, `Damage ${dmg} should be >= 1`);
    }
  });

  it('should resolve combat and kill enemy', () => {
    resetCombatState();
    const player = new Player({ x: 0, y: 0 });
    const enemy = new Enemy('Crab', { x: 1, y: 0 }, 1, 3, 0, 'c', '', 5, 'passive');
    const result = resolveCombat(player, enemy);
    assert.equal(result.killed, true);
    assert.equal(result.xpGained, 5);
    assert.ok(result.message.includes('defeat'));
  });

  it('should resolve combat without killing enemy', () => {
    resetCombatState();
    const player = new Player({ x: 0, y: 0 });
    const enemy = new Enemy('Shark', { x: 1, y: 0 }, 100, 10, 5, 'S', '', 20, 'aggressive');
    const result = resolveCombat(player, enemy);
    assert.equal(result.killed, false);
    assert.equal(result.xpGained, 0);
    assert.ok(result.damage >= 1);
  });

  it('should use ClawStrike ability for double damage', () => {
    resetCombatState();
    const player = new Player({ x: 0, y: 0 });
    const enemy = new Enemy('Crab', { x: 1, y: 0 }, 100, 3, 0, 'c', '', 5, 'passive');
    const result = useAbility(player, enemy, 'ClawStrike');
    assert.equal(result.success, true);
    assert.ok(result.message.includes('Claw Strike'));
    assert.equal(player.canUseAbility('ClawStrike'), false);
  });

  it('should use ShellShield ability', () => {
    resetCombatState();
    const player = new Player({ x: 0, y: 0 });
    const result = useAbility(player, null, 'ShellShield');
    assert.equal(result.success, true);
    assert.ok(result.message.includes('Shield'));
  });

  it('should use InkCloud ability', () => {
    resetCombatState();
    const player = new Player({ x: 0, y: 0 });
    const enemy = new Enemy('Eel', { x: 1, y: 0 }, 10, 5, 2, 'e', '', 8, 'aggressive');
    const result = useAbility(player, enemy, 'InkCloud');
    assert.equal(result.success, true);
    assert.ok(result.message.includes('Ink Cloud'));
  });

  it('should refuse ability on cooldown', () => {
    resetCombatState();
    const player = new Player({ x: 0, y: 0 });
    const enemy = new Enemy('Crab', { x: 1, y: 0 }, 50, 3, 0, 'c', '', 5, 'passive');
    useAbility(player, enemy, 'ClawStrike');
    const result = useAbility(player, enemy, 'ClawStrike');
    assert.equal(result.success, false);
    assert.ok(result.message.includes('cooldown'));
  });

  it('should use items from inventory', () => {
    const player = new Player({ x: 0, y: 0 });
    player.takeDamage(10);
    player.inventory.push(new Item('Seaweed', '*', '', 'heal', 5));
    const result = useItem(player, 0);
    assert.equal(result.success, true);
    assert.ok(result.message.includes('Healed'));
    assert.equal(player.inventory.length, 0);
  });
});

describe('Level Generation', () => {
  it('should generate a level with correct dimensions', () => {
    const level = generateLevel(1);
    assert.equal(level.grid.length, LEVEL_HEIGHT);
    assert.equal(level.grid[0].length, LEVEL_WIDTH);
  });

  it('should place player start on passable tile', () => {
    const level = generateLevel(1);
    const tile = level.getTile(level.playerStart.x, level.playerStart.y);
    assert.ok(tile);
    assert.equal(tile.passable, true);
  });

  it('should place stairs', () => {
    const level = generateLevel(1);
    const tile = level.getTile(level.stairsPosition.x, level.stairsPosition.y);
    assert.ok(tile);
    assert.equal(tile.type, 'stairs');
  });

  it('should place enemies', () => {
    const level = generateLevel(1);
    assert.ok(level.enemies.length > 0, 'Should have at least one enemy');
  });

  it('should place items', () => {
    const level = generateLevel(1);
    assert.ok(level.items.length > 0, 'Should have at least one item');
  });

  it('should increase enemies with difficulty', () => {
    const easy = generateLevel(1);
    const hard = generateLevel(5);
    assert.ok(hard.enemies.length >= easy.enemies.length, 'Higher difficulty should have more enemies');
  });

  it('should detect passability correctly', () => {
    const level = generateLevel(1);
    // Player start should be passable
    assert.equal(level.isPassable(level.playerStart.x, level.playerStart.y), true);
    // Out of bounds should not be passable
    assert.equal(level.isPassable(-1, -1), false);
    assert.equal(level.isPassable(LEVEL_WIDTH, LEVEL_HEIGHT), false);
  });
});

describe('Game', () => {
  it('should initialize with correct defaults', () => {
    const game = new Game();
    assert.equal(game.state, 'playing');
    assert.equal(game.depth, 1);
    assert.equal(game.turnCount, 0);
    assert.ok(game.player);
    assert.ok(game.level);
  });

  it('should process movement turn', () => {
    const game = new Game();
    // Find a valid direction to move
    const { x, y } = game.player.position;
    let moved = false;
    for (const dir of ['right', 'down', 'left', 'up'] as const) {
      const deltas = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] } as const;
      const [dx, dy] = deltas[dir];
      if (game.level.isPassable(x + dx, y + dy) && !game.level.getEnemyAt(x + dx, y + dy)) {
        const result = game.processTurn(dir);
        assert.ok(result.messages !== undefined);
        assert.equal(game.turnCount, 1);
        moved = true;
        break;
      }
    }
    assert.ok(moved, 'Should be able to move in at least one direction');
  });

  it('should not move into walls', () => {
    const game = new Game();
    const startX = game.player.position.x;
    const startY = game.player.position.y;

    // Find a wall direction
    for (const dir of ['right', 'down', 'left', 'up'] as const) {
      const deltas = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] } as const;
      const [dx, dy] = deltas[dir];
      const targetX = startX + dx;
      const targetY = startY + dy;
      if (!game.level.isPassable(targetX, targetY) && !game.level.getEnemyAt(targetX, targetY)) {
        game.processTurn(dir);
        assert.equal(game.player.position.x, startX);
        assert.equal(game.player.position.y, startY);
        break;
      }
    }
  });

  it('should report gameover state', () => {
    const game = new Game();
    game.state = 'gameover';
    const result = game.processTurn('right');
    assert.equal(result.state, 'gameover');
  });

  it('should track visibility by manhattan distance', () => {
    const game = new Game();
    const px = game.player.position.x;
    const py = game.player.position.y;
    assert.equal(game.isVisible(px, py), true);
    assert.equal(game.isVisible(px + 4, py + 4), true); // distance 8
    assert.equal(game.isVisible(px + 5, py + 4), false); // distance 9
  });
});
