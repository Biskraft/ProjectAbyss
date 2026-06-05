# WorldEgoShardCastRuntime

`game/src/scenes/world/WorldEgoShardCastRuntime.ts` owns LDtk world Ego Shard cast input, trajectory preview, spawn, cast gap, and recovery cooldown ticking.

Current responsibilities:

- Keep the world Ego Shard shipping gate debug-only via `?debug`.
- Shared cast state progression lives in `game/src/scenes/shared/EgoShardCastHelpers.ts`, including debug gating, charge/preview/release sequencing, launch point math, cooldown recovery, and preview solid-tile predicate.
- Runtime-level input/getter adaptation is shared through `EgoShardCastHelpers.updateEgoShardCastRuntime()`; world remains a mode-specific wiring shell.
- Suppress cast/aim while the player holds a throwable container.
- Use `WorldEgoShardRuntime` charge helpers for hold-to-charge, preview velocity, release spawn, and preview hiding.
- Spend one shard on release, push `SHARD_RECOVERY_MS`, and enforce `CAST_MIN_GAP_MS`.
- Tick `egoCastCooldownMs` and shard recovery cooldowns; expired recovery calls `WorldEgoShardRuntime.removeOldestShard()`.
- Use the World path's preview solid predicate (`1`, `7`, `9`, `12`, `15`) against the active collision grid.

Scene-owned boundaries:

- `WorldEgoShardRuntime` still owns manager/preview lifetime and charge timer storage.
- `WorldEgoShardCastRuntime` still owns held-container dependency wiring, while the shared runtime helper owns the `GameAction.CAST` read from the provided input adapter.
- `WorldEgoShardProjectileRuntime` owns shard flight update dispatch and player retrieval scanning.
- `WorldEgoShardCombatRuntime` owns shard enemy/container hit policy.
- `WorldEgoShardImpactRuntime` owns elemental terrain impact effects and debug elemental sweeps.
- `LdtkWorldScene` still owns debug key routing and debug enchant switching.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
