# WorldEnemyRegistry

`game/src/scenes/world/WorldEnemyRegistry.ts` owns the LDtk world enemy array lifecycle.

Current state:

- The registry owns the active `Enemy<string>[]` list, entity-layer attachment for newly spawned enemies, remove-at cleanup, clear cleanup, alive-count queries, and simple proximity queries such as `hasAliveWithin()`.
- `WorldEnemySpawnRuntime` owns LDtk enemy spawn parsing, placement, target-door metadata, and boss-lock activation decisions during spawn.
- `WorldEnemyKillRuntime` owns enemy kill rewards/drops, boss-kill side effects, and kill analytics.
- `LdtkWorldScene` still owns enemy update order, combat hit resolution, body-contact damage, tile-hazard side effects, and deciding when to invoke kill handling.
- `LdtkWorldScene` currently keeps a private compatibility getter for read/iteration paths, but the backing array is registry-owned.

Prevention rules:

- Do not add a scene-owned `enemies` array back to `LdtkWorldScene`.
- Use `WorldEnemyRegistry.add()` for new world enemies so visual attachment and list ownership stay together.
- Use `removeAt()` / `clear()` for lifecycle cleanup instead of manually removing enemy containers and splicing arrays in the scene.
- Use `hasAliveWithin()` for simple enemy proximity checks instead of adding scene-local loops.
- Route kill rewards/drops through `WorldEnemyKillRuntime`; the registry is only list/lifecycle/query ownership.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
