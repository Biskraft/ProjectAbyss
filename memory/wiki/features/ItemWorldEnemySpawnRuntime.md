# ItemWorldEnemySpawnRuntime

`game/src/scenes/itemworld/ItemWorldEnemySpawnRuntime.ts` owns shared enemy spawn context, placement, and room registration for procedural Item World rooms.

Current responsibilities:

- Compute per-room spawn context from full-grid room coordinates, including room top tile coordinates and valid spawn points.
- Preserve the non-boss guard that skips spawning when no valid spawn points exist.
- Pick deterministic spawn positions from an existing `PRNG`.
- Delegate boss flat-floor lookup through `ItemWorldSpawnController.findFlatFloorCenter()`.
- Register spawned enemies by setting room metadata, assigning `roomData`/target through shared spawn helpers, and registering via injected `addEnemy` callback that owns list/container attachment while this runtime increments `roomEnemyCount`.
- Reuse the runtime-level `EnemySpawnInitializationDeps` adapter when calling `initializeEnemySpawnedEntity()` so position/grid/target initialization stays aligned with world spawns.
- Enemy placement/grid/target setup goes through `Enemy.bindSpawnContext(...)` via the shared spawn helper; do not reintroduce direct helper-side `enemy.roomData = ...` writes.
- `ItemStratum_Prologue_*` templates may use authored LDtk `Enemy_Spawn` or `MonsterSpawn` entities. These spawn before procedural encounter logic and are scoped to prologue templates only; normal Item World rooms still use the spawn table.

Scene-owned boundaries:

- `ItemWorldScene.spawnEnemiesInRoom()` still owns room policy: hub/shrine clearing, safe rooms, Memory Room skips, reward timing, treasure/boss/normal branching, MemoryShardNPC capture callbacks, and stat scaling.
- `ItemWorldSpawnController` remains the pure geometry/factory owner for spawn point calculation and enemy construction.
- Do not duplicate `setEnemyRoomKey()` or room-enemy-count increments back in `ItemWorldScene`; new enemy spawn paths should register through this runtime.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.

## 2026-06-20 - Spawn visibility safety

- Normal and treasure enemy materialization uses `ItemWorldEnemySpawnRuntime.pickSafeSpawn()` instead of raw random `pickSpawn()`.
- A spawn candidate is rejected when its enemy AABB intersects the current camera viewport expanded by 160px or is within 320px of the player center.
- If no safe candidate exists, that enemy is not materialized in the current spawn pass. Do not fall back to visible candidates, or monsters can pop in directly in front of the player.
- Boss fallback spawn still uses the older boss placement path; boss presentation should be handled separately if needed.
