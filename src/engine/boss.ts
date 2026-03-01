import { Enemy, Player, Position } from './entity.js';
import { Level, LEVEL_WIDTH, LEVEL_HEIGHT } from './level.js';
import type {
  BossDefinition,
  BossAbility,
  BossEncounter,
  BossEffect,
  GameEvent,
} from './types.js';

export interface BossAction {
  messages: string[];
  damage: number;
  events: GameEvent[];
}

export interface AbilityResult {
  messages: string[];
  damage: number;
  events: GameEvent[];
}

// Boss definitions — data needed by the engine for boss encounters.
export const BOSS_DEFINITIONS: readonly BossDefinition[] = [
  {
    id: 'king-crab',
    name: 'King Crab',
    title: 'King Crab, Lord of the Shallows',
    symbol: 'K',
    color: '\x1b[31;1m',
    baseHealth: 60,
    baseAttack: 12,
    baseDefense: 8,
    xpReward: 100,
    abilities: [
      { name: 'Claw Slam', description: 'A devastating claw attack', damage: 15, cooldown: 3, effect: { kind: 'damage' } },
      { name: 'Shell Summon', description: 'Calls minions to aid', damage: 0, cooldown: 5, effect: { kind: 'summon', enemyCount: 2 } },
    ],
    appearsAtDepth: 3,
    flavorText: 'The sand trembles. A massive claw breaks the surface.',
    asciiArt: ' (\\/)\\(\\/)\n  \\  K  /\n   |===|',
  },
  {
    id: 'kraken',
    name: 'Kraken',
    title: 'Kraken, Terror of the Deep',
    symbol: 'Q',
    color: '\x1b[35;1m',
    baseHealth: 100,
    baseAttack: 16,
    baseDefense: 6,
    xpReward: 200,
    abilities: [
      { name: 'Tentacle Sweep', description: 'Area attack', damage: 12, cooldown: 3, effect: { kind: 'aoe', radius: 4 } },
      { name: 'Ink Heal', description: 'Regenerates health', damage: 0, cooldown: 5, effect: { kind: 'heal', amount: 20 } },
      { name: 'Spawn Tentacles', description: 'Summons tentacle minions', damage: 0, cooldown: 6, effect: { kind: 'summon', enemyCount: 3 } },
    ],
    appearsAtDepth: 6,
    flavorText: 'The water darkens. Tentacles coil from the abyss.',
    asciiArt: '  /\\_/\\\n (Q   Q)\n  \\~~~/',
  },
  {
    id: 'mecha-lobster',
    name: 'Mecha-Lobster',
    title: 'Mecha-Lobster, the Betrayer',
    symbol: 'M',
    color: '\x1b[36;1m',
    baseHealth: 140,
    baseAttack: 20,
    baseDefense: 12,
    xpReward: 350,
    abilities: [
      { name: 'Laser Claw', description: 'Precision damage', damage: 20, cooldown: 3, effect: { kind: 'damage' } },
      { name: 'EMP Blast', description: 'Area shockwave', damage: 14, cooldown: 4, effect: { kind: 'aoe', radius: 3 } },
      { name: 'Overclock', description: 'Enters berserk mode', damage: 0, cooldown: 99, effect: { kind: 'enrage', attackMultiplier: 1.5 } },
    ],
    appearsAtDepth: 9,
    flavorText: 'Chrome claws gleam. A lobster rebuilt for war.',
    asciiArt: ' [=M=]\n /|_|\\\n/ | | \\',
  },
  {
    id: 'leviathan',
    name: 'Leviathan',
    title: 'Leviathan, End of All Tides',
    symbol: 'L',
    color: '\x1b[33;1m',
    baseHealth: 200,
    baseAttack: 25,
    baseDefense: 15,
    xpReward: 500,
    abilities: [
      { name: 'Abyssal Roar', description: 'Devastating area attack', damage: 18, cooldown: 3, effect: { kind: 'aoe', radius: 5 } },
      { name: 'Devour', description: 'Massive damage', damage: 30, cooldown: 4, effect: { kind: 'damage' } },
      { name: 'Undying Rage', description: 'Becomes enraged', damage: 0, cooldown: 99, effect: { kind: 'enrage', attackMultiplier: 2 } },
      { name: 'Depth Healing', description: 'Regenerates', damage: 0, cooldown: 6, effect: { kind: 'heal', amount: 30 } },
    ],
    appearsAtDepth: 12,
    flavorText: 'The ocean itself recoils. Something ancient stirs.',
    asciiArt: '  ___L___\n /       \\\n|  @   @  |\n \\__===__/',
  },
];

/**
 * Find the boss definition for a given depth (every 3 levels).
 * Cycles through available bosses.
 */
export function getBossForDepth(depth: number): BossDefinition | null {
  if (depth <= 0 || depth % 3 !== 0) return null;

  // Find the appropriate boss based on depth
  for (let i = BOSS_DEFINITIONS.length - 1; i >= 0; i--) {
    if (depth >= BOSS_DEFINITIONS[i].appearsAtDepth) {
      return BOSS_DEFINITIONS[i];
    }
  }
  return BOSS_DEFINITIONS[0];
}

/**
 * Create a boss encounter from a definition, scaling stats by depth.
 */
export function createBossEncounter(definition: BossDefinition, depth: number): BossEncounter {
  const depthBeyond = Math.max(0, depth - definition.appearsAtDepth);
  const scale = Math.pow(1.2, depthBeyond);

  const scaledHealth = Math.floor(definition.baseHealth * scale);
  const scaledAttack = Math.floor(definition.baseAttack * scale);
  const scaledDefense = Math.floor(definition.baseDefense * scale);

  const bossEnemy = new Enemy(
    definition.name,
    { x: 0, y: 0 }, // position set later when placed in level
    scaledHealth,
    scaledAttack,
    scaledDefense,
    definition.symbol,
    definition.color,
    definition.xpReward,
    'aggressive',
  );

  const cooldowns = new Map<string, number>();
  for (const ability of definition.abilities) {
    cooldowns.set(ability.name, 0);
  }

  return {
    boss: bossEnemy,
    definition,
    phase: 1,
    abilityCooldowns: cooldowns,
    enraged: false,
  };
}

/**
 * Determine the current phase based on boss HP ratio.
 */
function getPhase(encounter: BossEncounter): number {
  const hpRatio = encounter.boss.health / encounter.boss.maxHealth;
  if (hpRatio <= 0.25) return 3;
  if (hpRatio <= 0.5) return 2;
  return 1;
}

/**
 * Tick all ability cooldowns down by 1.
 */
function tickBossCooldowns(encounter: BossEncounter): void {
  for (const [name, cd] of encounter.abilityCooldowns) {
    if (cd > 0) {
      encounter.abilityCooldowns.set(name, cd - 1);
    }
  }
}

/**
 * Get abilities that are off cooldown.
 */
function getReadyAbilities(encounter: BossEncounter): BossAbility[] {
  const ready: BossAbility[] = [];
  for (const ability of encounter.definition.abilities) {
    const cd = encounter.abilityCooldowns.get(ability.name) ?? 0;
    if (cd === 0) {
      ready.push(ability);
    }
  }
  return ready;
}

/**
 * Calculate manhattan distance between two positions.
 */
function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Find a random passable position near the boss for summoning minions.
 */
function findNearbyPosition(boss: Position, level: Level): Position | null {
  const maxAttempts = 50;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const offsetX = Math.floor(Math.random() * 5) - 2; // -2 to +2
    const offsetY = Math.floor(Math.random() * 5) - 2;
    const x = boss.x + offsetX;
    const y = boss.y + offsetY;

    if (x < 0 || x >= LEVEL_WIDTH || y < 0 || y >= LEVEL_HEIGHT) continue;
    if (!level.isPassable(x, y)) continue;
    if (level.getEnemyAt(x, y)) continue;

    return { x, y };
  }
  return null;
}

/**
 * Resolve a specific boss ability.
 */
export function resolveBossAbility(
  encounter: BossEncounter,
  ability: BossAbility,
  player: Player,
  level: Level,
): AbilityResult {
  const messages: string[] = [];
  let damage = 0;
  const events: GameEvent[] = [];

  const effect: BossEffect = ability.effect;

  switch (effect.kind) {
    case 'damage': {
      const rawDamage = Math.max(1, ability.damage - player.defense);
      player.takeDamage(rawDamage);
      damage = rawDamage;
      messages.push(`${encounter.definition.name} uses ${ability.name}! ${rawDamage} damage!`);
      events.push({
        kind: 'boss-ability',
        boss: encounter.definition,
        ability,
        damage: rawDamage,
      });
      break;
    }

    case 'aoe': {
      const dist = manhattanDistance(encounter.boss.position, player.position);
      if (dist <= effect.radius) {
        const rawDamage = Math.max(1, ability.damage - player.defense);
        player.takeDamage(rawDamage);
        damage = rawDamage;
        messages.push(
          `${encounter.definition.name} uses ${ability.name}! The area erupts for ${rawDamage} damage!`,
        );
      } else {
        messages.push(
          `${encounter.definition.name} uses ${ability.name}! You dodge out of range!`,
        );
      }
      events.push({
        kind: 'boss-ability',
        boss: encounter.definition,
        ability,
        damage,
      });
      break;
    }

    case 'summon': {
      let summoned = 0;
      for (let i = 0; i < effect.enemyCount; i++) {
        const pos = findNearbyPosition(encounter.boss.position, level);
        if (!pos) break;
        const minion = new Enemy(
          'Minion',
          pos,
          5 + level.difficulty * 2,
          3 + level.difficulty,
          1,
          'm',
          '\x1b[90m',
          2,
          'aggressive',
        );
        level.enemies.push(minion);
        summoned++;
      }
      messages.push(
        `${encounter.definition.name} uses ${ability.name}! ${summoned} minion${summoned !== 1 ? 's' : ''} appear!`,
      );
      events.push({
        kind: 'boss-ability',
        boss: encounter.definition,
        ability,
        damage: 0,
      });
      break;
    }

    case 'heal': {
      const healed = encounter.boss.heal(effect.amount);
      messages.push(
        `${encounter.definition.name} uses ${ability.name}! Heals ${healed} HP. (${encounter.boss.health}/${encounter.boss.maxHealth})`,
      );
      events.push({
        kind: 'boss-ability',
        boss: encounter.definition,
        ability,
        damage: 0,
      });
      break;
    }

    case 'enrage': {
      if (!encounter.enraged) {
        encounter.enraged = true;
        encounter.boss.attack = Math.floor(encounter.boss.attack * effect.attackMultiplier);
        messages.push(
          `${encounter.definition.name} uses ${ability.name}! Attack power surges to ${encounter.boss.attack}!`,
        );
        events.push({
          kind: 'boss-enraged',
          boss: encounter.definition,
        });
      } else {
        messages.push(`${encounter.definition.name} is already enraged!`);
      }
      events.push({
        kind: 'boss-ability',
        boss: encounter.definition,
        ability,
        damage: 0,
      });
      break;
    }
  }

  // Put ability on cooldown
  encounter.abilityCooldowns.set(ability.name, ability.cooldown);

  return { messages, damage, events };
}

/**
 * Process a boss turn: AI selects action based on phase, resolves it.
 */
export function processBossTurn(
  encounter: BossEncounter,
  player: Player,
  level: Level,
): BossAction {
  const messages: string[] = [];
  let totalDamage = 0;
  const events: GameEvent[] = [];

  // Update phase
  encounter.phase = getPhase(encounter);

  // Tick cooldowns
  tickBossCooldowns(encounter);

  const readyAbilities = getReadyAbilities(encounter);

  let usedAbility = false;

  if (readyAbilities.length > 0) {
    // Phase-based AI decision
    let useAbilityChance: number;

    switch (encounter.phase) {
      case 1:
        // Phase 1 (>50% HP): occasional ability use
        useAbilityChance = 0.3;
        break;
      case 2:
        // Phase 2 (<50% HP): more aggressive, also reduce cooldowns
        useAbilityChance = 0.6;
        for (const [name, cd] of encounter.abilityCooldowns) {
          if (cd > 1) {
            encounter.abilityCooldowns.set(name, cd - 1);
          }
        }
        break;
      case 3: {
        // Phase 3 (<25% HP): enrage if possible, spam abilities
        useAbilityChance = 0.9;
        // Prioritize enrage
        const enrageAbility = readyAbilities.find(
          a => a.effect.kind === 'enrage',
        );
        if (enrageAbility && !encounter.enraged) {
          const result = resolveBossAbility(encounter, enrageAbility, player, level);
          messages.push(...result.messages);
          totalDamage += result.damage;
          events.push(...result.events);
          usedAbility = true;
        }
        break;
      }
      default:
        useAbilityChance = 0.3;
    }

    if (!usedAbility && Math.random() < useAbilityChance) {
      // Pick a random ready ability
      const ability = readyAbilities[Math.floor(Math.random() * readyAbilities.length)];
      const result = resolveBossAbility(encounter, ability, player, level);
      messages.push(...result.messages);
      totalDamage += result.damage;
      events.push(...result.events);
      usedAbility = true;
    }
  }

  // If no ability used, do a basic attack
  if (!usedAbility) {
    const rawDamage = Math.max(1, encounter.boss.attack - player.defense);
    player.takeDamage(rawDamage);
    totalDamage += rawDamage;
    messages.push(
      `${encounter.definition.name} attacks for ${rawDamage} damage! (${player.health}/${player.maxHealth} HP)`,
    );
  }

  return { messages, damage: totalDamage, events };
}
