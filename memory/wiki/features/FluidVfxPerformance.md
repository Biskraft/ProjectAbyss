# Fluid VFX Performance

## Current Caps

- `SteamPuffManager` emits 3 puffs per spawn and caps active steam puffs at 80.
- `WaterSplashManager` emits 6 droplets per splash, caps active crowns at 24, and caps active droplets at 96.
- `TileMutator` passive cell-cell reactions cap generic steam VFX at 8 events/frame and large steam-burst VFX at 2 events/frame.
- Acid-water reactions still call `onAcidSteamBurst` for gameplay damage and knock-up; do not suppress that callback for VFX budgeting. Keep particle limiting inside VFX managers or pure VFX callbacks.

## 2026-05-28 Acid-Water Regression

Dense acid-water contact zones spawned generic steam plus three extra acid burst puffs per mutated acid cell, with no active particle cap. This could create enough Pixi `Graphics` objects to drop frames.

The current acid-water scene effect keeps the generic steam signal and adds only one toxic puff for the acid-specific burst.


## 2026-06-05

- game/src/effects/FluidSystem.ts uses clampEffect01(...) for the small-body ambient spring sizeFactor; do not change DEC-041 crest foam SSoT or the separated foam manager while doing numeric cleanup.
