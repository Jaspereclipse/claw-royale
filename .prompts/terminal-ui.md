Build the terminal UI layer for Claw Royale, a terminal roguelike. Read CLAUDE.md for project rules.

The engine layer (src/engine/) is being built by another developer on a parallel branch. DO NOT modify any files in src/engine/. Instead, create interfaces/types that match what you expect from the engine, and import from the engine modules.

Implement these files in src/ui/ and src/data/:

1. src/data/ascii-art.ts - ASCII art assets:
   - Title screen art (large CLAW ROYALE text)
   - Lobster player art for game over screen
   - Enemy art thumbnails for combat screen
   - Border/frame characters

2. src/data/creatures.ts - Enemy definitions:
   - At least 6 enemy types with increasing difficulty: Hermit Crab, Sea Urchin, Electric Eel, Pufferfish, Moray Eel, Great White Shark
   - Each has: name, symbol, color, baseHealth, baseAttack, baseDefense, xpReward, behavior, flavorText

3. src/data/items.ts - Item definitions:
   - Healing: Seaweed (+20hp), Sea Cucumber (+50hp)
   - Armor: Barnacle Shell (+3 def), Nautilus Shell (+5 def)
   - Weapon: Coral Shard (+3 atk), Trident (+8 atk)
   - Score: Pearl (100pts), Golden Pearl (500pts)

4. src/ui/renderer.ts - ASCII renderer:
   - Uses raw process.stdout.write with ANSI escape codes
   - clearScreen, moveCursor, setColor helper functions
   - renderMap(level, player, visibleTiles): draw the grid with appropriate colors
   - Color scheme: water=blue, rock=gray, sand=yellow, coral=red, kelp=green, enemies=red/magenta, player=cyan, items=yellow

5. src/ui/input.ts - Keyboard input handler:
   - Raw mode stdin listener
   - Arrow keys / WASD for movement
   - Number keys 1-4 for abilities
   - i for inventory, q to quit
   - Returns Promise-based getInput()

6. src/ui/hud.ts - Heads-up display:
   - Render HP bar, score, current depth, turn count
   - Render ability cooldowns
   - Render message log (last 3 combat messages)

7. src/ui/screens.ts - Menu screens:
   - Title screen with ASCII art and "Press ENTER to start"
   - Game over screen with score and play again prompt
   - Simple leaderboard (top 5, stored in ~/.claw-royale-scores.json)

Also update src/index.ts to wire the UI screens with a proper game startup flow (title screen -> game -> game over -> leaderboard).

Run npm run lint before committing. Commit logically. When done push and create PR.
