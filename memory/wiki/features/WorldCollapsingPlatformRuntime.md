# WorldCollapsingPlatformRuntime

`game/src/scenes/world/WorldCollapsingPlatformRuntime.ts` owns LDtk world `CollapsingPlatform` spawning and per-frame collapse policy.

Responsibilities:

- Spawn authored LDtk `CollapsingPlatform` entities into the active collision grid.
- Skip non-respawning platforms whose persistent collapse key is already unlocked.
- Update all registered platforms, including builder-spawned platforms.
- Start platform shaking when the player stands on top.
- Refresh builder stamps when a platform changes state and mutates a builder collision grid.
- Persist and remove non-respawning platforms after they collapse.

Boundaries:

- `WorldCollapsingPlatformRegistry` owns the active list, entity-layer attachment, collision-grid lookup, and per-platform metadata.
- Builder-spawned `CollapsingPlatform` creation lives in `WorldBuilderStaticEntityRuntime` because it needs builder attachment wiring; those platforms still register with this runtime through the shared registry.
- `CollapsingPlatform` exposes `getState()` so runtime code does not read private state through `any`.

Prevention rules:

- Do not add scene-owned `collapsingPlatforms` or `collapsingPlatformCollisionGrids` back to `LdtkWorldScene`.
- Register every platform through `WorldCollapsingPlatformRegistry.add(platform, grid, layer, meta)` after injecting collision into that same grid.
- Do not duplicate builder platform construction in `LdtkWorldScene.spawnBuilderEntities()`; use `WorldBuilderStaticEntityRuntime` for builder-mounted platform creation and attachment.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
