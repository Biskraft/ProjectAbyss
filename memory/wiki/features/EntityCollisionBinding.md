# EntityCollisionBinding

## 2026-06-05

- Shared spawn/placement helpers should bind entity collision references through entity APIs instead of writing `roomData` directly.
- `Enemy.bindSpawnContext(...)` owns enemy collision-grid and target assignment for world/itemworld spawned enemies.
- `Player.bindCollisionGrid(...)` owns player collision-grid assignment for shared placement helpers.
- Scene-owned `roomData` fields remain collision-grid ownership seams and should not be mechanically replaced.
