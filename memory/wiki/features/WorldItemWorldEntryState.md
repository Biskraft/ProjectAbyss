# WorldItemWorldEntryState

`game/src/scenes/world/WorldItemWorldEntryState.ts` owns LDtk world state for the world-to-Item-World entry flow.

Current state:

- Owns the currently collapsing/entering item, active item-deployment sequence, pending ghost-tunnel scheduling params, ItemTunnel flag, pre-tunnel return level id, and the "world visuals released for Item World" flag.
- `WorldItemDeploymentTunnelFlowRuntime` owns tunnel collision mutation, ghost stream restore/teardown ordering, player `roomData` synchronization, and deployment tunnel restoration.
- `WorldItemDeploymentAtmosphereFlowRuntime` owns consuming pending ghost-tunnel params after laser release and scheduling the ghost stream.
- `WorldItemWorldSceneFlowRuntime` owns ItemWorld scene creation, prepared push, and common procedural return handling.
- `LdtkWorldScene` still owns anvil return placement implementation and path-specific save/progress side effects.
- `WorldAnvilRetirementRuntime` owns the post-boss anvil retirement policy that can clear the preserved return item after Item World completion.
- `WorldAnvilDeploymentRuntime` owns creating/storing the active anvil deployment sequence, but this state remains the storage owner.
- Deployment cleanup should use `destroyDeployment()` so active deployment effects are destroyed before the reference is cleared.

Prevention rules:

- Do not add direct `collapseItem`, `itemDeployment`, `inItemTunnel`, `preTunnelLevelId`, or `worldVisualsReleasedForItemWorld` fields back to `LdtkWorldScene`.
- Do not move runtime collision scope or wall gate ownership into this state; use `WorldItemDeploymentTunnelFlowRuntime` for the extracted tunnel restore/teardown ordering.
- Do not add scene-local ItemWorld scene creation or common return helpers back to `LdtkWorldScene`; use `WorldItemWorldSceneFlowRuntime`.
- Preserve the fixed Item World fallback behavior: if a fixed level is missing, keep the item in this state and fall back to procedural entry.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
