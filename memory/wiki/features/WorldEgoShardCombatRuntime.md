# WorldEgoShardCombatRuntime

`game/src/scenes/world/WorldEgoShardCombatRuntime.ts` owns LDtk world Ego Shard hit callbacks against enemies and throwable containers.

Current responsibilities:

- Resolve Ego Shard hit order: enemies first, then throwable containers.
- Apply shard enemy damage, element status side effects, hit sparks, damage numbers, and the World path's 2x2 thunder-chain footprint around hit enemies.
- Retrieve overlapping Ego Shards after a shard kill, preserving the previous scene-owned 99-count clamp.
- Apply shard damage to throwable containers.
- Preserve MetalCrate brittle-shatter behavior when its footprint is above ice or frozen overlay cells.
- Remove destroyed containers through `WorldContainerRegistry.removeAt()`; do not splice the world container array directly.

Scene-owned boundaries:

- `WorldEgoShardRuntime` still owns shard manager/preview lifetime and charge timing.
- `WorldEgoShardCastRuntime` owns cast input, debug shipping gate, preview display, shard spend, cast gap, and recovery cooldown ticking.
- `WorldEgoShardProjectileRuntime` owns shard flight update dispatch, solid collision predicates, post-update fluid flush, and player proximity retrieval.
- `WorldEgoShardImpactRuntime` owns elemental terrain impact effects and debug elemental sweeps.
- `LdtkWorldScene` still owns debug key routing and debug enchant switching.
- `WorldContainerDestructionRuntime` and `WorldContainerFluidRuntime` still own the actual container VFX/SFX bundle and fluid paint/refresh policy; this runtime calls them through callbacks.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
