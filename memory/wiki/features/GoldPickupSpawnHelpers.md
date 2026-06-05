# GoldPickupSpawnHelpers

## 2026-06-05

- `game/src/scenes/shared/GoldPickupSpawnHelpers.ts` owns shared gold burst creation and collision-grid binding for world/itemworld drop paths.
- Bind gold pickups through `GoldPickup.enableTerrainPhysics(...)` rather than direct `roomData` field writes so terrain-physics setup stays inside the entity API.
- Scene-owned `roomData` assignments remain collision-grid ownership seams and should not be mechanically removed.
