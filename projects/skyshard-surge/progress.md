Update 2026-04-03:
- New prompt: build an original browser-based 3D action voxel prototype with chunked terrain, fast movement, dash, and energy combat.
- Added new modular runtime under `src/`:
  - `core/constants.js`
  - `core/input.js`
  - `core/debug.js`
  - `core/runtime.js`
  - `game/game.js`
  - `game/physics.js`
  - `game/world/*`
  - `game/player/player-controller.js`
  - `game/combat/projectile-system.js`
  - `game/entities/dummy-enemy.js`
  - `game/ui/hud.js`
- Implemented procedural voxel terrain, chunk loading/unloading, culled chunk meshing, voxel raycast targeting, and add/remove blocks.
- Implemented player locomotion:
  - walk
  - jump
  - sprint
  - toggle flight
  - dash with cooldown
- Implemented energy projectile combat with pooled projectiles and impact-based terrain destruction.
- Implemented a dummy enemy with HP, damage intake, defeat, and timed rebuild.
- Added HUD/status readouts plus `window.render_game_to_text()` and `window.advanceTime(ms)` hooks.
- Rewrote `README.md` around the new game architecture and controls.

Environment/tooling note:
- A Vite/TypeScript scaffold is prepared in `package.json`, `tsconfig.json`, and `vite.config.ts`.
- The original implementation used browser-native ES modules with Babylon.js and Rapier loaded from CDN at runtime.

Validation:
- Served the project locally with `python3 -m http.server 8000`.
- Fetched `/`, `/src/main.js`, and `/src/game/game.js` successfully through the local server.
- Manually reviewed the active gameplay modules after implementation and fixed a real bug in dummy hover motion.

Remaining TODOs / suggestions:
- Run a real browser smoke test once browser automation or a working JS package toolchain is available.
- Add greedy meshing, enemy AI, save/load, and stronger combat polish once the core loop is playtested live.
