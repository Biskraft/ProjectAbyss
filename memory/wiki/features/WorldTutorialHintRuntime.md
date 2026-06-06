# World Tutorial Hint Runtime

## Current State

- `game/src/scenes/world/WorldTutorialHintRuntime.ts` owns one-time LDtk world movement/combat tutorial progression for drop-through, jump, attack, and dash hints.
- `LdtkWorldScene` creates the shared `TutorialHint`, hydrates completed IDs from save data, then delegates normal hint timing/input state to the runtime.
- Inventory-return tutorial hints remain in `InventoryTutorialHintRuntime` because they depend on inventory/Rustborn/event state rather than movement context.

## Prevention Rules

- Do not reintroduce `dropThroughHintHandled`, `jumpHintHandled`, `hasMovedHorizontally`, `attackHintHandled`, or dash/jump delay fields directly into `LdtkWorldScene`.
- Keep save persistence in the shared `TutorialHint` completed-ID set; runtimes should drive `tryShow()`/`dismissAfter()` but not write save payloads.
- Route player drop-through completion through `WorldTutorialHintRuntime.handleDropThroughEvent()` so the hint and handled flag stay in sync.
- Jump/attack hint dismiss now routes through the runtime-local `dismissHandledHintWhenPressed()` helper so hint visibility checks, input checks, `dismissAfter()`, and handled-flag mutation stay paired.

- 2026-06-05: The jump hint is no longer gated by authored spawn-room climb coordinates. In the current start level, the first horizontal movement input starts a 1000ms runtime delay, then `hint_jump` is shown through the shared `TutorialHint`; keep this state inside `WorldTutorialHintRuntime`.


## 2026-06-05 - Jump hint moved out of WorldTutorialHintRuntime

- `hint_jump` no longer belongs to `game/src/scenes/world/WorldTutorialHintRuntime.ts`; world spawn movement no longer triggers jump tutorial timing.
- `WorldTutorialHintRuntime` remains responsible for drop-through and attack tutorial hint flow.
- `game/src/scenes/ItemWorldScene.ts` now starts a 1000ms jump tutorial timer after first Item World ground contact.
