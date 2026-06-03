# ItemWorldFullGridRuntime

`game/src/scenes/itemworld/ItemWorldFullGridRuntime.ts` owns deterministic Item World `fullGrid` collision assembly helpers.

## Boundary

- Copies each picked LDtk room collision grid into the stitched Item World `fullGrid`.
- Creates the initial solid `fullGrid` sized to the active unified grid.
- Applies the existing 2-tile solid seal for closed up/down exits after copying room collision.
- Applies the outer full-map solid boundary collision using `IW_BOUNDARY_THICKNESS`.
- `ItemWorldScene` still owns template selection, item spawner capture, player spawn capture, and runtime entity attachment.
- `ItemWorldRoomTypeRuntime` owns post-template logical room-type assignment.
- `ItemWorldFullMapLayerRuntime` owns visual aggregate setup; `ItemWorldBoundaryVisualRuntime` owns boundary visuals.
- `ItemWorldMapController.ts` is now geometry constants only; full-grid creation should stay in this runtime.

## Verification

- 2026-06-02: Extracted room collision copy, vertical exit sealing, and boundary collision from `ItemWorldScene.buildFullMap()`.
- 2026-06-02: Moved initial fullGrid creation out of `ItemWorldMapController` into `ItemWorldFullGridRuntime`.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke, `git diff --check` with only existing line-ending warnings.
