# ItemWorldNeighborPreSpawnRuntime

`game/src/scenes/itemworld/ItemWorldNeighborPreSpawnRuntime.ts` owns procedural Item World neighboring-room pre-spawn loops.

## Boundary

- Checks the four cardinal neighbor cells when the active room changes.
- Skips out-of-bounds, already-spawned, and null cells while preserving the existing debug counters.
- Requests lazy runtime-cell attachment before spawning enemies for a neighbor room.
- Marks the neighbor room key in the scene-owned `spawnedRooms` set and persists room state after the pass.
- `ItemWorldScene` still owns deciding when the active room changed, actual enemy spawn behavior, enemy arrays, and room-state persistence implementation.

## Verification

- 2026-06-02: Extracted the `preSpawnNeighborRooms()` loop and debug logging from `ItemWorldScene`.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke.
