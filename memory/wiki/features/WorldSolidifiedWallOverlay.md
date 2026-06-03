# WorldSolidifiedWallOverlay

`game/src/scenes/world/WorldSolidifiedWallOverlay.ts` owns the LDtk world runtime wall overlay for hardened magma cells.

Current state:
- The overlay owns the `Graphics` object and the set of runtime-solidified wall cells that have no baked LDtk wall autotile sprite.
- `LdtkWorldScene` still owns `TileMutator.onWallTileChanged`, the decision that magma changed into `TILE_WALL`, wall-layer dirty/rerender timing, and collision-grid mutation policy.
- The overlay is included in Item World transition reality groups through `WorldSolidifiedWallOverlay.graphics` so the visual participates in the same transition layer stack as before.

Prevention rules:
- Do not add `solidifiedWallGfx`, `solidifiedWallCells`, or `rebuildSolidifiedWallOverlay()` back to `LdtkWorldScene`.
- Keep tile mutation and wall-rerender policy in the scene until the world tile hazard/tile mutation loop is intentionally extracted.
- Use `WorldSolidifiedWallOverlay.addCell(gx, gy, collisionGrid)` only after the runtime grid cell is confirmed as `TILE_WALL`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
