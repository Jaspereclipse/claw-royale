# 🦞 Claw Royale

A terminal roguelike where you're a lobster fighting through the ocean floor.

## Features

- ASCII art ocean floor arena
- Turn-based combat with sea creatures
- Lobster abilities: Claw Strike, Shell Shield, Ink Cloud, Pincer Grab
- Procedurally generated ocean levels
- Leaderboard and scoring

## Getting Started

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev    # Run with tsx (hot reload)
npm run lint   # Type check
npm test       # Run tests
```

## Architecture

```
src/
├── index.ts           # Entry point
├── engine/            # Game engine (ECS, turn system, combat)
│   ├── game.ts        # Main game loop
│   ├── entity.ts      # Entity system
│   ├── combat.ts      # Combat mechanics
│   └── level.ts       # Level generation
├── ui/                # Terminal UI
│   ├── renderer.ts    # ASCII renderer
│   ├── input.ts       # Keyboard input handler
│   ├── hud.ts         # HUD (health, score, inventory)
│   └── screens.ts     # Title, game over, leaderboard screens
└── data/              # Game data
    ├── creatures.ts   # Enemy definitions
    ├── items.ts       # Item definitions
    └── ascii-art.ts   # ASCII art assets
```

## License

MIT
