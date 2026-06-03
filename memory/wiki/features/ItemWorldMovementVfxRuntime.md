# ItemWorldMovementVfxRuntime

- `game/src/scenes/itemworld/ItemWorldMovementVfxRuntime.ts` owns the procedural Item World player/enemy movement VFX and fluid-residue feedback loop.
- It drains player one-shot events for landing, dash, double jump, wall jump, ground jump, hit spray, dive impact, water/fluid entry splashes, bubbles, drop-through dust, ice skid, footstep SFX, and surge VFX.
- It also owns player/enemy fluid-residue contact effects that were previously inside `ItemWorldScene.updateMovementVfx()`: oil slip refresh, acid/magma/fire HP ticks, fluid impulses, damage numbers for enemy residue ticks, and per-enemy non-water fluid transition state.
- `ItemWorldContainerPhysicsRuntime` owns throwable-container physics/collision. `ItemWorldScene.updateMovementVfx()` still runs Ego Shard projectile update and low-HP/item-pickup overlay updates after delegating movement/fluid VFX and container physics.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
