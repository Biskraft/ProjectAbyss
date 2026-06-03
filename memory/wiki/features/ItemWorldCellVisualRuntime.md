# ItemWorldCellVisualRuntime

`game/src/scenes/itemworld/ItemWorldCellVisualRuntime.ts` owns lazy Item World full-map cell visual rendering.

## Boundary

- Owns cell visual records keyed by `col:absRow`, rendered layer tracking, visible-window key state, lazy cell render, visible-window update/unload, aggregate filterArea updates, and cell visual teardown.
- Owns the reusable viewport `Rectangle` used for aggregate `filterArea`; keep that cache out of `ItemWorldScene`.
- Preserves LDtk visual behavior: room-local bounds filtering, solid-generic substitution by item temperament, item-world area tileset substitution, per-cell culling rectangles, and `VisualBoundsBleed` overscan layers.
- `ItemWorldScene` still owns full-grid collision construction, room type selection, static/runtime entity attachment, camera window calculation, and trapdoor floor erasure.
- `ItemWorldFullMapLayerRuntime` owns aggregate container creation, filter setup, render order, and mutation/solidified-wall graphics reset.
- `ItemWorldRuntimeCellSpawner` reads records through `ItemWorldCellVisualRuntime.getRecord()`; do not move eager entity spawning into the visual runtime.

## Verification

- 2026-06-02: Extracted cell visual records/rendered layers/lazy render/unload from `ItemWorldScene`.
- 2026-06-02: Moved visible-window update, lazy active-cell render/unload, and aggregate filterArea culling from `ItemWorldScene.updateCellVisibility()` into this runtime.
- 2026-06-02: Moved the reusable viewport `Rectangle` cache from `ItemWorldScene` into this runtime.
- 2026-06-02: Removed dead `ItemWorldScene.rebuildRoomVisuals()` and the now-unused aggregate-child destruction helper.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke, `git diff --check` with only existing line-ending warnings.
