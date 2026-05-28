---
feature: BuilderEntrance VFX
status: active
last_updated: 2026-05-27
---
# BuilderEntrance VFX

## Current Rule

- LDtk `BuilderEntrance` entities spawn the same `ExitGlow` light-bleed and dust effect used by normal room openings.
- The entity is name-compatible with `BuilderEntity`/`builderEntity` aliases, but the behavior is generic and works in any world or builder level.
- `RightSide=false` anchors the effect on the entity's left side but emits it leftward; `RightSide=true` anchors it on the entity's right side but emits it rightward.
- Entity height controls the vertical span. The LDtk pivot is bottom-left, so runtime uses `px.y - height` as the top of the glow segment.

## Implementation Notes

- `game/src/scenes/LdtkWorldScene.ts` spawns host-level entrance glows from `spawnExitGlows()`.
- Builder-level entrance glows are spawned by `spawnBuilderEntities()` and are synced each tick with the moving `GiantBuilder`.
- Builder-level entrance glows also inherit the active builder's BuilderInterior dissolve alpha.
- `game/src/effects/ExitGlow.ts` exposes `setAnchor()` so moving entrances keep dust proximity and light anchors in sync.

## Verification

- 2026-05-27: `npx tsc --noEmit` passes.
- 2026-05-27: `npm run build` from `game/` passes. Remaining warnings are existing LDtk/CSV tileset divergence warnings plus the existing Vite large chunk warning.
