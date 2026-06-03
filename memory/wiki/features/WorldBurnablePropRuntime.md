# WorldBurnablePropRuntime

`game/src/scenes/world/WorldBurnablePropRuntime.ts` owns LDtk world Tier B `BurnableProp` spawning and burned-out cleanup policy.

Responsibilities:

- Apply LDtk `BurnableZone` entities through `applyBurnableZones()` after the active collision grid is cloned.
- Instantiate returned `BurnableProp` specs, register them with `TileMutator`, and add them through `WorldBurnablePropRegistry`.
- Emit the debug `BurnableZone` spawn count when LDtk world debug mode is active.
- Update active burnable props each tile-hazard tick.
- Spawn ash remnants for destroyed non-ceiling props.
- Unregister props from `TileMutator` before removing them from the registry.

Boundaries:

- `WorldBurnablePropRegistry` owns the active list, entity-layer attachment, and Pixi cleanup.
- `WorldGrassFireRuntime` owns the ash manager instance; this runtime calls its `spawnAsh` callback for burned-out prop remnants.
- `LdtkWorldScene.tickTileHazards()` still owns the broader tile-hazard order: `TileMutator.tick()`, burnable-prop update, grass fire update, breakable-prop burnout, overlay render, wall rerender/fluid refresh, then player/enemy hazard damage.

Prevention rules:

- Do not instantiate `BurnableProp` or call `applyBurnableZones()` directly in `LdtkWorldScene`.
- Do not add a scene-owned `burnableProps` getter or array back to `LdtkWorldScene`.
- Keep `TileMutator.registerBurnable()` / `unregisterBurnable()` paired in this runtime so fire spread does not keep stale entity references.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
