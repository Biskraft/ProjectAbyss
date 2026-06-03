# ItemWorldRoomStateRuntime

`game/src/scenes/itemworld/ItemWorldRoomStateRuntime.ts` owns procedural Item World room-state serialization helpers.

Current responsibilities:

- Restore `visited`, `cleared`, boss portal positions, and `spawnedRooms` from `ItemWorldProgress`.
- Persist those room-state fields back into `ItemWorldProgress`.
- Count total non-empty rooms in the unified grid.
- Resolve current or explicit cells from `UnifiedGridData`.

Scene-owned boundaries:

- `ItemWorldScene` still decides when to restore/persist state. Restored cleared-room counts are stored in `ItemWorldRunStats`.
- Combat clear, boss portal creation, and stratum transitions still mutate room cells through their existing runtimes before persistence.
- `ItemWorldMapController.ts` now contains geometry constants only; do not re-add state or collision controller behavior there.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
