# EntityCollisionBinding

## 2026-06-05

- Shared spawn/placement helpers should bind entity collision references through entity APIs instead of writing `roomData` directly.
- `Enemy.bindSpawnContext(...)` owns enemy collision-grid and target assignment for world/itemworld spawned enemies.
- `Player.bindCollisionGrid(...)` owns player collision-grid assignment for shared placement helpers.
- Scene-owned `roomData` fields remain collision-grid ownership seams and should not be mechanically replaced.

## 2026-06-17 - Shift+I collision and hurtbox debug

- `CollisionDebugOverlay` can draw actor debug boxes in addition to tile collision and the player ground probe.
- Player and enemies expose `getHurtAABB()`; the base `Entity` default is `x/y/width/height`, and `Player` may override it separately from movement collision.
- Shift+I colors: player collision white, player hurtbox yellow, enemy collision blue, enemy hurtbox pink.
- Prevention rule: when tuning actor body sizes, inspect both movement collision and hurtbox in Shift+I instead of assuming one rectangle represents both systems.
