# WorldAnvilItemRuntime

`game/src/scenes/world/WorldAnvilItemRuntime.ts` owns LDtk world anvil item placement/reclaim UI actions.

Current state:
- Reclaims placed anvil items back into inventory, including duplicate-uid guard, inventory-full toast, prompt suppression, preserved return item clearing, and first-return inventory hint flushing.
- Opens the anvil placement inventory path after restoring shared UI visibility.
- Commits selected items to the anvil, marks first dive, updates world-entry and return item state, closes inventory, hides shared UI for the dive transition, and calls back to start floor collapse.

Boundaries:
- `AnvilPlacementController` still owns item-selection validation and cycle-prompt routing.
- `WorldAnvilInteractionRuntime` owns proximity, prompt visibility, and placed-item strike detection.
- `WorldAnvilSpawnRuntime` owns host LDtk anvil spawning.
- `WorldAnvilDeploymentRuntime` owns floor-collapse deployment start construction.
- `WorldAnvilItemWorldFlowRuntime` owns anvil/tunnel Item World handoff after deployment or edge transition.
- `LdtkWorldScene` still owns builder-mounted anvil spawning and low-level callback wiring.

Prevention rules:
- Do not add scene-local `reclaimItemFromAnvil()`, `openAnvilUI()`, or `placeItemOnAnvil()` methods back to `LdtkWorldScene`.
- Keep Item World handoff policy in `WorldAnvilItemWorldFlowRuntime`, not in this item placement runtime.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
