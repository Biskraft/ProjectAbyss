# WorldPlayerSpawnRuntime

`game/src/scenes/world/WorldPlayerSpawnRuntime.ts` owns LDtk world player placement on level load.

Current state:

- Places the player after `LdtkWorldScene.loadLevel()` has cloned and patched the runtime collision grid for the incoming level.
- Uses the runtime collision grid, not raw LDtk `level.collisionGrid`, so broken SecretWalls/CrackedFloors can open valid edge passages before placement.
- Converts `WorldEdgeTransitionRuntime` pending world-tile hints to local level hints, then uses `WorldTransitionController.findEdgePassage()` / `snapToFloor()` for edge-entry placement.
- Uses the LDtk `Player` entity for default down-entry/fresh spawn, and falls back to a bottom-edge passage when no Player entity exists.
- Reads scene via injected `getScene()` callback before using `Player.Scene` fallbacks.
- Updates player position, velocity, `roomData`, previous position, and `WorldVoidRuntime` safe position through callbacks.

Boundaries:

- `WorldTransitionController` owns stateless placement geometry helpers.
- `WorldEdgeTransitionRuntime` owns pending previous-world tile hints.
- `LdtkWorldScene` still owns the actual `loadLevel()` sequence and calls this runtime after wall-breaking spawn runtimes have patched collision.

Prevention rules:

- Do not add scene-local `placePlayer()` helpers back to `LdtkWorldScene`.
- Keep placement based on the runtime collision grid so previously opened passages affect spawn selection.
- Keep camera snap and post-load physics settling outside this runtime; it only places the player and updates immediate player state.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
