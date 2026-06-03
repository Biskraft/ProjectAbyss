# ItemWorldBoundaryVisualRuntime

`game/src/scenes/itemworld/ItemWorldBoundaryVisualRuntime.ts` owns the render-only outer boundary frame for procedural Item World full maps.

Current responsibilities:

- Draw the brick-pattern boundary frame into the scene-owned `sealAggregate`.
- Use shared Item World room geometry and `IW_BOUNDARY_THICKNESS` so visuals match `ItemWorldFullGridRuntime.addBoundaryCollision()`.

Scene-owned boundaries:

- `ItemWorldScene.buildFullMap()` still decides when to add boundary collision and when to add the visual frame.
- `sealAggregate` lifetime, palette filters, and aggregate teardown remain scene/cell-visual owned.
- Empty/null unified-grid cells intentionally have no dark fill. Do not reintroduce `fillNullCellSeal()` unless the visual policy changes.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
