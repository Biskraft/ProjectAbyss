---
feature: GiantBuilder iPad Performance
status: active
last_updated: 2026-05-26
---
# GiantBuilder iPad Performance

## Context

- Symptom: iPad shipping build could return to title a few seconds after the first GiantBuilder encounter.
- Likely cause: iPadOS Safari WebGL memory pressure. Large builder levels can instantiate thousands of tile sprites plus BuilderInterior/BuilderOutside/decorator layers and full-size filter passes. This can look like a page reload/title return rather than a handled game exception.

## Current Rule

- `game/src/utils/deviceProfile.ts` detects touch Apple devices and enables a reduced builder visual profile.
- `game/src/Game.ts` caps `uiScale` at 2 on that profile so iPad Pro class devices do not allocate a 3x native canvas/render target.
- `game/src/main.ts` skips startup preloading of the `item_world` bundle on that profile.
- `game/src/scenes/ItemWorldScene.ts` awaits `loadBundleOnce('item_world')` during scene init, so deferred Item World assets load while the entry fade is already black.
- `game/src/scenes/LdtkWorldScene.ts` passes `reducedVisualCost` to `GiantBuilder`.
- `game/src/entities/GiantBuilder.ts` keeps collision, movement, legs, lights, and gameplay entities, but skips BuilderInterior/BuilderOutside/extra interior/decorator rendering and disables builder filter/glow passes on the reduced profile.

## Prevention

- Do not add new full-builder filter passes or hidden duplicate builder tile layers without checking iPad Safari memory behavior.
- Prefer gameplay-preserving reduced profiles for mobile Safari before adding another always-on render layer.

## Verification

- 2026-05-26: `npx tsc --noEmit` passes.
- 2026-05-26: `npm run build` from `game/` passes. Remaining warnings are the existing LDtk/CSV tileset divergence warnings.
- 2026-05-27: `npx tsc --noEmit` and `npm run build` from `game/` pass after adding iPad `uiScale` cap and deferred Item World startup preload.
