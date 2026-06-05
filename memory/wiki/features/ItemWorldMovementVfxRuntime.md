# ItemWorldMovementVfxRuntime

- `game/src/scenes/itemworld/ItemWorldMovementVfxRuntime.ts` owns the procedural Item World player/enemy movement VFX and fluid-residue feedback loop.
- It drains player one-shot events for landing, dash, double jump, wall jump, ground jump, hit spray, dive impact, water/fluid entry splashes, bubbles, drop-through dust, ice skid, footstep SFX, and surge VFX.
- Player basic kinematic VFX event consumption and spawn timing are shared through `game/src/scenes/shared/MovementVfxHelpers.updatePlayerKinematicVfx()`. Item World still owns player-hit spray, water/fluid transitions, fluid residue timers/damage, bubbles, drop-through dust, ice skid, and manager update order.
- Enemy water-transition splash, bubbles, ice skid, landing, and jump takeoff VFX are shared through `MovementVfxHelpers.updateEnemyKinematicVfx()`. Item World keeps fluid impulse callbacks, non-water fluid transition state, residue damage, and damage-number policy local.
- It also owns player/enemy fluid-residue contact effects that were previously inside `ItemWorldScene.updateMovementVfx()`: oil slip refresh, acid/magma/fire HP ticks, fluid impulses, damage numbers for enemy residue ticks, and per-enemy non-water fluid transition state.
- Do not move fluid residue, player-hit spray, non-water fluid policy, or damage-number feedback into `MovementVfxHelpers`; it should stay limited to shared player/enemy kinematic VFX bundles.
- `ItemWorldContainerPhysicsRuntime` owns throwable-container physics/collision. `ItemWorldScene.updateMovementVfx()` still runs Ego Shard projectile update and low-HP/item-pickup overlay updates after delegating movement/fluid VFX and container physics.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
