# WorldSacredPickupState

`game/src/scenes/world/WorldSacredPickupState.ts` owns LDtk world sacred-pickup cutscene state.

- Owns pending lore popup item, active lore popup item, active weapon pulse, active anvil tether, pickup zoom override, and Rustborn discovery flags.
- `WorldSacredPickupRuntime` owns pickup policy, pulse/tether updates, LorePopup input, AcquireOverlay update delegation, DivePreview input, inventory-hint blocking predicates, and discovery dialogue dispatch.
- `LdtkWorldScene` still creates `LorePopup` / `DivePreview`, owns camera/weather/update ordering, and supplies anvil target resolution through `AnvilItemWorldReturnState`.
- Use `destroyActiveEffects()`, `clearWeaponPulse()`, and `clearAnvilTether()` instead of open-coded destroy/null/reset sequences.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
