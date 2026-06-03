# ItemWorldEnemyEncounterRuntime

`game/src/scenes/itemworld/ItemWorldEnemyEncounterRuntime.ts` owns Item World combat-room enemy selection and encounter instantiation.

## Boundary

- `ItemWorldRoomSpawnRuntime` decides whether a room can spawn at all, creates the spawn context, spawns designer rewards, and handles non-combat room clear rules.
- `ItemWorldScene` only decides when to request room spawning and wires dependencies.
- The encounter runtime owns CSV spawn-table lookup, cycle level offset, treasure GoldenMonster creation, boss creation/placement fallback, weighted normal entry selection, count rolling, MemoryShard replacement chance, and stratum/distance stat scaling.
- Enemy attachment and room enemy counting still go through `ItemWorldEnemySpawnRuntime.spawnAt()`.
- Memory shard capture side effects remain in `ItemWorldMemoryShardSpawnRuntime`; this runtime only calls its replacement spawn hook.

## Verification

- 2026-06-02: Extracted from `ItemWorldScene.spawnEnemiesInRoom()`.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke, `git diff --check` with only existing line-ending warnings.
