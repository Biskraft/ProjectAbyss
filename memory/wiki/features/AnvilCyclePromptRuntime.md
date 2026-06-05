# Anvil Cycle Prompt Runtime

## Current State

- `LdtkWorldScene` delegates cleared-item re-dive confirmation UI to `game/src/scenes/world/AnvilCyclePromptRuntime.ts`.
- The runtime owns the active item, modal container lifetime, confirm/cancel input, cycle reset, and anvil/altar return callbacks.
- `LdtkWorldScene` still owns the actual item placement path through `placeItemOnAnvil()` so anvil state, save flags, UI hiding, and entry transition ordering remain centralized.

## Prevention Rules

- Do not reintroduce `cyclePromptItem`, `cyclePromptUI`, or cycle-prompt draw/input methods directly into `LdtkWorldScene`.
- Keep player-facing prompt strings on localization keys; the runtime should use `t()` and existing key labels from `InputManager`.
- Destroy or close the runtime when the world scene exits because the modal is attached to `legacyUIContainer`, which outlives the scene container.

- 2026-06-05: Owned modal cleanup now uses `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })`; active-item/input/callback ownership remains runtime-local.
- 2026-06-05: Confirm/cancel input now routes through `ConfirmCancelInputHelpers.updateConfirmCancelInput()`; active-item, cycle reset, toast, placement, and close-menu callbacks remain runtime-owned.
