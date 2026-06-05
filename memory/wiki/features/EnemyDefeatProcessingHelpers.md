# EnemyDefeatProcessingHelpers

`game/src/scenes/shared/EnemyDefeatProcessingHelpers.ts` owns small shared enemy defeat/removal iteration helpers.

- `processEnemyPostDefeats(...)` handles post-defeat one-shot processing for runtimes that update enemies elsewhere and use `_postDefeatHandled` metadata.
- `updateEnemyDefeatLifecycle(...)` handles legacy procgen `WorldScene`'s back-to-front enemy update loop: update each enemy, call a caller-supplied just-died callback when an enemy crosses alive -> dead during that update, then call caller-supplied removal.

Boundaries:

- Reward drops, analytics, boss flow, room clear, EXP, and entity-layer ownership remain caller/runtime-owned.
- Do not move drop/analytics policy into this helper; it should stay limited to iteration, just-died detection, and removal callback ordering.
