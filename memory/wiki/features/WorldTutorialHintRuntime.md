# World Tutorial Hint Runtime

## Current State

- `game/src/scenes/world/WorldTutorialHintRuntime.ts` owns one-time LDtk world movement/combat tutorial progression for drop-through, jump, attack, and dash hints.
- `LdtkWorldScene` creates the shared `TutorialHint`, hydrates completed IDs from save data, then delegates normal hint timing/input state to the runtime.
- Inventory-return tutorial hints remain in `InventoryTutorialHintRuntime` because they depend on inventory/Rustborn/event state rather than movement context.

## Prevention Rules

- Do not reintroduce `dropThroughHintHandled`, `jumpHintHandled`, `hasMovedHorizontally`, `attackHintHandled`, or dash/jump delay fields directly into `LdtkWorldScene`.
- Keep save persistence in the shared `TutorialHint` completed-ID set; runtimes should drive `tryShow()`/`dismissAfter()` but not write save payloads.
- Route player drop-through completion through `WorldTutorialHintRuntime.handleDropThroughEvent()` so the hint and handled flag stay in sync.
