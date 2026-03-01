export type ItemCategory = 'healing' | 'armor' | 'weapon' | 'score';

export interface ItemDefinition {
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly color: string;
  readonly category: ItemCategory;
  readonly hp?: number;
  readonly attack?: number;
  readonly defense?: number;
  readonly score?: number;
  readonly description: string;
}

export const ITEMS: readonly ItemDefinition[] = [
  {
    id: 'seaweed',
    name: 'Seaweed',
    symbol: '!',
    color: 'green',
    category: 'healing',
    hp: 20,
    description: 'Restorative greens. Recover 20 HP.',
  },
  {
    id: 'sea-cucumber',
    name: 'Sea Cucumber',
    symbol: '!',
    color: 'green',
    category: 'healing',
    hp: 50,
    description: 'Dense nutrients from the deep. Recover 50 HP.',
  },
  {
    id: 'barnacle-shell',
    name: 'Barnacle Shell',
    symbol: ']',
    color: 'gray',
    category: 'armor',
    defense: 3,
    description: 'Crude plating that grants +3 defense.',
  },
  {
    id: 'nautilus-shell',
    name: 'Nautilus Shell',
    symbol: ']',
    color: 'white',
    category: 'armor',
    defense: 5,
    description: 'Layered shell armor granting +5 defense.',
  },
  {
    id: 'coral-shard',
    name: 'Coral Shard',
    symbol: '/',
    color: 'red',
    category: 'weapon',
    attack: 3,
    description: 'Jagged coral edge for +3 attack.',
  },
  {
    id: 'trident',
    name: 'Trident',
    symbol: 'T',
    color: 'yellow',
    category: 'weapon',
    attack: 8,
    description: 'Ancient weapon of the reef. +8 attack.',
  },
  {
    id: 'pearl',
    name: 'Pearl',
    symbol: '*',
    color: 'yellow',
    category: 'score',
    score: 100,
    description: 'Lustrous keepsake worth 100 points.',
  },
  {
    id: 'golden-pearl',
    name: 'Golden Pearl',
    symbol: '*',
    color: 'yellow',
    category: 'score',
    score: 500,
    description: 'Rare treasure worth 500 points.',
  },
] as const;

export const ITEM_BY_ID: Readonly<Record<string, ItemDefinition>> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
);
