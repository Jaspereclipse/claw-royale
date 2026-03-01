export type EnemyBehavior = 'timid' | 'aggressive' | 'ambush' | 'pack' | 'hunter' | 'apex';

export interface CreatureDefinition {
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly color: string;
  readonly baseHealth: number;
  readonly baseAttack: number;
  readonly baseDefense: number;
  readonly xpReward: number;
  readonly behavior: EnemyBehavior;
  readonly flavorText: string;
}

export const CREATURES: readonly CreatureDefinition[] = [
  {
    id: 'hermit-crab',
    name: 'Hermit Crab',
    symbol: 'h',
    color: 'red',
    baseHealth: 18,
    baseAttack: 4,
    baseDefense: 2,
    xpReward: 15,
    behavior: 'timid',
    flavorText: 'A jittery scavenger that retreats into shell at the first hit.',
  },
  {
    id: 'sea-urchin',
    name: 'Sea Urchin',
    symbol: 'u',
    color: 'magenta',
    baseHealth: 24,
    baseAttack: 6,
    baseDefense: 5,
    xpReward: 28,
    behavior: 'ambush',
    flavorText: 'A spiny minefield on the seabed. Every poke hurts.',
  },
  {
    id: 'electric-eel',
    name: 'Electric Eel',
    symbol: 'e',
    color: 'yellow',
    baseHealth: 30,
    baseAttack: 9,
    baseDefense: 3,
    xpReward: 45,
    behavior: 'aggressive',
    flavorText: 'Its arcs crackle through the water before it lunges.',
  },
  {
    id: 'pufferfish',
    name: 'Pufferfish',
    symbol: 'p',
    color: 'cyan',
    baseHealth: 42,
    baseAttack: 10,
    baseDefense: 7,
    xpReward: 68,
    behavior: 'pack',
    flavorText: 'Inflates into a drifting wall of spikes and spite.',
  },
  {
    id: 'moray-eel',
    name: 'Moray Eel',
    symbol: 'm',
    color: 'red',
    baseHealth: 56,
    baseAttack: 14,
    baseDefense: 8,
    xpReward: 95,
    behavior: 'hunter',
    flavorText: 'A ribbon of muscle that strikes from cracks in coral.',
  },
  {
    id: 'great-white-shark',
    name: 'Great White Shark',
    symbol: 'S',
    color: 'magenta',
    baseHealth: 90,
    baseAttack: 22,
    baseDefense: 12,
    xpReward: 180,
    behavior: 'apex',
    flavorText: 'The apex of the trench. One pass can end a run.',
  },
] as const;

export const CREATURE_BY_ID: Readonly<Record<string, CreatureDefinition>> = Object.fromEntries(
  CREATURES.map((creature) => [creature.id, creature]),
);
