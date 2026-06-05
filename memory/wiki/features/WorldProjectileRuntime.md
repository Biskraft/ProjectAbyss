# WorldProjectileRuntime

`game/src/scenes/world/WorldProjectileRuntime.ts` owns LDtk world hostile projectile lifetime and hit/deflect feedback.

Current state:

- The runtime owns the world projectile array, entity-layer attachment, per-frame update, player-attack deflection overlap checks, player-hit overlap checks, deflect hit sparks, player projectile damage/knockback/invincibility, HUD damage flash, hitstop/camera shake/screen flash, damage numbers, death handling, destroy/splice cleanup, and scene-clear cleanup.
- Ghost enemies still create `pendingProjectiles`; `WorldProjectileRuntime` drains those pending arrays each update and attaches the projectile containers.
- `LdtkWorldScene` supplies current player/HUD/feedback managers through getters and should not keep scene-local projectile hit callbacks.
- Projectile list attachment, Ghost pending-drain, clear, and destroy/splice operations are shared through `game/src/scenes/shared/ProjectileCollectionHelpers.ts`.
- Projectile AABB construction, deflect spark placement, and projectile-on-player hit feedback are shared through `game/src/scenes/shared/ProjectileCollisionHelpers.ts`; world-specific attack hitbox source remains in this runtime.

Prevention rules:

- Do not add a scene-owned `projectiles` array back to `LdtkWorldScene`.
- Do not reintroduce `handleProjectileDeflected()` or `handleProjectileHitPlayer()` in `LdtkWorldScene`.
- If new world enemies create projectiles, route them through this runtime instead of attaching projectile containers directly in the scene.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
