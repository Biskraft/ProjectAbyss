# WorldEnemySpawnRuntime

`game/src/scenes/world/WorldEnemySpawnRuntime.ts` owns LDtk world enemy spawn parsing and placement.

Responsibilities:

- Spawn direct LDtk `Slime` entities.
- Spawn direct LDtk `Boss` entities with persistent boss keys and boss-lock activation.
- Spawn `Enemy_Spawn` entities through `createEnemy()`, preserving the default `Skeleton` type and `level` field.
- Skip bosses whose persistent boss key is already in `WorldProgressState.unlockedEvents`.
- Assign world position, `roomData`, and target player before registry insertion.
- Reuse the runtime-level `EnemySpawnInitializationDeps` adapter when calling `initializeEnemySpawnedEntity()` so position/grid/target initialization stays aligned with Item World.
- Preserve `TargetDoor` / `targetDoor` link metadata on spawned enemies.

Boundaries:

- `WorldEnemyRegistry` still owns the active enemy array, entity-layer attachment, and lifecycle cleanup.
- `WorldBossLockRuntime` still owns lock collision and boss HP hide behavior; this runtime only decides when to activate it during spawn.
- `WorldEnemyUpdateRuntime` owns the per-frame enemy `update(dt)` iteration loop.
- `WorldEnemyCombatRuntime` owns player-attack-to-enemy hit resolution and attack-hit feedback.
- `WorldEnemyRenderRuntime` owns the enemy `render(alpha)` iteration loop.
- `WorldEnemyKillRuntime` owns kill rewards/drops, boss-kill side effects, and kill analytics.
- `WorldEnemyContactRuntime` owns LDtk world body-contact damage orchestration through `EnemyContactDamageHelpers`.
- `LdtkWorldScene` still owns enemy runtime invocation order, tile-hazard side effects, and deciding when to invoke update/combat/kill/contact handling.

Updates:

- 2026-06-05: LDtk world body-contact damage moved from `LdtkWorldScene` into `WorldEnemyContactRuntime`; spawn/runtime boundaries stay unchanged.
- 2026-06-05: LDtk world player attack hit resolution moved from `LdtkWorldScene` into `WorldEnemyCombatRuntime`; spawn/runtime boundaries stay unchanged.
- 2026-06-05: LDtk world enemy `update(dt)` iteration moved from `LdtkWorldScene` into `WorldEnemyUpdateRuntime`; spawn/runtime boundaries stay unchanged.
- 2026-06-05: LDtk world enemy `render(alpha)` iteration moved from `LdtkWorldScene` into `WorldEnemyRenderRuntime`; spawn/runtime boundaries stay unchanged.
- 2026-06-05: Shared enemy spawn initialization now calls `Enemy.bindSpawnContext(...)` instead of writing `roomData` and `target` separately from helper code.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
