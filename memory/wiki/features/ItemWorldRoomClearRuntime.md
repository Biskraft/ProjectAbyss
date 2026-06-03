# ItemWorldRoomClearRuntime

`game/src/scenes/itemworld/ItemWorldRoomClearRuntime.ts` owns the small shared state mutation for marking procedural Item World rooms cleared.

Current responsibilities:

- Guard against double-clearing an already cleared `UnifiedRoomCell`.
- Set `cell.cleared = true`.
- Increment the `ItemWorldRunStats` cleared-room counter through a callback.
- Optionally grant item Memory Recovery for non-combat discovery clears.
- Persist room state after the clear mutation.

Scene-owned boundaries:

- `ItemWorldRoomSpawnRuntime` owns the policy for when non-combat rooms clear: hub/shrine, stratum starts, Memory Rooms, corridors, and Rest rooms.
- `ItemWorldScene` wires `ItemWorldRoomClearRuntime.markCleared()` into the room-spawn runtime.
- `ItemWorldEnemyCombatRuntime` still owns kill-based combat-room clear handling for now.
- Do not open-code `cell.cleared`, `ItemWorldRunStats.incrementRoomsCleared()`, and `persistRoomState()` together in new non-combat room-clear paths; call this runtime instead.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
