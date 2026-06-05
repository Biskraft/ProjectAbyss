# InventoryUiInputHelpers

`game/src/scenes/shared/InventoryUiInputHelpers.ts` owns shared inventory toggle and grid input routing.

- Used by legacy `WorldScene` and LDtk `WorldUiController` inventory toggle/input paths.
- `handleInventoryUiToggle()` centralizes `GameAction.INVENTORY` press/consume/toggle handling through `InputPressHelpers.consumeJustPressedAction()` while callers keep their own visibility/HUD side effects.
- Preserves the previous independent input order: filter, left, right, up, down, attack, then menu.
- Callers still own context-specific side effects such as equipment stat refresh, HUD count text, input consumption, and Identity Archive routing.

Prevention rule: do not duplicate inventory toggle/filter/navigation/attack/menu `GameAction` mapping in world scenes or controllers; use `handleInventoryUiToggle()` / `updateInventoryUiInput()` and keep scene-specific behavior in callbacks.
