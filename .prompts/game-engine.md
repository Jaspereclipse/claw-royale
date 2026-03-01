Build the core game engine for Claw Royale, a terminal roguelike. Read CLAUDE.md for project rules.

Implement these files in src/engine/:

1. entity.ts - Entity system:
   - Base Entity class with: id, name, position {x,y}, health, maxHealth, attack, defense, symbol (char), color (ANSI code)
   - Player class extending Entity: add abilities array, inventory array, score, level
   - Enemy class extending Entity: add xpReward, behavior (aggressive/passive/fleeing)
   - Item class: name, symbol, color, effect (heal/armor/weapon/score), value

2. combat.ts - Turn-based combat:
   - calculateDamage(attacker, defender): number with randomness
   - resolveCombat(player, enemy): CombatResult with damage, killed, xpGained, message
   - Abilities: ClawStrike (2x damage), ShellShield (halve incoming 3 turns), InkCloud (skip enemy turn), PincerGrab (steal item)
   - Each ability has cooldown in turns

3. level.ts - Procedural level generation:
   - Level class with 2D grid (80x24 tiles)
   - Tile types: water (passable), rock (wall), sand (passable), coral (destructible), kelp (hides player)
   - generateLevel(difficulty): rooms-and-corridors algorithm, scatter enemies and items
   - Stairs tile to descend

4. game.ts - Main game loop (update the existing stub):
   - Manages current level, player, turn counter
   - processTurn(direction): movement, combat, item pickup
   - Enemy AI: aggressive moves toward player, passive random, fleeing away when low HP
   - Visibility: manhattan distance radius 8
   - Game states: playing, combat, inventory, gameover

5. game.test.ts - Tests using node:test:
   - Test entity creation, combat damage, level generation, player movement

Run npm run lint before committing. Commit each file separately. When done push and create PR.
