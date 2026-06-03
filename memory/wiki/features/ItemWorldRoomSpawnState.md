# ItemWorldRoomSpawnState

`game/src/scenes/itemworld/ItemWorldRoomSpawnState.ts` owns procedural Item World room spawn tracking state.

Current responsibilities:

- Store the persistent `spawnedRooms` set used by room-state persistence.
- Store live `roomEnemyCount` used by enemy spawn registration and combat-room clear detection.
- Track the last room that triggered neighboring-room pre-spawn so the cascade runs once per entered room.

Boundaries:

- `ItemWorldRoomSpawnRuntime` still owns room-level spawn policy.
- `ItemWorldEnemySpawnRuntime` still increments `roomEnemyCount` when enemies are attached.
- `ItemWorldEnemyCombatRuntime` still decrements `roomEnemyCount` and marks cleared cells.
- `ItemWorldRoomStateRuntime` still serializes/deserializes the `spawnedRooms` set through this state.
- Do not reintroduce scene-owned `spawnedRooms`, `roomEnemyCount`, or `lastPreSpawnRoomKey` fields.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
