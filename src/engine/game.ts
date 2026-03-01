import { Player, Enemy, Item } from './entity.js';
import { Level, generateLevel, LEVEL_WIDTH, LEVEL_HEIGHT } from './level.js';
import {
  resolveCombat,
  resolveEnemyAttack,
  useAbility,
  useItem,
  consumeEnemySkipTurn,
  tickShield,
  resetCombatState,
} from './combat.js';

export type Direction = 'up' | 'down' | 'left' | 'right';
export type GameState = 'playing' | 'combat' | 'inventory' | 'gameover';
export const VISIBILITY_RADIUS = 8;

export interface TurnResult {
  messages: string[];
  state: GameState;
}

const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export class Game {
  player: Player;
  level: Level;
  turnCount: number;
  state: GameState;
  messages: string[];
  depth: number;
  combatTarget: Enemy | null;

  constructor() {
    this.depth = 1;
    this.level = generateLevel(this.depth);
    this.player = new Player(this.level.playerStart);
    this.turnCount = 0;
    this.state = 'playing';
    this.messages = ['You descend to the ocean floor. The hunt begins.'];
    this.combatTarget = null;
  }

  start(): void {
    console.log('🦞 Claw Royale — Starting...');
    console.log(`Depth: ${this.depth} | HP: ${this.player.health}/${this.player.maxHealth}`);
  }

  isVisible(x: number, y: number): boolean {
    const dx = Math.abs(this.player.position.x - x);
    const dy = Math.abs(this.player.position.y - y);
    return dx + dy <= VISIBILITY_RADIUS;
  }

  processTurn(direction: Direction): TurnResult {
    if (this.state === 'gameover') {
      return { messages: ['Game over. Start a new game.'], state: 'gameover' };
    }

    this.messages = [];
    this.turnCount++;
    this.player.tickCooldowns();
    tickShield();

    const { dx, dy } = DIRECTION_DELTA[direction];
    const newX = this.player.position.x + dx;
    const newY = this.player.position.y + dy;

    // Check for enemy at target position
    const enemy = this.level.getEnemyAt(newX, newY);
    if (enemy) {
      const result = resolveCombat(this.player, enemy);
      this.messages.push(result.message);

      if (result.killed) {
        this.level.removeEnemy(enemy);
        this.combatTarget = null;
        // Move into the cleared space
        this.player.position.x = newX;
        this.player.position.y = newY;
      } else {
        this.combatTarget = enemy;
        this.state = 'combat';
      }
    } else if (this.level.isPassable(newX, newY)) {
      // Move player
      this.player.position.x = newX;
      this.player.position.y = newY;

      // Check for item pickup
      const item = this.level.getItemAt(newX, newY);
      if (item) {
        this.player.inventory.push(item);
        this.level.removeItem(item);
        this.messages.push(`Picked up ${item.name}.`);
      }

      // Check for stairs
      const tile = this.level.getTile(newX, newY);
      if (tile && tile.type === 'stairs') {
        this.descendLevel();
        return { messages: this.messages, state: this.state };
      }
    } else {
      this.messages.push('Blocked!');
    }

    // Process enemy turns
    this.processEnemyTurns();

    // Check player death
    if (!this.player.isAlive) {
      this.state = 'gameover';
      this.messages.push(`You have been defeated at depth ${this.depth}. Final score: ${this.player.score}`);
    }

    return { messages: this.messages, state: this.state };
  }

  processCombatTurn(action: 'attack' | 'ability' | 'item', param?: string | number): TurnResult {
    if (this.state !== 'combat' || !this.combatTarget) {
      return { messages: ['Not in combat.'], state: this.state };
    }

    this.messages = [];
    this.turnCount++;
    this.player.tickCooldowns();
    tickShield();

    const enemy = this.combatTarget;

    switch (action) {
      case 'attack': {
        const result = resolveCombat(this.player, enemy);
        this.messages.push(result.message);
        if (result.killed) {
          this.level.removeEnemy(enemy);
          this.combatTarget = null;
          this.state = 'playing';
          return { messages: this.messages, state: this.state };
        }
        break;
      }
      case 'ability': {
        if (typeof param !== 'string') {
          this.messages.push('Specify an ability name.');
          return { messages: this.messages, state: this.state };
        }
        const result = useAbility(this.player, enemy, param);
        this.messages.push(result.message);
        if (!result.success) {
          return { messages: this.messages, state: this.state };
        }
        if (!enemy.isAlive) {
          this.level.removeEnemy(enemy);
          this.combatTarget = null;
          this.state = 'playing';
          return { messages: this.messages, state: this.state };
        }
        break;
      }
      case 'item': {
        if (typeof param !== 'number') {
          this.messages.push('Specify an item index.');
          return { messages: this.messages, state: this.state };
        }
        const result = useItem(this.player, param);
        this.messages.push(result.message);
        break;
      }
    }

    // Enemy counter-attack
    if (enemy.isAlive && !consumeEnemySkipTurn()) {
      const enemyResult = resolveEnemyAttack(enemy, this.player);
      this.messages.push(enemyResult.message);
    }

    if (!this.player.isAlive) {
      this.state = 'gameover';
      this.messages.push(`Defeated at depth ${this.depth}. Final score: ${this.player.score}`);
    }

    return { messages: this.messages, state: this.state };
  }

  private processEnemyTurns(): void {
    if (consumeEnemySkipTurn()) {
      this.messages.push('Enemies are blinded by the ink cloud!');
      return;
    }

    for (const enemy of this.level.enemies) {
      if (!enemy.isAlive) continue;
      if (!this.isVisible(enemy.position.x, enemy.position.y)) continue;

      const dx = this.player.position.x - enemy.position.x;
      const dy = this.player.position.y - enemy.position.y;
      const dist = Math.abs(dx) + Math.abs(dy);

      let moveX = 0;
      let moveY = 0;

      switch (enemy.behavior) {
        case 'aggressive':
          if (dist <= 1) {
            const result = resolveEnemyAttack(enemy, this.player);
            this.messages.push(result.message);
            continue;
          }
          // Move toward player
          if (Math.abs(dx) > Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
          } else {
            moveY = dy > 0 ? 1 : -1;
          }
          break;

        case 'passive':
          // Random movement
          if (dist <= 1) {
            // Attack only if adjacent
            const result = resolveEnemyAttack(enemy, this.player);
            this.messages.push(result.message);
            continue;
          }
          if (Math.random() < 0.5) {
            const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            moveX = dir.x;
            moveY = dir.y;
          }
          break;

        case 'fleeing': {
          const hpRatio = enemy.health / enemy.maxHealth;
          if (hpRatio < 0.5) {
            // Flee away from player
            if (Math.abs(dx) > Math.abs(dy)) {
              moveX = dx > 0 ? -1 : 1;
            } else {
              moveY = dy > 0 ? -1 : 1;
            }
          } else if (dist <= 1) {
            const result = resolveEnemyAttack(enemy, this.player);
            this.messages.push(result.message);
            continue;
          } else {
            // Act like passive when above 50% HP
            if (Math.random() < 0.3) {
              const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
              const dir = dirs[Math.floor(Math.random() * dirs.length)];
              moveX = dir.x;
              moveY = dir.y;
            }
          }
          break;
        }
      }

      const targetX = enemy.position.x + moveX;
      const targetY = enemy.position.y + moveY;

      if (
        this.level.isPassable(targetX, targetY) &&
        !this.level.getEnemyAt(targetX, targetY) &&
        !(targetX === this.player.position.x && targetY === this.player.position.y)
      ) {
        enemy.position.x = targetX;
        enemy.position.y = targetY;
      }
    }
  }

  private descendLevel(): void {
    this.depth++;
    this.level = generateLevel(this.depth);
    this.player.position = { ...this.level.playerStart };
    this.player.level++;
    resetCombatState();
    this.combatTarget = null;
    this.state = 'playing';
    this.messages.push(`Descended to depth ${this.depth}. The currents grow stronger...`);
  }

  useInventoryItem(index: number): TurnResult {
    this.messages = [];
    const result = useItem(this.player, index);
    this.messages.push(result.message);
    return { messages: this.messages, state: this.state };
  }
}
