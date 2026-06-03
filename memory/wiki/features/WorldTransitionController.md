# WorldTransitionController

`game/src/scenes/world/WorldTransitionController.ts` owns pure LDtk world transition geometry helpers.

Current state:

- `findPlayerSpawnLevel()` locates the fallback LDtk level containing a `Player` entity.
- `snapToFloor()`, `findEdgePassage()`, `findFloorY()`, and `getNeighborInDirection()` are stateless calculations. Callers pass the loader, level, or collision grid explicitly.
- `WorldEdgeTransitionFlowRuntime` calls `getNeighborInDirection()` for edge transition decisions; `LdtkWorldScene` still calls spawn/floor helpers directly where needed.
- `WorldPlayerSpawnRuntime` calls `findEdgePassage()` and `snapToFloor()` for level-load player placement; keep the geometry here and the state mutation there.

Prevention rules:

- Do not add scene-local wrappers such as `snapToFloor()`, `findEdgePassage()`, or `findFloorY()` back to `LdtkWorldScene`.
- Keep these helpers stateless; do not let `WorldTransitionController` capture scene fields or mutate scene state.
- Keep edge detection and transition starts in `WorldEdgeTransitionFlowRuntime`, not in this geometry helper.
- Keep player state mutation in `WorldPlayerSpawnRuntime`, not in this geometry helper.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings after removing the remaining scene wrappers.
