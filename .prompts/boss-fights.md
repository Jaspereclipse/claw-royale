Build the boss fight system for Claw Royale. Read CLAUDE.md for project rules.

## Interface Contract
Import ALL boss types from `src/engine/types.ts` — DO NOT redefine BossDefinition, BossAbility, BossEncounter, BossEffect, or any types from that file. They are the shared contract.

## Your Scope: src/engine/ ONLY
DO NOT modify files in src/ui/ or src/data/. Another agent handles those.

## Files to Create/Modify

### 1. src/engine/boss.ts — Boss combat system
- `createBossEncounter(definition: BossDefinition, depth: number): BossEncounter`
  - Scale boss stats by depth (1.2x per depth beyond appearsAtDepth)
  - Initialize ability cooldowns
- `processBossTurn(encounter: BossEncounter, player: Player, level: Level): BossAction`
  - Boss AI: use abilities when off cooldown, prioritize based on phase
  - Phase 1 (>50% HP): normal attacks + occasional ability
  - Phase 2 (<50% HP): more aggressive, shorter cooldowns
  - Phase 3 (<25% HP): enrage if has enrage ability, spam abilities
  - Return: { messages: string[], damage: number, events: GameEvent[] }
- `resolveBossAbility(encounter: BossEncounter, ability: BossAbility, player: Player, level: Level): AbilityResult`
  - Handle each BossEffect kind
  - For 'summon': create Enemy instances at random positions near boss
  - For 'aoe': damage player if within radius
  - For 'enrage': multiply boss attack stat

### 2. src/engine/boss.test.ts — Tests using node:test
- Test boss encounter creation and stat scaling
- Test boss AI phase transitions
- Test each ability type resolves correctly
- Test enrage mechanics
- At least 8 tests

### 3. Modify src/engine/level.ts
- Add `isBossLevel(depth: number): boolean` — returns true every 3 depths (3, 6, 9...)
- Add `generateBossRoom(difficulty: number): Level` — large open room (no corridors), boss in center, few minions
- Keep existing level generation unchanged for non-boss levels

### 4. Modify src/engine/game.ts
- Add `bossEncounter: BossEncounter | null` field to Game class
- In processTurn: if player moves onto boss, start boss encounter
- During boss encounter: use processBossTurn for enemy turns instead of normal AI
- On boss death: emit boss-defeated event, grant XP, drop special loot
- On descending stairs from a boss level: increment to next boss level threshold

## Rules (from learnings.md)
- Avoid module-level mutable state — use instance methods/classes
- Add max iteration guards to any loops
- No type assertions (no `as` casts) — use proper accessor methods
- Commit each file separately with descriptive messages
- Run `npm run lint` before committing
- When done: push and create PR
