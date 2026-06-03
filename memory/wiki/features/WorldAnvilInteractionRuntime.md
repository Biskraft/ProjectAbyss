# WorldAnvilInteractionRuntime

`game/src/scenes/world/WorldAnvilInteractionRuntime.ts` owns LDtk world anvil per-frame interaction policy.

Current state:
- Updates anvil prompt suppression and hides all prompts when no anvil is active.
- Owns player-near-anvil proximity checks used by the proximity router and prompt display.
- Applies post-boss disabled state through `WorldAnvilRetirementRuntime.isRetiredByBossClear()`.
- Updates anvil visuals while deployment is active and suppresses prompts during deployment.
- Shows action prompts for place/reclaim and disabled prompts for retired anvils.
- Detects attack-hit overlap on placed-item anvils and calls back to start floor-collapse deployment.

Boundaries:
- `AnvilPromptController` still owns prompt UI objects and the suppression timer value.
- `WorldAnvilRetirementRuntime` still owns boss-clear retirement policy and return side effects.
- `WorldAnvilSpawnRuntime` owns host LDtk anvil spawning.
- `WorldAnvilItemRuntime` owns item placement/reclaim and anvil inventory opening actions.
- `WorldAnvilDeploymentRuntime` owns floor-collapse deployment start construction.
- `LdtkWorldScene` still owns builder-mounted anvil spawning and lower-level tunnel/Item World callbacks.

Prevention rules:
- Do not add scene-local `isPlayerNearAnvil()` or `updateAnvil()` methods back to `LdtkWorldScene`.
- Keep anvil prompt visibility and strike detection in this runtime, but keep deployment creation in the scene until the full deployment orchestration is extracted together.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
