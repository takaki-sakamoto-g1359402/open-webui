# Skyshard Surge

Skyshard Surge is an original browser-based 3D action voxel prototype focused on three pillars:

- destructible procedural voxel terrain
- fast aerial movement with boost dash
- responsive energy-blast combat

The current MVP is built as a modular TypeScript + Vite project. Babylon.js and Rapier now resolve through local package dependencies, and the build output is generated into `dist/` for browser deployment.

## Architecture summary

- `src/game/world/*`
  Procedural terrain generation, chunk storage, chunk streaming, culled voxel meshing, block placement/destruction, and voxel raycasts.
- `src/game/player/*`
  Custom kinematic controller for walk, jump, sprint, flight, dash, camera look, and resource management.
- `src/game/combat/*`
  Projectile pool, impact effects, explosion-based terrain damage, and multi-enemy damage handling.
- `src/game/entities/*`
  Training dummy plus hostile skimmer enemies with chase, contact damage, defeat, and timed rebuild.
- `src/game/ui/*`
  HUD updates for HP, stamina, energy, chunk state, target info, and combat status.
- `src/core/*`
  Runtime bridges, input capture, constants, and deterministic debug hooks.

## Folder structure

```text
index.html
src/
  main.ts
  styles.css
  vite-env.d.ts
  core/
    constants.ts
    debug.ts
    input.ts
    runtime.ts
  game/
    game.ts
    physics.ts
    combat/
      projectile-system.ts
    entities/
      dummy-enemy.ts
      enemy-manager.ts
      skimmer-enemy.ts
    player/
      player-controller.ts
    ui/
      hud.ts
    world/
      block-types.ts
      generator.ts
      mesher.ts
      voxel-world.ts
scripts/
  validate-types.mjs
public/
  _headers
package.json
tsconfig.json
vite.config.ts
README.md
progress.md
```

## Current MVP features

- Procedural voxel terrain with height-based biome layering
- Chunk loading, unloading, and remeshing around the player
- Block destruction and placement using voxel ray targeting
- Walk, jump, sprint, toggle flight, and boost dash
- Energy projectile attack with pooled projectiles
- Explosion-based terrain destruction in a small radius
- Dummy enemy with HP, impact damage, and rebuild timer
- Multiple hostile skimmer enemies that pursue the player and can damage on contact
- HUD for HP, stamina, energy, target block, chunks, and combat state
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

Start the Vite dev server:

```bash
cd /Users/sakamototakaki/Documents/New\ project
npm run dev
```

Then open the local URL printed by Vite, usually [http://127.0.0.1:5173](http://127.0.0.1:5173).

Production commands:

```bash
npm run typecheck
npm run build
npm run preview
```

Notes:

- `npm run typecheck` runs a lightweight TypeScript validation pass using `scripts/validate-types.mjs`.
- `npm run typecheck:full` keeps the deeper `tsc --noEmit` path available for future hardening work.

## Validation notes

Validated in this environment:

- Ran `node ./scripts/validate-types.mjs` successfully:
  `Validated 17 TypeScript files with transpile + import checks.`
- Ran a production Vite build successfully with the local bundled Node toolchain
- Confirmed the generated output now contains the correct game shell in `dist/index.html`
- Confirmed stale legacy files no longer pollute `dist/`; `public/` now only carries `_headers`

Not validated here:

- `npm run typecheck:full`, which remains significantly heavier than the lightweight validation path in this environment
- Playwright/browser automation loop
- Full visual smoke test in a real browser window from this tool environment

## Implementation steps completed

1. Defined a modular world/player/combat/ui architecture.
2. Replaced the old active browser entrypoint with the new `Skyshard Surge` shell and HUD.
3. Added chunked voxel terrain generation, meshing, block edits, and voxel raycast targeting.
4. Added player locomotion, flight toggle, dash cooldown, and resource systems.
5. Added projectile combat, blast destruction, impact effects, a training dummy, and hostile skimmer enemies.
6. Added deterministic debug hooks and updated documentation.
7. Migrated the active runtime to Vite + TypeScript, removed stale legacy `public/` outputs, and stabilized build validation around a lightweight TS verification script plus production bundling.

## Next recommended improvements

- Replace the temporary `@ts-nocheck` migration shields with real shared engine/gameplay types one subsystem at a time.
- Reduce the Babylon production bundle further with manual chunks or more aggressive lazy-loading for optional loaders/debug paths.
- Add a greedy mesher or face-merging pass to reduce chunk vertex count.
- Replace the simple AABB motor with a swept collision pass or Rapier-based character controller once terrain editing behavior is locked.
- Add enemy behaviors beyond the current skimmers: ranged fire, squad behavior, and stagger states.
- Add a saveable hotbar/block inventory and multiple placeable block types.
- Add audio, hit-stop, camera shake, and better impact feedback for stronger combat feel.
