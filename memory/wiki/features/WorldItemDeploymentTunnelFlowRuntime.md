# WorldItemDeploymentTunnelFlowRuntime

`game/src/scenes/world/WorldItemDeploymentTunnelFlowRuntime.ts` owns the LDtk world Item World deployment tunnel flow.

Current state:

- Opens the anvil deployment tunnel by starting the optional growth snapshot, clearing stale ghost stream state, restoring prior ghost/world collision first, clearing the tunnel visuals/cells, triggering the anvil directional trail, and clearing the world collision through `WorldItemDeploymentCollisionRuntime`.
- Owns ghost overlay teardown, ghost collision restore, world deployment collision restore, player `roomData` reassignment, stream-state clearing, and deployment tunnel visual restore ordering.
- Keeps the grid object stable: world collision clear/restore mutates the existing `number[][]` and immediately reassigns `player.roomData` to that same grid.
- `WorldItemWorldEntryState` still stores pending ghost-tunnel state, `WorldItemDeploymentAtmosphereFlowRuntime` consumes it after laser release, and `LdtkWorldScene` still owns higher-level Item World entry/return orchestration plus actual `ItemWorldScene` creation.

Prevention rules:

- Do not add scene-local `openDeploymentTunnel()`, `restoreGhostWorldCollision()`, `clearWorldCollisionForItemDeployment()`, `restoreWorldCollisionForItemDeployment()`, `destroyGhostOverlay()`, or `restoreDeploymentTunnel()` helpers back to `LdtkWorldScene`.
- Keep ghost collision restore before world deployment collision restore, and keep deployment collision restore before tile rerender.
- Keep player `roomData` synchronized after both deployment collision clear and restore.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
