# WorldBuildingRuntime

`game/src/scenes/world/WorldBuildingRuntime.ts` owns LDtk world `Building` visual spawning.

Responsibilities:

- Clear and respawn authored LDtk `Building` entities for the active level.
- Validate that LDtk building entities include tile-picker data before spawning.
- Instantiate `Building` visuals from the LDtk tile source rectangle and tileset path.
- Add visuals through `WorldBuildingRegistry` so room-clear cleanup stays centralized.

Boundaries:

- `WorldBuildingRegistry` owns the active list, entity-layer attachment, and destroy-on-clear lifecycle.
- `Building` remains visual-only and must not inject collision.
- `LdtkWorldScene` should not instantiate `Building` directly.

Prevention rules:

- Use LDtk IntGrid/collision entities for blocking behavior; do not add gameplay collision to `Building`.
- Keep tile-picker validation in this runtime so future LDtk data issues are logged near spawn ownership.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
