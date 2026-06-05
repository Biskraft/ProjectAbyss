# ItemWorldFullMapPopulationHelpers

## Current State

- `game/src/scenes/itemworld/ItemWorldFullMapPopulationHelpers.ts` owns the unified-grid room iteration for Item World full-map population.
- `ItemWorldScene.buildFullMap()` calls `populateItemWorldFullMapRooms(...)` and keeps runtime-specific side effects in callbacks.

## Boundaries

- The helper owns deterministic per-cell PRNG seed creation, unified-grid traversal, template pick dispatch, room pixel offset calculation, and room count.
- Keep room type assignment, collision copy/sealing, reward spawner capture, cell visual record writes, player spawn capture, and current-cell visit mutation in `ItemWorldScene` callbacks unless those responsibilities are promoted to their owning runtimes.
- Do not move lazy cell visual rendering into this helper; that remains `ItemWorldCellVisualRuntime`.

## Verification

- 2026-06-05: `npx tsc --noEmit` and `npm run build` passed from `game/`; build retained only the known LDtk/CSV `atlas/prologue_01.png` warning.
