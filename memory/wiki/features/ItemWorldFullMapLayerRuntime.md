# ItemWorldFullMapLayerRuntime

`game/src/scenes/itemworld/ItemWorldFullMapLayerRuntime.ts` owns Item World full-map render layer construction.

## Boundary

- Destroys the previous `fullMapContainer` and creates the aggregate render-order stack: background, interior, structure, wall, mutation masks, special, decoration, shadow, and seal layers.
- Applies the Item World palette filters, wall rim light, depth brightness/bias transform, and PIXI child-culling flags.
- Clears mutation/solidified-wall graphics and cell key sets when rebuilding, creating replacement `Graphics` instances if the previous full-map destroy already destroyed them.
- Owns runtime wall-mutation visual overlays: charred masks for wall-to-air burnout/corrode and hardened-wall overlays for magma solidification.
- `ItemWorldScene` still owns gameplay resets, collision grid assembly, room/template iteration, static/runtime entity attachment, cell visibility, and camera bounds.
- `ItemWorldCellVisualRuntime`, `ItemWorldBoundaryVisualRuntime`, and `ItemWorldProceduralDecorRuntime` consume the aggregate containers returned by this runtime; do not recreate those containers elsewhere.

## Verification

- 2026-06-02: Extracted full-map aggregate container creation, render order, palette/rim filters, depth transform, and mutation-mask graphics reset from `ItemWorldScene.buildFullMap()`.
- 2026-06-02: Moved mutation/solidified-wall overlay cell sets and repaint methods from `ItemWorldScene` into this runtime.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke, `git diff --check` with only existing line-ending warnings.
