# WorldItemDeploymentCollisionRuntime

`game/src/scenes/world/WorldItemDeploymentCollisionRuntime.ts` owns the LDtk world Item World deployment collision scope.

Current state:

- Owns the active `RuntimeCollisionScope` used while the official anvil Item World entry clears the world grid and stamps streamed Level 36 collision.
- `clearWorld(grid, fillValue)` snapshots the live grid, fills it in place, and keeps the same grid object for `Player` and other systems.
- `restore()` restores the scoped snapshot and clears the active scope reference.
- `WorldItemDeploymentTunnelFlowRuntime` owns when the anvil deployment flow clears/restores this scope, reassigns player `roomData`, rerenders tiles after restore, restores tunnel visuals, and coordinates ghost-stream collision restore.
- `LdtkWorldScene` still owns the higher-level Item World entry/return orchestration and actual `ItemWorldScene` creation.

Prevention rules:

- Do not add `itemDeploymentCollisionScope` or direct `RuntimeCollisionScope` construction back to `LdtkWorldScene`.
- Keep the grid object stable; do not replace `number[][]` while gameplay systems hold references.
- Keep scope restore before tile rerender in `WorldItemDeploymentTunnelFlowRuntime`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
