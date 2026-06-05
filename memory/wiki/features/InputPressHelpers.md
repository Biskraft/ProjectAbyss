# InputPressHelpers

`game/src/scenes/shared/InputPressHelpers.ts` owns tiny mode-neutral input press utilities.

- `consumeJustPressedAction(input, action)` returns false when an action was not just pressed.
- When the action was just pressed, it consumes that action and returns true.
- `isAnyJustPressedAction(input, actions)` returns true when any supplied action was just pressed without consuming input.
- `consumePressedActionSnapshot(input, action, pressed)` consumes an action based on a previously captured pressed boolean, preserving call sites that must pass the same snapshot into UI update code before deciding whether to consume.
- `consumeAnyJustPressedAction(input, actions)` returns false when none of the supplied actions was just pressed; otherwise it consumes all supplied actions in list order and returns true.
- Used by world-map toggle, inventory toggle, Item World unavailable-input suppression, frozen-return confirm/cancel input, acquire overlay confirm, Item World anvil return, Item World trapdoor activation, debug-warp map/cancel input, interact dialogue activation, sacred LorePopup confirm, DivePreview confirm, and WorldUiController inventory/archive callbacks.

Prevention rule: for simple `isJustPressed(action)` followed immediately by `consumeJustPressed(action)` with no extra ordering requirements, use `consumeJustPressedAction()` instead of duplicating the two calls.

For modal cancel paths that first check a fixed action set and then intentionally consume the whole set, use `consumeAnyJustPressedAction()` to preserve the same consume-all policy.

For overlays that need a pressed snapshot before the chosen action is known, use `consumePressedActionSnapshot()` rather than re-reading input later in the frame.

For non-consuming multi-action predicates such as `ATTACK/JUMP` confirm or `MENU/DASH` cancel checks, use `isAnyJustPressedAction()`.
