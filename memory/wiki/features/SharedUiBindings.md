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

- 2026-06-05: WorldUiController detach/teardown paths now use DisplayObjectLifecycleHelpers.detachDisplayObject() for external UI containers; objects remain externally owned and are not destroyed.

## 2026-06-05 - ItemWorldUiController lifecycle cleanup

- `game/src/scenes/itemworld/ItemWorldUiController.ts` routes modal and overlay scene-graph cleanup through `DisplayObjectLifecycleHelpers`.
- Escape confirm and onboarding panels keep detach-only semantics; boss choice and return-result containers still destroy with children; `StratumClearOverlay.destroy()` remains the owner cleanup after container detach.
- Prevention rule: do not reintroduce inline `parent.removeChild(...)` in Item World UI controllers when `detachDisplayObject()` or `destroyDisplayObject()` preserves the same ownership semantics.

## 2026-06-05 - Reusable UI component teardown cleanup

- `AcquireOverlay`, `DivePreview`, `LorePopup`, `ItemImage`, `WorldMapOverlay`, and `FpsCounter` now route owned root-container teardown through `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })`.
- Prevention rule: for UI components that own a public `container`, prefer `destroyDisplayObject(container, { children: true })` over duplicating parent-detach plus destroy in `destroy()`.

- 2026-06-05: Additional UI component cleanup now routes through `DisplayObjectLifecycleHelpers` in `AreaTitle`, `StratumClearOverlay`, `OxygenOverlay`, and `TutorialHint`; `TutorialHint` preserves detach-only panel/container semantics while the other components keep owned destroy semantics. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: Pause/save modal panels and transient combat/toast UI now route repeated Pixi cleanup through `DisplayObjectLifecycleHelpers`; modal panels keep owned destroy semantics, toasts keep detach-only semantics, and damage numbers preserve clear-time destroy versus expiry detach. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: HUD skin redraw/reparent and Inventory chrome/title redraw cleanup now use `DisplayObjectLifecycleHelpers`; skin HUD icon/label paths keep detach-only semantics, while inventory frame/divider/title replacements keep prior destroy semantics. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: Legacy `WorldScene`, `ItemWorldScene`, and `LdtkWorldScene` scene-level Pixi cleanup now route through `DisplayObjectLifecycleHelpers`; shared HUD/minimap/inventory/lore/markers keep detach-only semantics, while altar UI and collision-debug HUD keep owned destroy semantics. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.

