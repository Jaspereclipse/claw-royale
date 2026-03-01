Build the environmental hazards system for Claw Royale. Read CLAUDE.md for project rules.

## Interface Contract
Import ALL hazard types from `src/engine/types.ts`:
- HazardType, HazardDefinition, ActiveHazard, ExtendedTileType, GameEvent
DO NOT redefine these types. They are the shared contract.

## Your Scope: src/data/ and src/ui/ ONLY
DO NOT create or modify any files in src/engine/. Another agent handles engine logic.
DO NOT modify src/index.ts. An integration agent will handle that.

## Files to Create/Modify

### 1. src/data/hazards.ts — Hazard definitions
Define all hazard types with their properties:
- **Underwater Vent:** symbol='▲', color=red, 8 damage/turn, permanent, doesn't move player
- **Whirlpool:** symbol='@', color=cyan, 0 damage, moves player to random adjacent tile, permanent
- **Current:** symbol='→' (or ←↑↓ based on direction), color=blue, 0 damage, pushes player 2 tiles in direction, permanent
- **Toxic Cloud:** symbol='☁', color=green, 5 damage/turn, moves 1 tile randomly each turn, duration=10 turns

Export: HAZARD_DEFINITIONS as Record<HazardType, HazardDefinition>

### 2. src/ui/hazards.ts — Hazard rendering
- `renderHazardWarning(hazard: ActiveHazard): string` — one-line HUD warning when player is adjacent
- `renderHazardEffect(event: GameEvent): string[]` — combat-log style messages for hazard events
- `hazardTileColor(type: HazardType): string` — ANSI color for map rendering

### 3. Modify src/ui/renderer.ts
- Add hazard tile types to the color mapping (vent=red, whirlpool=cyan, current=blue, toxic-cloud=green)
- Update `tileColor()` to handle ExtendedTileType
- Keep all existing rendering unchanged

### 4. Modify src/data/ascii-art.ts
- Add ASCII art for boss encounter screen (a large menacing sea creature)
- Add simple hazard warning symbols for HUD display

## Rules (from learnings.md)
- Avoid module-level mutable state
- No type assertions — use proper types
- Commit logically grouped changes with descriptive messages
- Run `npm run lint` before committing
- When done: push and create PR
- IMPORTANT: You are Codex. Make multiple focused commits, not one giant commit.
