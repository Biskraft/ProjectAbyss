# ItemWorldMemoryShardSpawnRuntime

`game/src/scenes/itemworld/ItemWorldMemoryShardSpawnRuntime.ts` owns the MemoryShardNPC replacement spawn path for procedural Item World normal enemy slots.

Current responsibilities:

- Preserve the `INNOCENT_SPAWN_CHANCE` roll and `canAddInnocent()` gate.
- Create deterministic innocent payloads from the existing seed and stratum index.
- Build `MemoryShardNPC` instances and register them through `ItemWorldEnemySpawnRuntime`.
- Own the capture/subdue callback: add innocent to the item, spawn special text, refresh HUD text, screen flash, capture SFX, capture orb VFX, and first shard-recall Ego dialogue unlock.

Scene-owned boundaries:

- `ItemWorldScene.spawnEnemiesInRoom()` still owns normal enemy slot iteration, RNG sequencing, spawn index calculation, and fallback regular enemy spawning.
- `ItemWorldEnemyCombatRuntime` still treats MemoryShardNPC kills/rewards separately.
- Do not duplicate MemoryShardNPC capture callbacks in `ItemWorldScene`; new shard spawn variants should pass through this runtime.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
