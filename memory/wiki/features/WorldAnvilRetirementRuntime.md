# WorldAnvilRetirementRuntime

`game/src/scenes/world/WorldAnvilRetirementRuntime.ts` owns LDtk world anvil retirement policy after Item World boss clear.

Current state:
- Reads LDtk `Anvil.RetireAfterFirstBoss`.
- Decides whether an anvil should spawn disabled because the first Item World boss or a `boss_*` event was already cleared.
- Checks whether an active anvil should become retired/disabled during builder movement or world-return handling.
- Applies post-boss retirement side effects: clear placed item, disable the anvil, hide prompts, close anvil inventory mode, mark Ego return events, and flush the first-return inventory hint.

Boundaries:
- `WorldAnvilInteractionRuntime` owns per-frame proximity prompts and placed-item strike detection.
- `WorldAnvilSpawnRuntime` owns host LDtk anvil spawning.
- `LdtkWorldScene` still owns builder-mounted anvil spawning, inventory placement, item deployment, and actual Item World scene creation.
- `AnvilPromptController` still owns prompt UI and suppress timers.
- `AnvilItemWorldReturnState` still owns the recorded return item/snapshot and retire flag snapshot.

Prevention rules:
- Do not add scene-local `hasBossClearForAnvilRetire()`, `shouldSpawnAnvilDisabled()`, `isAnvilRetiredByBossClear()`, or `readAnvilRetireAfterBossFlag()` helpers back to `LdtkWorldScene`.
- Keep boss-clear/anvil-retirement event policy in this runtime; keep visual deployment ordering in the scene until the full anvil deployment orchestration is extracted together.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
