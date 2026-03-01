Fix all code review issues flagged by Gemini Code Assist across PRs #1, #2, #3. Read CLAUDE.md for project rules.

HIGH PRIORITY fixes:

1. src/engine/combat.ts:21 — Global state (shield, enemySkipTurn) causes issues with multiple game instances. Move these into a CombatState class or pass them through the Game instance.

2. src/engine/entity.ts:9 — nextEntityId is module-level global state. Use a factory or pass an ID generator to avoid cross-instance contamination.

3. src/index.ts:87 — Unsafe type assertion for item positions (item as { _position?: ... }). Add a proper getItemPosition() method to the Level class or Item class instead.

4. src/index.ts:184 — Game logic in the UI/orchestration layer. Move combat resolution and ability usage into the Game class, keep index.ts as a thin orchestrator.

MEDIUM PRIORITY fixes:

5. src/engine/combat.ts:137 — PincerGrab loot table recreated on every call. Hoist to module level or make it a constant.

6. src/engine/entity.ts:79 — Player abilities hardcoded in constructor. Make them configurable via a parameter or data file.

7. src/engine/game.ts:295 — useInventoryItem doesn't advance game turn. It should increment turnCount and process enemy turns.

8. src/engine/level.ts:102 — Item position tracking via casting to PlacedItem. Add explicit position tracking to the Level class.

Run `npm run lint` and `npm run test:dev` after fixing. Commit and push, then create a PR.
