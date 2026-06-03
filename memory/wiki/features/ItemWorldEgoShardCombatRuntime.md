# ItemWorldEgoShardCombatRuntime

`game/src/scenes/itemworld/ItemWorldEgoShardCombatRuntime.ts` owns procedural Item World Ego Shard hit callbacks against enemies and throwable containers.

Current responsibilities:

- Resolve Ego Shard hit order: enemies first, then throwable containers.
- Apply shard enemy damage, element status side effects, hit sparks, damage numbers, and thunder-chain splash around hit enemies.
- Retrieve overlapping Ego Shards after a shard kill, preserving the previous scene-owned 99-count clamp.
- Apply shard damage to throwable containers.
- Preserve MetalCrate brittle-shatter behavior when its footprint is above ice or frozen overlay cells.

Scene-owned boundaries:

- `ItemWorldEgoShardProjectileRuntime` still owns shard flight, solid checks, post-update fluid flush, and proximity retrieval.
- `ItemWorldEgoShardImpactRuntime` still owns terrain impact reactions after shard collision.
- `ItemWorldScene` still owns the actual container VFX/SFX destroy bundle and container-fluid paint wrapper, which this runtime calls through dependencies.
- `ItemWorldEnemyCombatRuntime` still owns sword-hit enemy reward processing and room clear accounting; do not merge that loop into this shard-specific runtime.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
