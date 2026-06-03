# ItemWorldEnemySpawnRuntime

`game/src/scenes/itemworld/ItemWorldEnemySpawnRuntime.ts` owns shared enemy spawn context, placement, and room registration for procedural Item World rooms.

Current responsibilities:

- Compute per-room spawn context from full-grid room coordinates, including room top tile coordinates and valid spawn points.
- Preserve the non-boss guard that skips spawning when no valid spawn points exist.
- Pick deterministic spawn positions from an existing `PRNG`.
- Delegate boss flat-floor lookup through `ItemWorldSpawnController.findFlatFloorCenter()`.
- Register spawned enemies by setting room metadata, assigning `roomData`/target, adding them to the scene-owned enemy list/layer, and incrementing `roomEnemyCount`.

Scene-owned boundaries:

- `ItemWorldScene.spawnEnemiesInRoom()` still owns room policy: hub/shrine clearing, safe rooms, Memory Room skips, reward timing, treasure/boss/normal branching, MemoryShardNPC capture callbacks, and stat scaling.
- `ItemWorldSpawnController` remains the pure geometry/factory owner for spawn point calculation and enemy construction.
- Do not duplicate `setEnemyRoomKey()` or room-enemy-count increments back in `ItemWorldScene`; new enemy spawn paths should register through this runtime.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
