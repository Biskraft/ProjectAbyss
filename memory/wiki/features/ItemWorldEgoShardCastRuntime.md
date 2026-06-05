# ItemWorldEgoShardCastRuntime

- `game/src/scenes/itemworld/ItemWorldEgoShardCastRuntime.ts` owns procedural Item World Ego Shard cast input, charge state, trajectory preview, spawn, cast gap, and recovery cooldown queue.
- Shared cast state progression lives in `game/src/scenes/shared/EgoShardCastHelpers.ts`, including debug gating, charge/preview/release sequencing, launch point math, cooldown recovery, reset behavior, and preview solid-tile predicate.
- Runtime-level input/getter adaptation is shared through `EgoShardCastHelpers.updateEgoShardCastRuntime()`; Item World remains a mode-specific wiring shell plus lifecycle `reset()` bridge.
- The runtime is still debug-gated by `?debug`, matching the previous scene-owned block. When debug is off the shared helper clears local charge state, hides the preview, and releases the player's aiming pose while still ticking shard recovery cooldowns.
- `ItemWorldEgoShardProjectileRuntime` owns `EgoShardManager.update()` and manual retrieval; `ItemWorldScene` still owns impact effects, enemy/container hit callbacks, and manager clearing because those depend on scene collision/entity systems.
- Carry gating must go through `ItemWorldContainerCarryRuntime.hasHeldContainer()` so holding a throwable container continues to suppress cast/aim.
- `ItemWorldEgoShardCastRuntime` still owns held-container dependency wiring and lifecycle `reset()` bridge, while the shared runtime helper owns the `GameAction.CAST` read from the provided input adapter.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
