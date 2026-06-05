# WorldBuilderEntitySpawnHelpers

## Current State

- `game/src/scenes/world/WorldBuilderEntitySpawnHelpers.ts` owns ordered dispatch of builder LDtk entities to spawn handlers.
- `WorldBuilderFlowRuntime` supplies the handler list so builder item/static/switch/entrance/anvil/sprite spawn policy remains in the dedicated runtimes.

## Boundaries

- Handler order is behavior: the first handler returning `true` claims an entity.
- Do not move entity-specific spawn predicates into this helper.
- Keep `WorldBuilderFlowRuntime` as the orchestration owner for builder spawn lifecycle.

## Verification

- 2026-06-05: `npx tsc --noEmit` and `npm run build` passed from `game/`; build retained only the known LDtk/CSV `atlas/prologue_01.png` warning.
