# WorldSacredPickupRuntime

`game/src/scenes/world/WorldSacredPickupRuntime.ts` owns LDtk world sacred-pickup cutscene policy and UI blocking.

Current state:

- `startPickup(item, x, y)` owns first-pickup marking, first-seen pulse selection, LorePopup scheduling, and Ego wake event marking.
- `update(dt)` owns Rustborn pre-pickup discovery, `WeaponPulse` lifetime/update, active anvil tether endpoint updates, LorePopup confirm input, AcquireOverlay updates, DivePreview confirm/cancel input, and discovery dialogue release.
- `isInventoryHintBlocked()` centralizes the cutscene/modal conditions that delay inventory tutorial hints.
- `applyCameraZoomOverride()` applies the active pickup pulse zoom while the scene keeps camera/weather/update ordering.
- The runtime uses getters for player, drops, lore UI, and unlocked events so respawn/save-load replacement remains visible.
- First-time pickup/first-seen bookkeeping are injected through callbacks (`isFirstPickupDone`, `markFirstPickupDone`, `hasSeenItem`, `markItemSeen`) to avoid save import coupling.
- LorePopup and DivePreview `ATTACK` press/consume gates use `InputPressHelpers.consumeJustPressedAction()`; LorePopup still checks `canConfirm()` before confirm side effects, and DivePreview `MENU/DASH` cancel uses `InputPressHelpers.isAnyJustPressedAction()` so it remains non-consuming.

Prevention rules:

- Do not reintroduce `sacredPickupFlow()`, `updateSacredPickup()`, or `showAcquireOverlay()` methods to `LdtkWorldScene`.
- Keep mutable cutscene fields in `WorldSacredPickupState`; this runtime owns policy and updates, not state storage.
- Keep AcquireOverlay lifetime in `WorldAcquireOverlayRuntime`; SacredPickup only delegates update/show through that runtime.
- Keep anvil target resolution in `AnvilItemWorldReturnState` and pass it as a callback.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
