---
feature: GiantBuilder iPad Performance
status: active
last_updated: 2026-05-27
---
# GiantBuilder iPad Performance

## Context

- Symptom: iPad shipping build could return to title a few seconds after the first GiantBuilder encounter.
- Likely cause: iPadOS Safari WebGL memory pressure. Large builder levels can instantiate thousands of tile sprites plus BuilderInterior/BuilderOutside/decorator layers and full-size filter passes. This can look like a page reload/title return rather than a handled game exception.

## Current Rule

- `game/src/utils/deviceProfile.ts` detects touch Apple devices and enables a reduced builder visual profile.
- `game/src/Game.ts` forces `uiScale` to 1 on that profile so iPad devices use the smallest world/UI render targets.
- `game/src/main.ts` skips startup preloading of both `core` and `item_world` bundles on that profile; assets load on demand instead.
- `game/src/scenes/ItemWorldScene.ts` awaits `loadBundleOnce('item_world')` during scene init, so deferred Item World assets load while the entry fade is already black.
- `game/src/level/ParallaxBackground.ts` uses gradient-only parallax on that profile and does not load parallax image textures.
- `game/src/scenes/LdtkWorldScene.ts` passes `reducedVisualCost` to `GiantBuilder`.
- `game/src/entities/GiantBuilder.ts` keeps collision, movement, lights, and gameplay entities, but skips BuilderInterior/BuilderOutside/extra interior/decorator/shadow rendering, disables builder filter/glow passes, and omits leg art on the reduced profile.
- `game/src/entities/LegRig.ts` does not load the builder leg atlas when there are no leg mounts, preventing unnecessary GPU texture allocation on the reduced profile.

## Prevention

- Do not add new full-builder filter passes or hidden duplicate builder tile layers without checking iPad Safari memory behavior.
- Prefer gameplay-preserving reduced profiles for mobile Safari before adding another always-on render layer.

## Verification

- 2026-05-26: `npx tsc --noEmit` passes.
- 2026-05-26: `npm run build` from `game/` passes. Remaining warnings are the existing LDtk/CSV tileset divergence warnings.
- 2026-05-27: `npx tsc --noEmit` and `npm run build` from `game/` pass after adding iPad `uiScale` cap and deferred Item World startup preload.
- 2026-05-27: `npx tsc --noEmit` and `npm run build` from `game/` pass after escalating to `uiScale=1`, no startup bundle preload, gradient-only parallax, no builder shadow layer, and no builder leg art on the reduced profile.
