# WorldAnvilDeploymentRuntime

`game/src/scenes/world/WorldAnvilDeploymentRuntime.ts` owns LDtk world anvil floor-collapse deployment start orchestration.

Current state:
- Starts the anvil floor-collapse sequence when an anvil has a placed item.
- Hides anvil prompts, hides savepoint UI for deployment, hides shared UI for the dive transition, marks the anvil used, records the anvil return state, sets the pre-tunnel return level, increments the item dive counter, applies hitstop/camera shake, and spawns the initial strike effect.
- Destroys the prior active deployment, creates a new `ItemWorldEntrySequence` via `createAnvilItemDeployment()`, stores it in `WorldItemWorldEntryState`, and starts it at the anvil position. Item World handoff is delegated to `WorldAnvilItemWorldFlowRuntime`.

Boundaries:
- `WorldItemDeploymentTunnelFlowRuntime` owns tunnel collision mutation, ghost collision restore/teardown ordering, player `roomData` synchronization, and deployment tunnel restoration.
- `WorldItemDeploymentAtmosphereFlowRuntime` owns laser/dungeon-atmosphere callbacks and ghost-stream scheduling after laser release.
- `WorldAnvilItemWorldFlowRuntime` owns anvil/tunnel Item World handoff, fixed-level override routing, and anvil-path return rewards.
- `WorldAnvilItemRuntime` owns item placement/reclaim UI actions and calls this runtime through the scene wrapper.
- `WorldAnvilInteractionRuntime` owns placed-item strike detection and calls this runtime through the scene wrapper.
- `WorldItemWorldEntryState` still owns the active deployment reference.

Prevention rules:
- Do not move tunnel collision clear/restore into this runtime; `WorldItemDeploymentTunnelFlowRuntime` owns that restore ordering together with ghost-stream teardown.
- Do not move laser/dungeon-atmosphere callbacks into this runtime; `WorldItemDeploymentAtmosphereFlowRuntime` owns that sequencing.
- Do not add the full `createAnvilItemDeployment()` setup back to `LdtkWorldScene.triggerFloorCollapse()`.
- Do not put `ItemWorldScene` creation or anvil return toasts/dialogue into this runtime; delegate handoff to `WorldAnvilItemWorldFlowRuntime`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.

- 2026-06-05: Item World growth snapshot display cleanup now uses `DisplayObjectLifecycleHelpers.destroyDisplayObject()` for the vignette and snapshot container; render texture destruction and hidden-source restoration remain owned by `ItemWorldGrowthSnapshotController`.
