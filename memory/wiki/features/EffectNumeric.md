# EffectNumeric

## 2026-06-05

- `game/src/effects/EffectNumeric.ts` owns tiny numeric helpers scoped to visual effects.
- Use `clampEffect01(value)` for effect-local visual progress/alpha/intensity clamps instead of repeating `Math.max(0, Math.min(1, value))`.
- Keep scene/runtime numeric helpers in `game/src/scenes/shared/NumericHelpers.ts`; do not make effects depend on scene-scoped helper modules for visual-only math.

- FluidResidue drop intensity, RimLightFilter alpha, VoidDrop fog band alpha, WorldPullIn progress clamps, ExitGlow visual alpha/proximity clamps, ItemWorldEntrySequence growth progress clamps, WeatherSystem density/intensity clamps, ItemWorldGhostOverlay scale-birth/tint clamps, ItemWorldForgeBirth formation/shard progress clamps, and FluidSystem ambient size-factor clamps use this helper.
