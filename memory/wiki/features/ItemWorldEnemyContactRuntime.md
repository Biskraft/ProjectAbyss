# ItemWorldEnemyContactRuntime

- `game/src/scenes/itemworld/ItemWorldEnemyContactRuntime.ts` owns procedural Item World enemy body-contact damage.
- It checks live enemy AABB overlap against the player, applies knockback, damage, invincibility, last-damage-source, HUD flash, hitstop, camera shake, screen flash, hit sparks, damage numbers, and player death handling.
- Keep boss-death clear/portal/reward handling in `ItemWorldScene`; this runtime only handles contact damage while enemies are alive.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
