# ItemWorldEgoShardCastRuntime

- `game/src/scenes/itemworld/ItemWorldEgoShardCastRuntime.ts` owns procedural Item World Ego Shard cast input, charge state, trajectory preview, spawn, cast gap, and recovery cooldown queue.
- The runtime is still debug-gated by `?debug`, matching the previous scene-owned block. When debug is off it clears local charge state, hides the preview, and releases the player's aiming pose while still ticking shard recovery cooldowns.
- `ItemWorldEgoShardProjectileRuntime` owns `EgoShardManager.update()` and manual retrieval; `ItemWorldScene` still owns impact effects, enemy/container hit callbacks, and manager clearing because those depend on scene collision/entity systems.
- Carry gating must go through `ItemWorldContainerCarryRuntime.hasHeldContainer()` so holding a throwable container continues to suppress cast/aim.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
