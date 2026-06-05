# DisplayObjectLifecycleHelpers

- `game/src/scenes/shared/DisplayObjectLifecycleHelpers.ts` is the shared Pixi display-object lifecycle helper module.
- Use `attachDisplayObjectIfMissing()` when a reusable optional UI object should be added only if it is currently detached.
- Use `detachDisplayObject()` when an object should leave its parent but remain reusable.
- Use `detachNullableDisplayObject()` when optional UI references should be detached but not destroyed.
- Use `destroyDisplayObject()` or `destroyNullableDisplayObject()` when the object should be removed and destroyed. `destroyNullableDisplayObject()` returns `null` so owner fields can be cleared in the same assignment.
- Use `setDisplayObjectVisible()` and `hideDisplayObject()` for nullable prompt/UI containers instead of repeating `if (obj) obj.visible = ...`.
- Prompt and overlay owners should keep their creation/placement policy local, but route common nullable hide/destroy mechanics through these helpers.
- `destroyNullableDisplayObject()` is used by prompt/overlay runtimes including `ItemWorldContainerPromptRuntime`, `ItemWorldWorldPromptRuntime`, `AnvilPromptController`, `WorldFrozenReturnRuntime`, `WorldGameOverRuntime`, `WorldIntroHandoffRuntime`, `ItemWorldStratumPickerRuntime`, and `ItemWorldUiController`.
- `WorldUiController` and `ItemWorldUiController` use nullable detach/visible helpers for optional minimap, fade overlay, and modal prompt references while preserving ownership-specific close/destroy calls.
- `WorldUiController`, `AnvilPromptController`, `ItemWorldWorldPromptRuntime`, and `ItemWorldUiController` use `attachDisplayObjectIfMissing()` for reusable UI containers that may be detached and later reattached.
- `ItemWorldDevOverlayRuntime` and `SavePointRuntime` use nullable destroy/detach/hide helpers for optional debug overlays and optional save-point prompt/sprite references.

- 2026-06-05: game/src/effects/EchoPlayer.ts now routes optional sprite/aura teardown through destroyNullableDisplayObject; generated texture cleanup remains direct destroy(true) because it is not a display object.

- 2026-06-05: game/src/effects/ItemWorldForgeBirth.ts now clears replaceable item/mask sprites through destroyNullableDisplayObject; texture ownership remains separate.
- 2026-06-05: game/src/ui/StratumClearOverlay.ts now routes particle graphics teardown through destroyDisplayObject; ItemImage.destroy() remains owner-specific cleanup.

- 2026-06-05: game/src/entities/Building.ts, Anvil.ts, Altar.ts, and ItemDisplay.ts now route simple owned Sprite/Graphics teardown through display lifecycle helpers while preserving entity/runtime destroy boundaries.
- 2026-06-05: game/src/scenes/world/ItemWorldGrowthSnapshotController.ts now clears replacement item sprites through destroyNullableDisplayObject; render texture cleanup remains direct texture ownership.

- 2026-06-05: game/src/effects/WeatherSystem.ts now routes splash-pool overflow sprite teardown through destroyDisplayObject; pooled reuse still detaches sprites instead of destroying them.
