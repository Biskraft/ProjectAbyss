# ItemWorldEgoShardProjectileRuntime

- `game/src/scenes/itemworld/ItemWorldEgoShardProjectileRuntime.ts` owns procedural Item World Ego Shard flight update, solid hit-test binding, post-hit container-fluid flush, and player-proximity retrieval.
- Shard update dispatch, shared solid-tile predicate, container-fluid flush ordering, 24px retrieval AABB, and longest-cooldown removal are shared through `game/src/scenes/shared/EgoShardProjectileHelpers.ts`; Item World-specific impact/combat callbacks remain injected by this runtime.
- The wrapper delegates directly to `updateEgoShardProjectileRuntime(deps, dtMs)` so world/itemworld runtime mapping stays identical.
- `ItemWorldEgoShardImpactRuntime` owns the terrain impact callback, and `ItemWorldEgoShardCombatRuntime` owns enemy/container hit callbacks. `ItemWorldScene` still owns `EgoShardManager.clear()` because it is part of scene/level reset.
- Manual retrieval uses a 24 px player AABB pad and removes the longest remaining shard recovery cooldown before restoring one shard, matching the prior scene-owned behavior.
- Solid checks intentionally match the previous Item World shard rule: IntGrid values `1`, `7`, `9`, `12`, and `15`.
- Do not move cast input, combat hit policy, terrain impact effects, or scene reset into `EgoShardProjectileHelpers`; it should stay a projectile update/retrieval helper.
- Verification on 2026-06-02 after callback extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
