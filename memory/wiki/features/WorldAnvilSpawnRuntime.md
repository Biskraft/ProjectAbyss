# WorldAnvilSpawnRuntime

`game/src/scenes/world/WorldAnvilSpawnRuntime.ts` owns host and builder-mounted LDtk `Anvil` spawning.

Current state:
- Clears the previous host anvil and prompt UI before a host level spawns its anvil.
- Spawns the first LDtk `Anvil` entity, reads `RetireAfterFirstBoss` through `WorldAnvilRetirementRuntime`, applies initial disabled state, and attaches the visual to the scene entity layer.
- Keeps the existing prototype fallback that spawns an anvil at the first `Altar` entity when no `Anvil` exists in the level.
- `spawnBuilderMounted()` handles builder-level `Anvil` entities, preserves the single-Anvil policy when a host anvil already exists, reads the same `RetireAfterFirstBoss` flag, and attaches the anvil through `WorldBuilderAttachmentRuntime`.

Boundaries:
- `LdtkWorldScene.spawnBuilderEntities()` only dispatches builder anvil entities to this runtime; it does not construct builder anvils directly.
- `WorldAnvilInteractionRuntime` owns per-frame proximity/prompt/strike behavior.
- `WorldAnvilRetirementRuntime` owns retired/disabled policy.
- `WorldAnvilItemRuntime` owns item placement/reclaim and anvil inventory opening actions.
- `LdtkWorldScene` still owns floor-collapse deployment construction.

Prevention rules:
- Do not add a scene-local `spawnAnvilFromLdtk()` method back to `LdtkWorldScene`.
- Do not reintroduce builder-mounted `Anvil` construction in `LdtkWorldScene.spawnBuilderEntities()`.
- Keep builder anvil liveness tied to `getAnvil() === anvil` so replacement/cleanup removes the attachment.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
