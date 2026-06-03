# ItemWorldMemoryRoomPlacementRuntime

`game/src/scenes/itemworld/ItemWorldMemoryRoomPlacementRuntime.ts` owns procedural Item World Memory Room placement.

## Boundary

- Looks up weapon/stratum Memory Room templates through `Sheets/Content_ItemWorld_MemoryRooms.csv` via `getMemoryRoom()`.
- Owns the `"col:absRow" -> LdtkLevel` placement map consumed by `ItemWorldTemplatePickerRuntime`.
- Deterministically picks a non-boss, non-start cell per configured stratum, preferring off-critical-path branch rooms before falling back to any valid cell.
- Preserves the seed formula `itemUid * 131 + stratumIndex * 7 + 13`.
- `ItemWorldScene` still owns graph generation, template asset loading, and high-level build sequencing.
- `ItemWorldTemplatePickerRuntime` still validates that the placed Memory Room exits match the generated cell before using it.

## Verification

- 2026-06-02: Extracted Memory Room placement map ownership and selection from `ItemWorldScene.computeMemoryRoomPlacements()`.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke.
