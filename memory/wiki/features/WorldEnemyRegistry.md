# WorldEnemyRegistry

`game/src/scenes/world/WorldEnemyRegistry.ts` owns the LDtk world enemy array lifecycle.

Current state:

- The registry owns the active `Enemy<string>[]` list, entity-layer attachment for newly spawned enemies, remove-at cleanup, clear cleanup, alive-count queries, and simple proximity queries such as `hasAliveWithin()`.
- Enemy list add/attach, remove-at detach/splice, clear detach lifecycle, and simple list queries are shared through `game/src/scenes/shared/EnemyRegistryHelpers.ts`.
- `WorldEnemySpawnRuntime` owns LDtk enemy spawn parsing, placement, target-door metadata, and boss-lock activation decisions during spawn.
- `WorldEnemyUpdateRuntime` owns the per-frame enemy `update(dt)` iteration loop.
- `WorldEnemyCombatRuntime` owns player-attack-to-enemy hit resolution and attack-hit feedback.
- `getAliveEnemiesAsCombatTargets(...)` in `EnemyRegistryHelpers` is used by combat callers for alive-combat-target extraction with optional per-call filters.
- `WorldEnemyRenderRuntime` owns the enemy `render(alpha)` iteration loop.
- `WorldEnemyKillRuntime` owns enemy kill rewards/drops, boss-kill side effects, and kill analytics.
- `WorldEnemyContactRuntime` owns LDtk world body-contact damage orchestration through `EnemyContactDamageHelpers`.
- `LdtkWorldScene` still owns enemy runtime invocation order, tile-hazard side effects, and deciding when to invoke update/combat/kill/contact handling.
- `LdtkWorldScene` currently keeps a private compatibility getter for read/iteration paths, but the backing array is registry-owned.

Prevention rules:

- Do not add a scene-owned `enemies` array back to `LdtkWorldScene`.
- Use `WorldEnemyRegistry.add()` for new world enemies so visual attachment and list ownership stay together.
- Use `removeAt()` / `clear()` for lifecycle cleanup instead of manually removing enemy containers and splicing arrays in the scene.
- Use `hasAliveWithin()` for simple enemy proximity checks instead of adding scene-local loops.
- Route kill rewards/drops through `WorldEnemyKillRuntime`; the registry is only list/lifecycle/query ownership.
- Do not move spawn parsing, boss metadata, kill rewards, contact damage, combat, or tile-hazard policy into `EnemyRegistryHelpers`; it should stay a list/container lifecycle/query helper.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.

- 2026-06-05: `EnemyRegistryHelpers` now delegates enemy container detach paths to `DisplayObjectLifecycleHelpers.detachDisplayObject()`; add/remove/clear list ownership and spawn/combat boundaries remain unchanged.
- 2026-06-05: LDtk world body-contact damage moved from `LdtkWorldScene` into `WorldEnemyContactRuntime`, using the shared `EnemyContactDamageHelpers` path already used by Item World contact damage.
- 2026-06-05: LDtk world player attack hit resolution moved from `LdtkWorldScene` into `WorldEnemyCombatRuntime`; registry remains list/lifecycle/query ownership only.
- 2026-06-05: LDtk world enemy `update(dt)` iteration moved from `LdtkWorldScene` into `WorldEnemyUpdateRuntime`; scene still owns runtime invocation order.
- 2026-06-05: LDtk world enemy `render(alpha)` iteration moved from `LdtkWorldScene` into `WorldEnemyRenderRuntime`; scene still owns render alpha resolution and broader render order.
- 2026-06-05: `LdtkWorldScene` no longer exposes a private `enemies` pass-through getter; dependency wiring now references `WorldEnemyRegistry.enemies` directly.
