# ItemWorldStaticEntityRuntime

`game/src/scenes/itemworld/ItemWorldStaticEntityRuntime.ts` owns the per-frame static-entity and tile-hazard update slice that used to live inside `ItemWorldScene.updateStaticEntities()`.

Current responsibilities:

- Tick scene-owned tile hazards through a callback before entity checks.
- Apply IntGrid spike damage, knockback reset to `lastSafeX/Y`, hitstop, flash, camera shake, and death fallback.
- Update collapsing platforms, growing walls, item displays, and locked doors.
- Keep locked-door collision reassertion and direct AABB player push-out together.
- Route active player sword hitboxes to cracked floors, breakable props, switches, and throwable containers.
- Own switch-triggered locked-door unlock feedback: collision unlock, camera shake, hit flash, gate-open toast, door destruction, and door-list removal.
- Run camera-zone updates after static entity interactions.

Scene-owned boundaries:

- Static entity arrays and clear lifecycle belong to `ItemWorldStaticEntityRegistry`; this runtime consumes those arrays but does not own storage.
- `ItemWorldScene` still owns terrain mutation callbacks, breakable-prop VFX, container fluid painting/destruction, and `CameraZoneRuntime`.
- Do not duplicate sword-hitbox construction in the scene; static terrain/entity hit interactions should pass through this runtime unless the behavior becomes enemy-combat specific.

Verification after registry extraction: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
