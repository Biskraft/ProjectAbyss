# ItemWorldProjectileRuntime

- `game/src/scenes/itemworld/ItemWorldProjectileRuntime.ts` owns procedural Item World hostile projectile list lifetime, entity-layer attachment, clearing, and update.
- It drains pending `Ghost.pendingProjectiles` into its internal projectile list/entity layer, advances projectile lifetime, handles player attack deflection, applies projectile damage to the player, and triggers the same HUD/screen flash/hit spark/damage number feedback as the previous scene-owned block.
- Projectile list attachment, Ghost pending-drain, clear, and destroy/splice operations are shared through `game/src/scenes/shared/ProjectileCollectionHelpers.ts`.
- Projectile AABB construction, deflect spark placement, and projectile-on-player hit feedback are shared through `game/src/scenes/shared/ProjectileCollisionHelpers.ts`; Item World-specific attack-hitbox calculation remains in this runtime.
- `EgoShard` player-cast projectile behavior is separate and stays in `ItemWorldEgoShardCastRuntime` / `ItemWorldEgoShardProjectileRuntime`.
- Do not reintroduce a scene-owned `projectiles` array; stratum cleanup should use `ItemWorldProjectileRuntime.clear()`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
