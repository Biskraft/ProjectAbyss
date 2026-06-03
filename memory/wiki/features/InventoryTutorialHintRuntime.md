# InventoryTutorialHintRuntime

`game/src/scenes/world/InventoryTutorialHintRuntime.ts` owns LDtk world inventory tutorial hint state.

Current state:

- The runtime owns the first-pickup / first-Item-World-return pending hint state and delay timer.
- First Item World return hints are requested with `hadFirstBossClear`; the runtime reads `retireAfterFirstBoss`, blocking anvil item state, `Inventory`, and `unlockedEvents` through callbacks so respawn/save-load replacement stays visible.
- If the anvil still has a blocking placed/return item, the runtime defers the hint and later flushes it through `flushDeferredFirstItemWorldReturnHint(delayMs)`.
- `clearIfRustbornEquipped()` dismisses visible inventory hints, clears pending state, and stops the HUD item-key pulse when `sword_rustborn` is equipped.
- `LdtkWorldScene` should call this runtime directly; do not add scene-local wrapper methods for request/flush/clear.

Prevention rules:

- Do not put `pendingInventoryHint`, pending delay, or first Item World return hint flags back on `LdtkWorldScene`.
- Do not pass long-lived `Inventory` or `unlockedEvents` object references into this runtime; keep using getters.
- Keep the anvil retire/blocking-item predicates as callbacks into world state instead of duplicating anvil return state inside this runtime.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
