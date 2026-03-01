# CLAUDE.md — Agent Instructions

You are working on **Claw Royale**, a terminal roguelike game built with Node.js and TypeScript.

## Project Rules

1. Use Node.js built-in APIs only — no external runtime dependencies (devDependencies for tooling are fine)
2. TypeScript strict mode — no `any` types
3. All game rendering uses raw ANSI escape codes / process.stdout — no blessed, ink, or other TUI frameworks
4. Tests use Node.js built-in `node:test` and `node:assert`
5. Keep commits atomic and descriptive
6. Run `npm run lint` before committing to verify types

## Architecture

- `src/engine/` — Pure game logic (no I/O). Entity system, combat, level generation
- `src/ui/` — Terminal rendering and input. Only this layer touches stdout/stdin
- `src/data/` — Static game data (creatures, items, ASCII art)
- `src/index.ts` — Entry point, wires engine + UI

## Game Design

- Turn-based roguelike on a grid (ocean floor)
- Player is a lobster 🦞 with abilities
- Enemies are sea creatures (crabs, eels, pufferfish, sharks)
- Procedurally generated levels with increasing difficulty
- Items: seaweed (heal), pearl (score), shell (armor), trident (weapon)
- Simple but satisfying combat: attack, defend, use ability, use item
