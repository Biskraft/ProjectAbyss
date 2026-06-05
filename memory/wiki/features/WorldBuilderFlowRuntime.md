# WorldBuilderFlowRuntime

`game/src/scenes/world/WorldBuilderFlowRuntime.ts` owns lifecycle orchestration for builder-level gameplay flow in `LdtkWorldScene`.

## Responsibilities

- Spawn a builder from an LDtk `BuilderSpawner` entity, including:
  - resolving builder level route/spawn configuration,
  - applying visual/filter setup,
  - placing the builder in scene layers,
  - restoring persisted builder snapshots or initializing one-shot runs.
- Clear builder lifecycle, including:
  - saving active builder state,
  - clearing builder attachments/weather/weather effects,
  - un-stamping tiles and removing active collider/entry glow state.
- Keep builder attachment/runtime state in sync during movement (`syncBuilderAttachments`).
- Provide atmosphere target containers and entrance glow propagation (`setBuilderEntranceGlowAlpha`).
- Delegate builder-specific entity spawning (`Item`, static entities, anvil, switches, sprites, entrances) to the dedicated builder runtimes.
- Use `WorldBuilderEntitySpawnHelpers.dispatchBuilderEntities()` for ordered entity dispatch; the first handler returning `true` claims the entity.

## Interface contracts

- Scene is responsible for concrete container references, runtime instance references, and config access (`LdtkLevel` load).
- Runtime receives narrow accessors/delegates for all builder sub-runtimes and persistence/weather/state services.
- Scene owns timing/update loop and calls:
  - `spawnBuilderFromSpawner`,
  - `syncBuilderAttachments`,
  - `getBuilderAtmosphereTargets`,
  - `setBuilderEntranceGlowAlpha`,
  - `clearBuilder`.

## Current note

- This runtime should stay the only place that orchestrates builder spawner flow logic previously split across scene helper methods.
