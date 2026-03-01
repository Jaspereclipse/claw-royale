/**
 * Shared type definitions for Claw Royale extensions.
 * 
 * IMPORTANT: This file is the interface contract between parallel agents.
 * Agents should import from here — DO NOT redefine these types.
 */

import type { Enemy, Position, Item } from './entity.js';
import type { TileType } from './level.js';

// ============ Boss System ============

export type BossId = 'king-crab' | 'kraken' | 'mecha-lobster' | 'leviathan';

export interface BossAbility {
  readonly name: string;
  readonly description: string;
  readonly damage: number;          // 0 for non-damage abilities
  readonly cooldown: number;        // turns between uses
  readonly effect: BossEffect;
}

export type BossEffect =
  | { kind: 'damage' }                          // direct damage
  | { kind: 'aoe'; radius: number }             // area damage around boss
  | { kind: 'summon'; enemyCount: number }       // spawn minions
  | { kind: 'heal'; amount: number }             // boss heals itself
  | { kind: 'enrage'; attackMultiplier: number } // boss gets stronger

export interface BossDefinition {
  readonly id: BossId;
  readonly name: string;
  readonly title: string;           // e.g. "King Crab, Lord of the Shallows"
  readonly symbol: string;
  readonly color: string;           // ANSI color code
  readonly baseHealth: number;
  readonly baseAttack: number;
  readonly baseDefense: number;
  readonly xpReward: number;
  readonly abilities: readonly BossAbility[];
  readonly appearsAtDepth: number;  // minimum depth to encounter
  readonly flavorText: string;
  readonly asciiArt: string;        // multi-line ASCII art for encounter screen
}

export interface BossEncounter {
  readonly boss: Enemy;
  readonly definition: BossDefinition;
  phase: number;                    // bosses get harder in later phases
  abilityCooldowns: Map<string, number>;
  enraged: boolean;
}

// ============ Environmental Hazards ============

export type HazardType = 'vent' | 'whirlpool' | 'current' | 'toxic-cloud';

export interface HazardDefinition {
  readonly type: HazardType;
  readonly name: string;
  readonly symbol: string;
  readonly color: string;
  readonly description: string;
  readonly damagePerTurn: number;    // 0 for non-damaging hazards
  readonly movesPlayer: boolean;     // whirlpool/current push the player
  readonly blocksMovement: boolean;
  readonly duration: number | null;  // null = permanent, number = turns remaining
}

export interface ActiveHazard {
  readonly definition: HazardDefinition;
  position: Position;
  turnsRemaining: number | null;    // null = permanent
}

// ============ Extended Tile Types ============

/** New tile types for hazards — extend the base TileType */
export type ExtendedTileType = TileType | 'vent' | 'whirlpool' | 'current' | 'toxic-cloud';

// ============ Events (for UI to react to) ============

export type GameEvent =
  | { kind: 'boss-encounter'; boss: BossDefinition }
  | { kind: 'boss-ability'; boss: BossDefinition; ability: BossAbility; damage: number }
  | { kind: 'boss-defeated'; boss: BossDefinition; xp: number }
  | { kind: 'boss-enraged'; boss: BossDefinition }
  | { kind: 'hazard-damage'; hazard: HazardDefinition; damage: number }
  | { kind: 'hazard-move'; hazard: HazardDefinition; from: Position; to: Position }
  | { kind: 'hazard-expired'; hazard: HazardDefinition };
