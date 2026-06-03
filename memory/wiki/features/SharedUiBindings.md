# Shared UI Bindings

## Current State

- `game/src/ui/GamepadToastBinding.ts` owns gamepad connect/disconnect toast wiring for World, LDtk World, and Item World scenes.
- `game/src/ui/ItemWorldLeaveConfirmPanel.ts` owns the shared Item World leave-confirm modal used by both `ItemWorldUiController` and the LDtk frozen-return confirm path.
- `game/src/ui/LowHpHealHintRuntime.ts` owns the shared low-HP heal tutorial cue for LDtk World and Item World, including the `PlayerSave` one-shot flag.
- Scenes keep the returned unsubscribe function in their existing `_gpUnsub` field and call it during teardown.
- `WorldUiController` receives `getMinimap()` instead of a captured minimap container because the LDtk world minimap is redrawn/replaced by `WorldMinimapRuntime`.

## Prevention Rules

- Do not duplicate `game.gamepad.onConnectEvent` / `onDisconnectEvent` toast wiring inside scenes. Use `attachGamepadToast(game, toast)` so localization, brand labels, and colors stay consistent.
- Do not duplicate Item World leave-confirm panel drawing in scenes; use `createItemWorldLeaveConfirmPanel()` so the glyph row, summary text, and 9-slice fallback stay consistent.
- Do not duplicate the low-HP heal hint threshold or `PlayerSave` one-shot checks in scenes; use `LowHpHealHintRuntime`.
- Do not pass recreated UI containers as fixed constructor values when the controller must follow redraws. Use a getter, matching the minimap binding.
