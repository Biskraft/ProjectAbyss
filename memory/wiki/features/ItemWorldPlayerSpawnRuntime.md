# ItemWorldPlayerSpawnRuntime

`game/src/scenes/itemworld/ItemWorldPlayerSpawnRuntime.ts` owns LDtk-authored Item World player spawn capture and resolution.

Current responsibilities:

- Capture `Player` entities from LDtk templates when the room matches a unified-grid stratum start room.
- Store bottom-center LDtk spawn points by stratum index.
- Resolve runtime player top-left positions from captured bottom-center points using the current player dimensions.
- Fall back to deterministic floor spawn when no LDtk `Player` entity exists for that stratum.
- Floor fallback prefers `ItemWorldSpawnController.computeSpawnPoints()` floors, then scans for an air tile with solid below inside the room.

Scene-owned boundaries:

- `ItemWorldScene` still owns actual player mutation, camera snap, and stratum switching.
- `ItemWorldScene` supplies the current `fullGrid`, player dimensions, and spawn-point computation through runtime deps.
- `buildFullMap()` must call `clear()` before recapturing room records for a rebuilt full map.
- Keep LDtk `Player` entity capture out of `ItemWorldScene.buildFullMap()`; update this runtime if spawn authoring changes.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.

2026-06-02 update: moved floor fallback search and room spawn resolution from `ItemWorldScene` into this runtime. Verification: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.
