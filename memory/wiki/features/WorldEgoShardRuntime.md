# WorldEgoShardRuntime

`game/src/scenes/world/WorldEgoShardRuntime.ts` owns LDtk world Ego Shard manager, preview, and charge-timer state.

- Creates and delegates to `EgoShardManager` and `EgoShardPreview`.
- Owns `castChargeMs` and velocity resolution for the current held cast.
- `WorldEgoShardCastRuntime` owns cast input, debug shipping gate, preview display, shard spend, cast gap, and recovery cooldown ticking.
- `WorldEgoShardProjectileRuntime` owns shard flight update dispatch, solid predicate, post-update fluid flush, and player proximity retrieval.
- `WorldEgoShardCombatRuntime` owns enemy/container hit policy.
- `WorldEgoShardImpactRuntime` owns elemental terrain impact effects and debug elemental sweeps.
- `LdtkWorldScene` still owns debug key routing and debug enchant switching.
- Keep the debug-only Ego Shard shipping gate in `WorldEgoShardCastRuntime`; this runtime owns object lifetime and charge state only.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
