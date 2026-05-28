---
feature: GiantBuilder iPad Performance
status: rolled_back
last_updated: 2026-05-27
---
# GiantBuilder iPad Performance

## Context

- Symptom: iPad shipping build could return to title a few seconds after the first GiantBuilder encounter.
- Likely cause: iPadOS Safari WebGL memory pressure. Large builder levels can instantiate thousands of tile sprites plus BuilderInterior/BuilderOutside/decorator layers and full-size filter passes. This can look like a page reload/title return rather than a handled game exception.

## Current Rule

- The touch-Apple/iPad reduced visual profile is disabled and its device-profile helper was removed.
- iPad now uses the same `uiScale`, startup bundle preload, GiantBuilder rendering, ItemWorld filters, parallax, leg art, procedural builder decoration, auto-foot anchors, and glow passes as other devices.
- Prior reduced-profile attempts made builder visuals incomplete and still failed during builder encounters, so future iPad work should use structural rendering changes instead of deleting authored visual layers.

## Prevention

- Do not remove authored builder tile layers or palette/color grading as an iPad optimization; those are part of the playable silhouette/readability baseline.
- Do not add new full-builder filter passes or hidden duplicate builder tile layers without checking iPad Safari memory behavior.
- Prefer gameplay-preserving reduced profiles for mobile Safari before adding another always-on render layer.
- If iPad optimization resumes, prefer builder bake/batch/render-texture work over device-specific visual removal.

## Verification

- 2026-05-26: `npx tsc --noEmit` passes.
- 2026-05-26: `npm run build` from `game/` passes. Remaining warnings are the existing LDtk/CSV tileset divergence warnings.
- 2026-05-27: `npx tsc --noEmit` and `npm run build` from `game/` pass after adding iPad `uiScale` cap and deferred Item World startup preload.
- 2026-05-27: `npx tsc --noEmit` and `npm run build` from `game/` pass after escalating to `uiScale=1`, no startup bundle preload, gradient-only parallax, no builder shadow layer, and no builder leg art on the reduced profile.
- 2026-05-27: parallax image layers restored on iPad; `npx tsc --noEmit` and `npm run build` from `game/` pass.
- 2026-05-27: Builder LDtk-authored visual layers and palette/color grading restored on iPad; `npx tsc --noEmit` and `npm run build` from `game/` pass.
- 2026-05-27: iPad reduced visual profile fully rolled back; `npx tsc --noEmit` and `npm run build` from `game/` pass.
