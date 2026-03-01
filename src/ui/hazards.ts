import type { ActiveHazard, GameEvent, HazardType } from '../engine/types.js';
import type { AnsiColor } from './renderer.js';

export function hazardTileColor(type: HazardType): AnsiColor {
  if (type === 'vent') return 'red';
  if (type === 'whirlpool') return 'cyan';
  if (type === 'current') return 'blue';
  return 'green';
}

export function renderHazardWarning(hazard: ActiveHazard): string {
  const turnsText = hazard.turnsRemaining === null ? 'permanent' : `${hazard.turnsRemaining} turns left`;

  if (hazard.definition.type === 'vent') {
    return `⚠ Vent nearby: ${hazard.definition.damagePerTurn} dmg/turn (${turnsText})`;
  }

  if (hazard.definition.type === 'whirlpool') {
    return `⚠ Whirlpool nearby: pulls to random adjacent tile (${turnsText})`;
  }

  if (hazard.definition.type === 'current') {
    return `⚠ Current nearby: pushes 2 tiles (${turnsText})`;
  }

  return `⚠ Toxic cloud nearby: ${hazard.definition.damagePerTurn} dmg/turn (${turnsText})`;
}

export function renderHazardEffect(event: GameEvent): string[] {
  if (event.kind === 'hazard-damage') {
    return [`${event.hazard.name} hits you for ${event.damage} damage.`];
  }

  if (event.kind === 'hazard-move') {
    return [
      `${event.hazard.name} moves you (${event.from.x},${event.from.y}) -> (${event.to.x},${event.to.y}).`,
    ];
  }

  if (event.kind === 'hazard-expired') {
    return [`${event.hazard.name} dissipates.`];
  }

  return [];
}
