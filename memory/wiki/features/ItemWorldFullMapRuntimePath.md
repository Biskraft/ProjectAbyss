# ItemWorldFullMapRuntimePath

Item World runtime uses the full-map path, not the old single-room `loadRoom()` path.

## Boundary

- `ItemWorldScene.buildFullMap()` builds one stitched `fullGrid` and visual aggregates for the unified Item World.
- Room entry uses current player world position, `spawnEnemiesInRoom()`, `spawnRuntimeForCell()`, and `preSpawnNeighborRooms()`.
- The legacy room-by-room methods were removed on 2026-06-02: `loadRoom()`, `buildDoorTriggers()`, `checkDoorTriggers()`, legacy `spawnEnemies()`, legacy `spawnBoss()`, door marker drawing, and code-template room fallback wrappers.
- Legacy door-mask carve/seal helpers were removed from `ItemWorldScene` and `ItemWorldMapController` on 2026-06-02. Current collision comes from LDtk room grids plus `ItemWorldFullGridRuntime`; do not reintroduce carve masks unless the full-map collision contract changes.
- Item World minimap rendering is disabled for blind exploration. The old no-op `drawMiniMap()` and never-mounted `miniMapContainer` were removed on 2026-06-02; do not add compatibility shims unless a real Item World map UI is being restored.
- Do not reintroduce door-trigger room transitions for Item World unless the full-map architecture is intentionally replaced. That old path used different collision/camera assumptions and can conflict with current continuous-world spawning.

## Verification

- 2026-06-02: Removed the dead room-by-room path from `ItemWorldScene`.
- 2026-06-02: Removed dead door-mask carve/seal wrappers from `ItemWorldScene` and `ItemWorldMapController`.
- 2026-06-02: Removed the disabled Item World minimap no-op shim.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke, `git diff --check` with only existing line-ending warnings.
