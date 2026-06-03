# ItemWorldEnemyRegistry

`game/src/scenes/itemworld/ItemWorldEnemyRegistry.ts` owns the procedural Item World enemy array lifecycle.

Current responsibilities:

- Store the active `Enemy<string>[]` list for procedural Item World.
- Clear enemies by detaching their containers and emptying the list during stratum reload and scene cleanup.
- Provide shared lifecycle helpers for enemy update, render, defeated count, and non-empty checks.

Boundaries:

- Enemy spawn placement/room registration remains in `ItemWorldEnemySpawnRuntime`.
- Encounter selection remains in `ItemWorldEnemyEncounterRuntime`.
- Player attack reward/removal processing remains in `ItemWorldEnemyCombatRuntime`.
- Live per-room enemy counts belong to `ItemWorldRoomSpawnState`; this registry only owns the active enemy list lifecycle.
- `ItemWorldScene` may still iterate the registry array for scene-owned special effects such as fluid arc callbacks, acid steam, and boss-clear sequencing.
- Do not reintroduce a scene-owned `enemies` array; use the registry when adding enemy consumers.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
