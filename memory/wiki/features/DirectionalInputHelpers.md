# DirectionalInputHelpers

`game/src/scenes/shared/DirectionalInputHelpers.ts` owns small reusable direction-input routing helpers.

- `updateVerticalFirstDirectionalInput()` checks `LOOK_UP`, `LOOK_DOWN`, `MOVE_LEFT`, then `MOVE_RIGHT`, invoking the supplied callbacks and returning whether one fired.
- Used by `WorldUiController` for Identity Archive navigation and pause menu navigation.
- Inventory grid navigation intentionally remains in `InventoryUiInputHelpers` because it preserves a different left/right-first order.

Prevention rule: only use this helper for UI routes whose previous order was up, down, left, right. Do not apply it to inventory grids or gameplay movement where ordering or simultaneous-input policy differs.
