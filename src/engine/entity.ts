export interface Position {
  x: number;
  y: number;
}

export type ItemEffect = 'heal' | 'armor' | 'weapon' | 'score';
export type EnemyBehavior = 'aggressive' | 'passive' | 'fleeing';

let nextEntityId = 0;

export class Entity {
  readonly id: number;
  name: string;
  position: Position;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  symbol: string;
  color: string;

  constructor(
    name: string,
    position: Position,
    health: number,
    attack: number,
    defense: number,
    symbol: string,
    color: string,
  ) {
    this.id = nextEntityId++;
    this.name = name;
    this.position = { ...position };
    this.health = health;
    this.maxHealth = health;
    this.attack = attack;
    this.defense = defense;
    this.symbol = symbol;
    this.color = color;
  }

  get isAlive(): boolean {
    return this.health > 0;
  }

  takeDamage(amount: number): number {
    const actual = Math.max(0, amount);
    this.health = Math.max(0, this.health - actual);
    return actual;
  }

  heal(amount: number): number {
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - before;
  }
}

export interface Ability {
  name: string;
  description: string;
  cooldown: number;
  currentCooldown: number;
}

export class Player extends Entity {
  abilities: Ability[];
  inventory: Item[];
  score: number;
  level: number;

  constructor(position: Position) {
    super('Lobster', position, 30, 8, 4, '@', '\x1b[31m');
    this.abilities = [
      { name: 'ClawStrike', description: '2x damage attack', cooldown: 3, currentCooldown: 0 },
      { name: 'ShellShield', description: 'Halve incoming damage for 3 turns', cooldown: 5, currentCooldown: 0 },
      { name: 'InkCloud', description: 'Skip enemy turn', cooldown: 4, currentCooldown: 0 },
      { name: 'PincerGrab', description: 'Steal item from enemy', cooldown: 6, currentCooldown: 0 },
    ];
    this.inventory = [];
    this.score = 0;
    this.level = 1;
  }

  tickCooldowns(): void {
    for (const ability of this.abilities) {
      if (ability.currentCooldown > 0) {
        ability.currentCooldown--;
      }
    }
  }

  getAbility(name: string): Ability | undefined {
    return this.abilities.find(a => a.name === name);
  }

  canUseAbility(name: string): boolean {
    const ability = this.getAbility(name);
    return ability !== undefined && ability.currentCooldown === 0;
  }

  useAbility(name: string): boolean {
    const ability = this.getAbility(name);
    if (!ability || ability.currentCooldown > 0) return false;
    ability.currentCooldown = ability.cooldown;
    return true;
  }
}

export class Enemy extends Entity {
  xpReward: number;
  behavior: EnemyBehavior;

  constructor(
    name: string,
    position: Position,
    health: number,
    attack: number,
    defense: number,
    symbol: string,
    color: string,
    xpReward: number,
    behavior: EnemyBehavior,
  ) {
    super(name, position, health, attack, defense, symbol, color);
    this.xpReward = xpReward;
    this.behavior = behavior;
  }
}

export class Item {
  name: string;
  symbol: string;
  color: string;
  effect: ItemEffect;
  value: number;

  constructor(name: string, symbol: string, color: string, effect: ItemEffect, value: number) {
    this.name = name;
    this.symbol = symbol;
    this.color = color;
    this.effect = effect;
    this.value = value;
  }
}
