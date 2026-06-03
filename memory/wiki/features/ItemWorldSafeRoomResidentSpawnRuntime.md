# ItemWorldSafeRoomResidentSpawnRuntime

`game/src/scenes/itemworld/ItemWorldSafeRoomResidentSpawnRuntime.ts` owns procedural safe-room ambient resident placement.

## Boundary

- Only hub rooms spawn ambient memory residents; shrine rooms stay non-combat but do not receive this crowd fill.
- Spawn candidates come from `ItemWorldSpawnController.computeSpawnPoints()` and are filtered to points standing on solid tiles.
- The runtime uses deterministic item/room seeded shuffling and jitter, then delegates actual creation to `ItemWorldResidentRuntime.spawnAmbient()`.
- `ItemWorldScene.spawnEnemiesInRoom()` remains responsible for safe-room sequencing, start-room gating, and marking the room cleared through `ItemWorldRoomClearRuntime`.

## Verification

- 2026-06-02: Extracted from `ItemWorldScene.spawnEnemiesInRoom()`.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke, `git diff --check` with only existing line-ending warnings.
