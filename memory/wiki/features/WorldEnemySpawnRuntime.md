# WorldEnemySpawnRuntime

`game/src/scenes/world/WorldEnemySpawnRuntime.ts` owns LDtk world enemy spawn parsing and placement.

Responsibilities:

- Spawn direct LDtk `Slime` entities.
- Spawn direct LDtk `Boss` entities with persistent boss keys and boss-lock activation.
- Spawn `Enemy_Spawn` entities through `createEnemy()`, preserving the default `Skeleton` type and `level` field.
- Skip bosses whose persistent boss key is already in `WorldProgressState.unlockedEvents`.
- Assign world position, `roomData`, and target player before registry insertion.
- Preserve `TargetDoor` / `targetDoor` link metadata on spawned enemies.

Boundaries:

- `WorldEnemyRegistry` still owns the active enemy array, entity-layer attachment, and lifecycle cleanup.
- `WorldBossLockRuntime` still owns lock collision and boss HP hide behavior; this runtime only decides when to activate it during spawn.
- `WorldEnemyKillRuntime` owns kill rewards/drops, boss-kill side effects, and kill analytics.
- `LdtkWorldScene` still owns enemy update order, body-contact damage, tile-hazard side effects, and deciding when to invoke kill handling.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
