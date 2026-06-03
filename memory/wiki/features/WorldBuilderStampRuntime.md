# WorldBuilderStampRuntime

`game/src/scenes/world/WorldBuilderStampRuntime.ts` owns LDtk world Giant Builder collision stamps.

Invariants:

- The runtime stamps active builder solid cells into the host `collisionGrid` in place, only where the host cell is air (`0`).
- `TILE_UPDRAFT` cells are not stamped into the host grid, preserving the old builder behavior.
- The runtime owns the stamp list, active stamp set, and tile-origin tracking used to decide when the builder crossed a tile boundary.
- `restamp()` owns the common unstamp-then-stamp path used when the builder crosses a tile boundary.
- `refreshIfBuilderGrid()` owns conditional restamping after runtime mutations to a collision grid; it is a no-op unless the changed grid is the active builder's collision grid.
- `ItemDeploymentTunnelRuntime` receives this runtime directly and calls `restamp()` after active-builder tunnel dig/restore. Do not route that path through `LdtkWorldScene` stamp callbacks.
- Existing callers that need to ignore builder-stamped cells should use `isStampedCell()` or `activeStampSet`; do not duplicate stamp encoding logic elsewhere.
- Do not reintroduce `builderStamps`, `builderStampSet`, `builderStampOrigin*`, `stampBuilder()`, `unstampBuilder()`, `isBuilderStampedCell()`, `isPlayerOnBuilderStamp()`, or `getBuilderStampSet()` to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
