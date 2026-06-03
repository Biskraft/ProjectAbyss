# ItemWorldRoomSpawnRuntime

`game/src/scenes/itemworld/ItemWorldRoomSpawnRuntime.ts` owns room-level procedural Item World spawn policy.

## Boundary

- Decides whether a room should spawn enemies or clear without combat: hub/shrine safe rooms, stratum starts, Memory Rooms, corridors, Rest rooms, and Puzzle rooms.
- Preserves the first start-room sequencing gate: the start hub does not spawn residents until `ItemWorldEntryGateState.startSpawnDone` is true.
- Spawns designer room rewards before non-corridor combat/rest/puzzle room handling, matching the old `ItemWorldScene.spawnEnemiesInRoom()` order.
- Creates the enemy spawn context and forwards combat/treasure/boss encounters to `ItemWorldEnemyEncounterRuntime`.
- `ItemWorldScene` still owns when a room spawn is requested and all concrete runtime dependencies through callbacks. `ItemWorldEntryGateState` owns the start-spawn completion flag.
- `ItemWorldRoomSpawnState` owns the `spawnedRooms` set, `roomEnemyCount` map, and neighbor pre-spawn repeat guard.
- `ItemWorldEnemyEncounterRuntime` still owns the actual enemy selection and instantiation policy.

## Verification

- 2026-06-02: Extracted room-level spawn gating/policy from `ItemWorldScene.spawnEnemiesInRoom()`, leaving the scene with a wrapper call.
- 2026-06-02: Moved room spawn tracking state into `ItemWorldRoomSpawnState`.
- 2026-06-02: Moved the start-spawn completion flag into `ItemWorldEntryGateState`.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke.
