# WorldAnvilItemWorldFlowRuntime

`game/src/scenes/world/WorldAnvilItemWorldFlowRuntime.ts` owns LDtk world anvil/tunnel Item World entry completion policy.

Current state:

- Enters procedural Item World from the anvil growth deployment and from edge/tunnel transitions.
- Preserves the current default growth path by entering directly with `entryCorridor: false`; non-deployment tunnel/right-edge paths can still request the corridor.
- Preserves the archived `ItemTunnel_*` rarity-mapped descent path in this runtime for future restoration.
- Routes fixed-level override items through `WorldFixedItemWorldFlowRuntime.enter()`.
- Uses `WorldItemWorldSceneFlowRuntime` for prestreaming, `ItemWorldScene` construction, prepared push, and common return handling.
- Applies anvil-path return side effects after common return: weapon level-up toast, attack-change toast, world-return dialogue, and anvil retirement policy.

Boundaries:

- `WorldAnvilDeploymentRuntime` owns starting the anvil floor-collapse/growth sequence and calls this runtime only when that sequence hands off to Item World.
- `WorldItemWorldSceneFlowRuntime` owns common procedural scene creation, push, and return mechanics.
- `WorldFixedItemWorldFlowRuntime` owns handcrafted fixed Item World load/return policy.
- `WorldAnvilReturnFlowRuntime` owns anvil return level restore and player placement.
- `LdtkWorldScene` still owns callback-level dialogue/anvil-retirement dispatch.

Prevention rules:

- Do not add scene-local `enterItemWorldFromTunnel()`, `completeFloorCollapseEntry()`, or `completeFloorCollapseEntryViaTunnel()` helpers back to `LdtkWorldScene`.
- Keep fixed item override routing in this runtime so anvil, tunnel, and right-edge Item World entry branches share the same policy.
- Keep path-specific anvil return toasts/dialogue/retirement here; keep common scene push/return in `WorldItemWorldSceneFlowRuntime`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
