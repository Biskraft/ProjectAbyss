# ItemWorldProjectileRuntime

- `game/src/scenes/itemworld/ItemWorldProjectileRuntime.ts` owns procedural Item World hostile projectile list lifetime, entity-layer attachment, clearing, and update.
- It drains pending `Ghost.pendingProjectiles` into its internal projectile list/entity layer, advances projectile lifetime, handles player attack deflection, applies projectile damage to the player, and triggers the same HUD/screen flash/hit spark/damage number feedback as the previous scene-owned block.
- `EgoShard` player-cast projectile behavior is separate and stays in `ItemWorldEgoShardCastRuntime` / `ItemWorldEgoShardProjectileRuntime`.
- Do not reintroduce a scene-owned `projectiles` array; stratum cleanup should use `ItemWorldProjectileRuntime.clear()`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
