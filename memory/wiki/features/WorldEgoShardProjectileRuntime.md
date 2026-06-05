# WorldEgoShardProjectileRuntime

`game/src/scenes/world/WorldEgoShardProjectileRuntime.ts` owns LDtk world Ego Shard flight/update dispatch and player retrieval scanning.

Current responsibilities:

- Tick `WorldEgoShardRuntime.update()` each frame.
- Provide the World path's shard solid predicate (`1`, `7`, `9`, `12`, `15`) against the active collision grid.
- Dispatch terrain impact callbacks to `WorldEgoShardImpactRuntime`.
- Delegate enemy/container hit callbacks to `WorldEgoShardCombatRuntime`.
- Flush container-fluid mutations after shard update.
- Retrieve stuck shards near the player with the 24px padded AABB and remove the longest recovery cooldown for each retrieved shard.
- Shard update dispatch, shared solid-tile predicate, container-fluid flush ordering, 24px retrieval AABB, and longest-cooldown removal are shared through `game/src/scenes/shared/EgoShardProjectileHelpers.ts`; world-specific impact/combat callbacks remain injected by this runtime.
- The wrapper delegates directly to `updateEgoShardProjectileRuntime(deps, dtMs)` so world/itemworld runtime mapping stays identical.

Scene-owned boundaries:

- `WorldEgoShardRuntime` still owns manager/preview lifetime and charge timer storage.
- `WorldEgoShardCastRuntime` owns cast input, debug shipping gate, preview display, shard spend, cast gap, and recovery cooldown ticking.
- `WorldEgoShardCombatRuntime` owns shard enemy/container hit policy.
- `WorldEgoShardImpactRuntime` owns elemental terrain impact effects and debug elemental sweeps.
- `LdtkWorldScene` still owns debug key routing and debug enchant switching.
- Do not move cast input, combat hit policy, terrain impact effects, or debug routing into `EgoShardProjectileHelpers`; it should stay a projectile update/retrieval helper.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
