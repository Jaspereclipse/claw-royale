import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Player, Enemy } from './entity.js';
import { Level } from './level.js';
import { createBossEncounter, processBossTurn, resolveBossAbility } from './boss.js';
import type { BossDefinition, BossAbility } from './types.js';

function makeTestBossDefinition(overrides?: Partial<BossDefinition>): BossDefinition {
  return {
    id: 'king-crab',
    name: 'King Crab',
    title: 'King Crab, Lord of the Shallows',
    symbol: 'K',
    color: '\x1b[31m',
    baseHealth: 50,
    baseAttack: 10,
    baseDefense: 5,
    xpReward: 100,
    abilities: [
      {
        name: 'Claw Slam',
        description: 'A devastating claw attack',
        damage: 12,
        cooldown: 3,
        effect: { kind: 'damage' },
      },
      {
        name: 'Tidal Wave',
        description: 'Area attack around the boss',
        damage: 8,
        cooldown: 4,
        effect: { kind: 'aoe', radius: 3 },
      },
    ],
    appearsAtDepth: 3,
    flavorText: 'The king of the shallows approaches.',
    asciiArt: '(BOSS)',
    ...overrides,
  };
}

function makeTestLevel(): Level {
  const level = new Level(1);
  // Create a small open area for testing
  for (let y = 5; y < 15; y++) {
    for (let x = 30; x < 50; x++) {
      level.setTile(x, y, 'water');
    }
  }
  return level;
}

describe('Boss Encounter Creation', () => {
  it('should create encounter with correct base stats at appearsAtDepth', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);

    assert.equal(encounter.boss.name, 'King Crab');
    assert.equal(encounter.boss.health, 50); // no scaling at exact depth
    assert.equal(encounter.boss.maxHealth, 50);
    assert.equal(encounter.boss.attack, 10);
    assert.equal(encounter.boss.defense, 5);
    assert.equal(encounter.definition.id, 'king-crab');
    assert.equal(encounter.phase, 1);
    assert.equal(encounter.enraged, false);
  });

  it('should scale boss stats by 1.2x per depth beyond appearsAtDepth', () => {
    const def = makeTestBossDefinition();
    // depth 5, appearsAt 3 -> 2 depths beyond -> 1.2^2 = 1.44
    const encounter = createBossEncounter(def, 5);

    assert.equal(encounter.boss.maxHealth, Math.floor(50 * 1.44)); // 72
    assert.equal(encounter.boss.attack, Math.floor(10 * 1.44)); // 14
    assert.equal(encounter.boss.defense, Math.floor(5 * 1.44)); // 7
  });

  it('should not scale stats when depth is below appearsAtDepth', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 1);

    assert.equal(encounter.boss.maxHealth, 50);
    assert.equal(encounter.boss.attack, 10);
    assert.equal(encounter.boss.defense, 5);
  });

  it('should initialize all ability cooldowns to 0', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);

    assert.equal(encounter.abilityCooldowns.size, 2);
    assert.equal(encounter.abilityCooldowns.get('Claw Slam'), 0);
    assert.equal(encounter.abilityCooldowns.get('Tidal Wave'), 0);
  });
});

describe('Boss AI Phase Transitions', () => {
  it('should be in phase 1 at full health', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);
    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    encounter.boss.position = { x: 41, y: 10 };

    processBossTurn(encounter, player, level);

    assert.equal(encounter.phase, 1);
  });

  it('should transition to phase 2 at 50% HP', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);
    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    encounter.boss.position = { x: 41, y: 10 };

    // Reduce boss to exactly 50% HP
    encounter.boss.takeDamage(25);
    processBossTurn(encounter, player, level);

    assert.equal(encounter.phase, 2);
  });

  it('should transition to phase 3 at 25% HP', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);
    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    encounter.boss.position = { x: 41, y: 10 };

    // Reduce boss to 20% HP (below 25%)
    encounter.boss.takeDamage(40);
    processBossTurn(encounter, player, level);

    assert.equal(encounter.phase, 3);
  });
});

describe('Boss Ability Resolution', () => {
  it('should resolve damage ability correctly', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);
    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    encounter.boss.position = { x: 41, y: 10 };

    const damageAbility = def.abilities[0]; // Claw Slam - direct damage
    const initialHealth = player.health;
    const result = resolveBossAbility(encounter, damageAbility, player, level);

    assert.ok(result.damage > 0);
    assert.ok(player.health < initialHealth);
    assert.ok(result.messages.length > 0);
    assert.ok(result.messages[0].includes('Claw Slam'));
    assert.ok(result.events.some(e => e.kind === 'boss-ability'));
  });

  it('should resolve aoe ability - damage when in range', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);
    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    encounter.boss.position = { x: 41, y: 10 }; // distance 1, within radius 3

    const aoeAbility = def.abilities[1]; // Tidal Wave - aoe radius 3
    const initialHealth = player.health;
    const result = resolveBossAbility(encounter, aoeAbility, player, level);

    assert.ok(result.damage > 0);
    assert.ok(player.health < initialHealth);
    assert.ok(result.messages[0].includes('erupts'));
  });

  it('should resolve aoe ability - miss when out of range', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);
    const player = new Player({ x: 30, y: 10 });
    const level = makeTestLevel();
    encounter.boss.position = { x: 45, y: 10 }; // distance 15, outside radius 3

    const aoeAbility = def.abilities[1]; // Tidal Wave
    const initialHealth = player.health;
    const result = resolveBossAbility(encounter, aoeAbility, player, level);

    assert.equal(result.damage, 0);
    assert.equal(player.health, initialHealth);
    assert.ok(result.messages[0].includes('dodge'));
  });

  it('should resolve summon ability', () => {
    const summonAbility: BossAbility = {
      name: 'Call Minions',
      description: 'Summons minions',
      damage: 0,
      cooldown: 5,
      effect: { kind: 'summon', enemyCount: 2 },
    };
    const def = makeTestBossDefinition({ abilities: [summonAbility] });
    const encounter = createBossEncounter(def, 3);
    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    encounter.boss.position = { x: 42, y: 10 };

    const enemiesBefore = level.enemies.length;
    const result = resolveBossAbility(encounter, summonAbility, player, level);

    assert.ok(level.enemies.length > enemiesBefore);
    assert.ok(result.messages[0].includes('minion'));
  });

  it('should resolve heal ability', () => {
    const healAbility: BossAbility = {
      name: 'Regenerate',
      description: 'Boss heals',
      damage: 0,
      cooldown: 4,
      effect: { kind: 'heal', amount: 15 },
    };
    const def = makeTestBossDefinition({ abilities: [healAbility] });
    const encounter = createBossEncounter(def, 3);
    encounter.boss.position = { x: 42, y: 10 };
    encounter.boss.takeDamage(20);
    const healthBefore = encounter.boss.health;

    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    const result = resolveBossAbility(encounter, healAbility, player, level);

    assert.ok(encounter.boss.health > healthBefore);
    assert.ok(result.messages[0].includes('Heals'));
  });

  it('should resolve enrage ability and boost attack', () => {
    const enrageAbility: BossAbility = {
      name: 'Frenzy',
      description: 'Boss enrages',
      damage: 0,
      cooldown: 99,
      effect: { kind: 'enrage', attackMultiplier: 2 },
    };
    const def = makeTestBossDefinition({ abilities: [enrageAbility] });
    const encounter = createBossEncounter(def, 3);
    encounter.boss.position = { x: 42, y: 10 };
    const attackBefore = encounter.boss.attack;

    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    resolveBossAbility(encounter, enrageAbility, player, level);

    assert.equal(encounter.enraged, true);
    assert.equal(encounter.boss.attack, Math.floor(attackBefore * 2));
  });

  it('should not double-enrage', () => {
    const enrageAbility: BossAbility = {
      name: 'Frenzy',
      description: 'Boss enrages',
      damage: 0,
      cooldown: 0,
      effect: { kind: 'enrage', attackMultiplier: 2 },
    };
    const def = makeTestBossDefinition({ abilities: [enrageAbility] });
    const encounter = createBossEncounter(def, 3);
    encounter.boss.position = { x: 42, y: 10 };

    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();

    resolveBossAbility(encounter, enrageAbility, player, level);
    const attackAfterFirst = encounter.boss.attack;

    // Reset cooldown to test again
    encounter.abilityCooldowns.set('Frenzy', 0);
    resolveBossAbility(encounter, enrageAbility, player, level);

    assert.equal(encounter.boss.attack, attackAfterFirst); // Should not double
  });
});

describe('Boss Turn Processing', () => {
  it('should always deal damage (basic attack or ability)', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);
    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    encounter.boss.position = { x: 41, y: 10 };

    // Put all abilities on cooldown to force basic attack
    for (const ability of def.abilities) {
      encounter.abilityCooldowns.set(ability.name, 99);
    }

    const initialHealth = player.health;
    const result = processBossTurn(encounter, player, level);

    assert.ok(result.damage > 0);
    assert.ok(player.health < initialHealth);
    assert.ok(result.messages.length > 0);
  });

  it('should produce messages each turn', () => {
    const def = makeTestBossDefinition();
    const encounter = createBossEncounter(def, 3);
    const player = new Player({ x: 40, y: 10 });
    const level = makeTestLevel();
    encounter.boss.position = { x: 41, y: 10 };

    const result = processBossTurn(encounter, player, level);

    assert.ok(result.messages.length > 0);
    assert.ok(result.messages[0].includes('King Crab'));
  });
});
