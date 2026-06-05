# LegacyWorldEnemySpawnHelpers

`game/src/scenes/shared/LegacyWorldEnemySpawnHelpers.ts` owns legacy procedural `WorldScene` room enemy instance creation.

- `createLegacyWorldRoomEnemies(...)` preserves the procgen room spawn policy: critical-path rooms spawn fewer base enemies, distance from start scales stats, each base spawn has a 30% Ghost chance, and GoldenMonster has a 20% room chance.
- The helper creates and initializes enemy instances with collision/player callbacks, then returns them to the caller.

Boundaries:

- `WorldScene` still owns when a room should spawn enemies, entity-layer attachment, altar spawning order, death drops, analytics, and portal policy.
- Do not use this helper for LDtk authored world enemy spawning; `WorldEnemySpawnRuntime` owns that path.
