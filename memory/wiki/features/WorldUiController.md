# WorldUiController

`game/src/scenes/world/WorldUiController.ts` owns LDtk world shared UI input routing.

- Handles pause/death input routing, world-map toggle/update, inventory input, persistent toast/tutorial updates, and Item World UI detach.
- Pause state should be derived from `PauseMenu.visible`; do not add a separate `LdtkWorldScene.isPaused` flag.
- Pause open/close callbacks are optional and only needed when a caller has extra side effects.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.

- 2026-06-05: Item World detach and controller destroy paths now route external UI container removal through detachDisplayObject(); HUD/minimap/world-map/inventory/pause/death containers remain non-destructively detached.
- 2026-06-05: World-map toggle now uses `InputPressHelpers.consumeJustPressedAction()` for the `MAP` press/consume gate; map visibility, HUD/minimap visibility, and open callback ordering remain controller-owned.
- 2026-06-05: Inventory Identity Archive `JUMP` entry and inventory `ATTACK/MENU` callback consumption now also route through `InputPressHelpers.consumeJustPressedAction()`; archive visibility guards and InventoryUI behavior remain controller-owned.
- 2026-06-05: Identity Archive and pause menu direction routing now use `DirectionalInputHelpers.updateVerticalFirstDirectionalInput()` for the shared up/down/left/right order. Inventory keeps its separate left/right-first helper.
