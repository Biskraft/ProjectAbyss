# World Map Runtime

## Current State

- `game/src/scenes/world/WorldMapRuntime.ts` owns LDtk world-map overlay setup, visited/current exploration sync, marker collection, player-position sync, debug-map open setup, and active-builder dynamic IntGrid sync.
- `LdtkWorldScene` still controls when the map opens, closes, or hides other HUD elements, but it should not collect map markers or call `WorldMapOverlay.setDynamicGrids()` directly.
- Active-builder dynamic grids are only exposed to the world map for the current visited room, matching the minimap behavior.

## Prevention Rules

- Do not add `collectMapMarkers()`, `collectWorldMapDynamicGrids()`, or `syncWorldMapDynamicGrids()` back to `LdtkWorldScene`.
- When adding a new world-map marker type, add it to `WorldMapRuntime.collectMarkers()` and keep `WorldMapOverlay` focused on drawing.
- Keep debug warp click behavior in the scene callback because it owns death-state revival and room warping; keep debug-map setup/sync in `WorldMapRuntime.openDebug()`.

## Verification

- 2026-06-02: `npx tsc --noEmit`, `npm run build`, and browser smoke at `/play/?debug=1` passed after extracting `WorldMapRuntime`; the smoke toggled `M` with no console/page errors.
