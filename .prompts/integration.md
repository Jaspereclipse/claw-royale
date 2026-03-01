You are doing integration work on Claw Royale, a terminal roguelike. Read CLAUDE.md for project rules.

Two parallel agents just built the game engine (src/engine/) and terminal UI (src/ui/ + src/data/). Both compile and the game launches with a title screen, but there are integration gaps to fix.

Your tasks:

1. REVIEW the current index.ts - it was written by the UI agent and creates its own runtime game loop. Check if it properly uses the Game class from src/engine/game.ts. The engine has a full Game class with processTurn(), enemy AI, visibility, etc. Make sure index.ts delegates to the engine rather than reimplementing game logic.

2. FIX any integration issues:
   - Ensure the engine's Entity/Player/Enemy types are used by the UI renderer (not parallel type definitions)
   - Ensure combat uses the engine's combat.ts system (with abilities and cooldowns)
   - Ensure level generation uses engine's level.ts
   - Remove any duplicate game logic from index.ts - it should be a thin orchestration layer

3. WIRE UP missing features:
   - Player abilities (1-4 keys) should trigger actual abilities from combat.ts
   - Inventory screen (i key) should show collected items
   - Enemy combat should show the combat messages from the engine
   - HUD should display actual ability cooldowns from the engine

4. RUN TESTS: Run `npm run lint` and `npm run test:dev` and fix any failures.

5. POLISH:
   - Make sure the game is actually playable end-to-end: title -> explore -> fight -> collect items -> descend stairs -> game over -> leaderboard
   - Add a brief "how to play" on the title screen

Keep changes minimal and focused. Do not rewrite modules that already work. Commit and push when done, then create a PR.
