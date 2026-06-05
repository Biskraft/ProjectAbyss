# WorldRoomClearHelpers

`game/src/scenes/shared/WorldRoomClearHelpers.ts` owns the tiny legacy procgen room-clear predicate/mutation helper.

- `markRoomClearedWhenNoAliveEnemies(...)` checks the caller-supplied enemy list for zero alive enemies, guards already-cleared cells, marks `cell.cleared = true`, and invokes a caller-supplied `onCleared` callback.

Boundaries:

- Toasts, minimap redraws, room rewards, persistence, and Item World run stats remain caller/runtime-owned.
- Do not move Item World room-clear accounting here; `ItemWorldRoomClearRuntime` remains the owner for procedural Item World non-combat room clear mutation.
