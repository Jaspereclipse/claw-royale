import { Player, Enemy, Item } from './entity.js';

export interface CombatResult {
  damage: number;
  killed: boolean;
  xpGained: number;
  message: string;
}

export interface AbilityResult {
  success: boolean;
  message: string;
}

export interface ShieldStatus {
  active: boolean;
  turnsRemaining: number;
}

const shield: ShieldStatus = { active: false, turnsRemaining: 0 };
let enemySkipTurn = false;

export function getShieldStatus(): ShieldStatus {
  return { ...shield };
}

export function isEnemySkipTurn(): boolean {
  return enemySkipTurn;
}

export function consumeEnemySkipTurn(): boolean {
  if (enemySkipTurn) {
    enemySkipTurn = false;
    return true;
  }
  return false;
}

export function tickShield(): void {
  if (shield.active) {
    shield.turnsRemaining--;
    if (shield.turnsRemaining <= 0) {
      shield.active = false;
      shield.turnsRemaining = 0;
    }
  }
}

export function resetCombatState(): void {
  shield.active = false;
  shield.turnsRemaining = 0;
  enemySkipTurn = false;
}

export function calculateDamage(attackStat: number, defenseStat: number): number {
  const baseDamage = Math.max(1, attackStat - defenseStat);
  const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
  return Math.max(1, baseDamage + variance);
}

export function resolveCombat(player: Player, enemy: Enemy): CombatResult {
  const damage = calculateDamage(player.attack, enemy.defense);
  enemy.takeDamage(damage);

  const killed = !enemy.isAlive;
  const xpGained = killed ? enemy.xpReward : 0;

  if (killed) {
    player.score += xpGained;
  }

  const message = killed
    ? `You strike the ${enemy.name} for ${damage} damage and defeat it! (+${xpGained} XP)`
    : `You strike the ${enemy.name} for ${damage} damage. (${enemy.health}/${enemy.maxHealth} HP)`;

  return { damage, killed, xpGained, message };
}

export function resolveEnemyAttack(enemy: Enemy, player: Player): CombatResult {
  let damage = calculateDamage(enemy.attack, player.defense);

  if (shield.active) {
    damage = Math.max(1, Math.floor(damage / 2));
  }

  player.takeDamage(damage);

  const killed = !player.isAlive;
  const message = killed
    ? `The ${enemy.name} strikes you for ${damage} damage. You have been defeated!`
    : `The ${enemy.name} strikes you for ${damage} damage. (${player.health}/${player.maxHealth} HP)`;

  return { damage, killed, xpGained: 0, message };
}

export function useAbility(player: Player, enemy: Enemy | null, abilityName: string): AbilityResult {
  if (!player.canUseAbility(abilityName)) {
    const ability = player.getAbility(abilityName);
    if (!ability) return { success: false, message: `Unknown ability: ${abilityName}` };
    return { success: false, message: `${abilityName} is on cooldown (${ability.currentCooldown} turns)` };
  }

  switch (abilityName) {
    case 'ClawStrike': {
      if (!enemy) return { success: false, message: 'No enemy to attack!' };
      player.useAbility(abilityName);
      const damage = calculateDamage(player.attack * 2, enemy.defense);
      enemy.takeDamage(damage);
      const killed = !enemy.isAlive;
      if (killed) player.score += enemy.xpReward;
      return {
        success: true,
        message: killed
          ? `Claw Strike! ${damage} damage destroys the ${enemy.name}! (+${enemy.xpReward} XP)`
          : `Claw Strike! ${damage} damage to ${enemy.name}. (${enemy.health}/${enemy.maxHealth} HP)`,
      };
    }
    case 'ShellShield': {
      player.useAbility(abilityName);
      shield.active = true;
      shield.turnsRemaining = 3;
      return { success: true, message: 'Shell Shield activated! Incoming damage halved for 3 turns.' };
    }
    case 'InkCloud': {
      if (!enemy) return { success: false, message: 'No enemy to blind!' };
      player.useAbility(abilityName);
      enemySkipTurn = true;
      return { success: true, message: `Ink Cloud! The ${enemy.name} is blinded and loses a turn.` };
    }
    case 'PincerGrab': {
      if (!enemy) return { success: false, message: 'No enemy to steal from!' };
      player.useAbility(abilityName);
      const lootTable: Item[] = [
        new Item('Seaweed', '*', '\x1b[32m', 'heal', 5),
        new Item('Pearl', 'o', '\x1b[37m', 'score', 10),
        new Item('Shell Fragment', ')', '\x1b[33m', 'armor', 2),
      ];
      const stolen = lootTable[Math.floor(Math.random() * lootTable.length)];
      player.inventory.push(stolen);
      return { success: true, message: `Pincer Grab! Stole a ${stolen.name} from the ${enemy.name}!` };
    }
    default:
      return { success: false, message: `Unknown ability: ${abilityName}` };
  }
}

export function useItem(player: Player, itemIndex: number): { success: boolean; message: string } {
  if (itemIndex < 0 || itemIndex >= player.inventory.length) {
    return { success: false, message: 'Invalid item.' };
  }

  const item = player.inventory[itemIndex];
  player.inventory.splice(itemIndex, 1);

  switch (item.effect) {
    case 'heal': {
      const healed = player.heal(item.value);
      return { success: true, message: `Used ${item.name}. Healed ${healed} HP. (${player.health}/${player.maxHealth})` };
    }
    case 'armor':
      player.defense += item.value;
      return { success: true, message: `Used ${item.name}. Defense +${item.value}! (Now ${player.defense})` };
    case 'weapon':
      player.attack += item.value;
      return { success: true, message: `Used ${item.name}. Attack +${item.value}! (Now ${player.attack})` };
    case 'score':
      player.score += item.value;
      return { success: true, message: `Used ${item.name}. Score +${item.value}!` };
  }
}
