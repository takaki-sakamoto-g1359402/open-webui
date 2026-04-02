# Skyshard Surge

Skyshard Surge is an original browser-based 3D voxel action prototype focused on three pillars:

- destructible procedural voxel terrain
- fast aerial movement with boost dash
- responsive energy-blast combat

The current MVP is built as modular browser-native ES modules and runs directly in a static server. The project also includes a Vite/TypeScript scaffold in `package.json`, `tsconfig.json`, and `vite.config.ts`.

## Architecture summary

The project is organized around:

- `core`
- `world`
- `player`
- `combat`
- `entities`
- `ui`

Main gameplay orchestration lives in `src/game/game.js`.

## Project structure

- `src/game/world/*`
  - procedural terrain generation
  - chunk storage and streaming
  - culled voxel meshing
  - block placement and destruction
  - voxel raycasts
- `src/game/player/*`
  - walk, jump, sprint, flight, dash
  - camera look
  - stamina and energy handling
- `src/game/combat/*`
  - projectile pool
  - impact effects
  - explosion-based terrain damage
- `src/game/entities/*`
  - dummy target with HP, defeat, and rebuild loop
- `src/game/ui/*`
  - HUD updates for HP, stamina, energy, combat, and world status
- `src/core/*`
  - runtime bridge, input capture, constants, and debug hooks

## Current MVP features

- procedural voxel terrain with layered block types
- chunk loading, unloading, and remeshing around the player
- block destruction and placement using voxel targeting
- walk, jump, sprint, flight toggle, and boost dash
- pooled energy projectile attack
- explosion-based terrain destruction in a small radius
- dummy enemy with HP, damage intake, defeat, and timed rebuild
- HUD for HP, stamina, energy, target block, chunks, and combat status
- `window.render_game_to_text()` and `window.advanceTime(ms)` hooks for automation/debug

## Controls

- `WASD`: move
- `Mouse`: look
- `Space`: jump or rise while flying
- `Ctrl` or `C`: descend while flying
- `Shift`: sprint
- `F`: toggle flight
- `Q`: dash
- `G` or left mouse: fire energy bolt
- `R` or right mouse: remove targeted block
- `E`: place `Lightstone` on the targeted adjacent face

## Run locally

```bash
cd projects/skyshard-surge
npm install
npm run dev
```

For a static quick check, any simple file server also works.

## Validation notes

Validated in the original implementation environment:

- served locally with `python3 -m http.server 8000`
- confirmed `/`, `/src/main.js`, and `/src/game/game.js` load successfully
- manually reviewed gameplay module integration
- fixed a real dummy hover-motion bug during implementation

## Next recommended improvements

- restore and verify a fully local Vite + TypeScript build
- add greedy meshing to reduce chunk geometry cost
- add enemy AI states and player damage sources
- add a hotbar/inventory layer and multiple placeable block types
- add combat polish such as audio, hit-stop, stronger impact flashes, and camera shake
