import { Player, Enemy, Item } from './entity.js';
import { Level, generateLevel, generateBossRoom, isBossLevel, LEVEL_WIDTH, LEVEL_HEIGHT } from './level.js';
import {
  CombatState,
  resolveCombat,
  resolveEnemyAttack,
  useAbility,
  useItem,
} from './combat.js';
import { createBossEncounter, processBossTurn, getBossForDepth } from './boss.js';
import type { BossEncounter, GameEvent } from './types.js';

export type Direction = 'up' | 'down' | 'left' | 'right';
export type GameState = 'playing' | 'combat' | 'inventory' | 'gameover';
export const VISIBILITY_RADIUS = 8;

export interface TurnResult {
  messages: string[];
  state: GameState;
  events?: GameEvent[];
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
  readonly combatState: CombatState;
  private nextEntityId = 0;
  bossEncounter: BossEncounter | null;
  events: GameEvent[];

  constructor() {
    this.combatState = new CombatState();
    this.depth = 1;
    this.level = generateLevel(this.depth, () => this.allocId());
    this.player = new Player(this.allocId(), this.level.playerStart);
    this.turnCount = 0;
    this.state = 'playing';
    this.messages = ['You descend to the ocean floor. The hunt begins.'];
    this.combatTarget = null;
    this.bossEncounter = null;
    this.events = [];
  }

  private allocId(): number {
    return this.nextEntityId++;
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
    this.events = [];
    this.turnCount++;
    this.player.tickCooldowns();
    this.combatState.tickShield();

    const { dx, dy } = DIRECTION_DELTA[direction];
    const newX = this.player.position.x + dx;
    const newY = this.player.position.y + dy;

    // Check for enemy at target position
    const enemy = this.level.getEnemyAt(newX, newY);
    if (enemy) {
      // Check if this enemy is a boss
      if (this.bossEncounter && this.bossEncounter.boss === enemy) {
        const result = resolveCombat(this.player, enemy);
        this.messages.push(result.message);

        if (result.killed) {
          this.handleBossDefeated();
          this.player.position.x = newX;
          this.player.position.y = newY;
        } else {
          this.combatTarget = enemy;
          this.state = 'combat';
        }
      } else {
        const result = resolveCombat(this.player, enemy);
        this.messages.push(result.message);

        if (result.killed) {
          this.level.removeEnemy(enemy);
          this.combatTarget = null;
          this.player.position.x = newX;
          this.player.position.y = newY;
        } else {
          this.combatTarget = enemy;
          this.state = 'combat';
        }
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
        return { messages: this.messages, state: this.state, events: this.events };
      }
    } else {
      this.messages.push('Blocked!');
    }

    // Process enemy turns (boss uses special AI)
    this.processEnemyTurns();

    // Check player death
    if (!this.player.isAlive) {
      this.state = 'gameover';
      this.messages.push(`You have been defeated at depth ${this.depth}. Final score: ${this.player.score}`);
    }

    return { messages: this.messages, state: this.state, events: this.events };
  }

  processCombatTurn(action: 'attack' | 'ability' | 'item', param?: string | number): TurnResult {
    if (this.state !== 'combat' || !this.combatTarget) {
      return { messages: ['Not in combat.'], state: this.state };
    }

    this.messages = [];
    this.events = [];
    this.turnCount++;
    this.player.tickCooldowns();
    this.combatState.tickShield();

    const enemy = this.combatTarget;
    const isBoss = this.bossEncounter !== null && this.bossEncounter.boss === enemy;

    switch (action) {
      case 'attack': {
        const result = resolveCombat(this.player, enemy);
        this.messages.push(result.message);
        if (result.killed) {
          if (isBoss) {
            this.handleBossDefeated();
          } else {
            this.level.removeEnemy(enemy);
          }
          this.combatTarget = null;
          this.state = 'playing';
          return { messages: this.messages, state: this.state, events: this.events };
        }
        break;
      }
      case 'ability': {
        if (typeof param !== 'string') {
          this.messages.push('Specify an ability name.');
          return { messages: this.messages, state: this.state };
        }
        const result = useAbility(this.player, enemy, param, this.combatState);
        this.messages.push(result.message);
        if (!result.success) {
          return { messages: this.messages, state: this.state };
        }
        if (!enemy.isAlive) {
          if (isBoss) {
            this.handleBossDefeated();
          } else {
            this.level.removeEnemy(enemy);
          }
          this.combatTarget = null;
          this.state = 'playing';
          return { messages: this.messages, state: this.state, events: this.events };
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

    // Boss or enemy counter-attack
    if (enemy.isAlive && !this.combatState.consumeEnemySkipTurn()) {
      if (isBoss && this.bossEncounter) {
        const bossResult = processBossTurn(this.bossEncounter, this.player, this.level, () => this.allocId());
        this.messages.push(...bossResult.messages);
        this.events.push(...bossResult.events);
      } else {
        const enemyResult = resolveEnemyAttack(enemy, this.player, this.combatState);
        this.messages.push(enemyResult.message);
      }
    }

    if (!this.player.isAlive) {
      this.state = 'gameover';
      this.messages.push(`Defeated at depth ${this.depth}. Final score: ${this.player.score}`);
    }

    return { messages: this.messages, state: this.state, events: this.events };
  }

  useExplorationAbility(abilityName: string): TurnResult {
    this.messages = [];
    const nearestEnemy = this.findNearestEnemy();
    const result = useAbility(this.player, nearestEnemy ?? null, abilityName, this.combatState);
    this.messages.push(result.message);

    if (result.success) {
      this.turnCount++;
      this.player.tickCooldowns();
      this.combatState.tickShield();

      if (nearestEnemy && !nearestEnemy.isAlive) {
        this.level.removeEnemy(nearestEnemy);
      }

      this.processEnemyTurns();

      if (!this.player.isAlive) {
        this.state = 'gameover';
        this.messages.push(`Defeated at depth ${this.depth}. Final score: ${this.player.score}`);
      }
    }

    return { messages: this.messages, state: this.state };
  }

  useInventoryItem(index: number): TurnResult {
    this.messages = [];

    const result = useItem(this.player, index);
    this.messages.push(result.message);

    if (result.success) {
      this.turnCount++;
      this.player.tickCooldowns();
      this.combatState.tickShield();

      this.processEnemyTurns();

      if (!this.player.isAlive) {
        this.state = 'gameover';
        this.messages.push(`Defeated at depth ${this.depth}. Final score: ${this.player.score}`);
      }
    }

    return { messages: this.messages, state: this.state };
  }

  private findNearestEnemy(): Enemy | undefined {
    let nearest: Enemy | undefined;
    let bestDist = Infinity;
    const px = this.player.position.x;
    const py = this.player.position.y;
    for (const enemy of this.level.enemies) {
      if (!enemy.isAlive) continue;
      const dist = Math.abs(enemy.position.x - px) + Math.abs(enemy.position.y - py);
      if (dist <= VISIBILITY_RADIUS && dist < bestDist) {
        bestDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  private processEnemyTurns(): void {
    if (this.combatState.consumeEnemySkipTurn()) {
      this.messages.push('Enemies are blinded by the ink cloud!');
      return;
    }

    // Process boss turn separately if active and not in direct combat
    if (this.bossEncounter && this.bossEncounter.boss.isAlive && this.state !== 'combat') {
      const bossResult = processBossTurn(this.bossEncounter, this.player, this.level, () => this.allocId());
      this.messages.push(...bossResult.messages);
      this.events.push(...bossResult.events);
    }

    for (const enemy of this.level.enemies) {
      if (!enemy.isAlive) continue;
      // Skip boss — handled above
      if (this.bossEncounter && this.bossEncounter.boss === enemy) continue;
      if (!this.isVisible(enemy.position.x, enemy.position.y)) continue;

      const dx = this.player.position.x - enemy.position.x;
      const dy = this.player.position.y - enemy.position.y;
      const dist = Math.abs(dx) + Math.abs(dy);

      let moveX = 0;
      let moveY = 0;

      switch (enemy.behavior) {
        case 'aggressive':
          if (dist <= 1) {
            const result = resolveEnemyAttack(enemy, this.player, this.combatState);
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
            const result = resolveEnemyAttack(enemy, this.player, this.combatState);
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
            const result = resolveEnemyAttack(enemy, this.player, this.combatState);
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

  private handleBossDefeated(): void {
    if (!this.bossEncounter) return;

    const def = this.bossEncounter.definition;
    const xp = def.xpReward;
    this.player.score += xp;
    this.level.removeEnemy(this.bossEncounter.boss);
    this.messages.push(`${def.name} has been defeated! +${xp} XP!`);

    // Drop special loot
    const loot = new Item('Boss Trophy', '*', '\x1b[33;1m', 'score', xp);
    this.player.inventory.push(loot);
    this.messages.push(`Obtained Boss Trophy!`);

    this.events.push({ kind: 'boss-defeated', boss: def, xp });
    this.bossEncounter = null;
  }

  private descendLevel(): void {
    this.depth++;
    this.bossEncounter = null;
    this.combatTarget = null;
    this.combatState.reset();

    if (isBossLevel(this.depth)) {
      this.level = generateBossRoom(this.depth, () => this.allocId());
      this.player.position = { ...this.level.playerStart };

      // Place boss in center
      const bossDef = getBossForDepth(this.depth);
      if (bossDef) {
        const encounter = createBossEncounter(bossDef, this.depth, () => this.allocId());
        const centerX = Math.floor(LEVEL_WIDTH / 2);
        const centerY = Math.floor(LEVEL_HEIGHT / 2);
        encounter.boss.position = { x: centerX, y: centerY };
        this.level.enemies.push(encounter.boss);
        this.bossEncounter = encounter;

        this.events.push({ kind: 'boss-encounter', boss: bossDef });
        this.messages.push(`Descended to depth ${this.depth}. ${bossDef.flavorText}`);
      }
    } else {
      this.level = generateLevel(this.depth, () => this.allocId());
      this.player.position = { ...this.level.playerStart };
      this.messages.push(`Descended to depth ${this.depth}. The currents grow stronger...`);
    }

    this.player.level++;
    this.state = 'playing';
  }
}
