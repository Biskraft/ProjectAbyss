# Item World Return Fade Runtime

## Current State

- `game/src/scenes/world/ItemWorldReturnFadeRuntime.ts` owns the LDtk world Item World return fade overlay graphics and 500 ms fade timer.
- `LdtkWorldScene` still owns `normalizeWorldVisualsAfterItemWorldReturn()` and calls `ItemWorldReturnFadeRuntime.start()` after world visuals are normalized.
- The overlay is attached to `game.legacyUIContainer`, so `LdtkWorldScene.destroy()` explicitly destroys the runtime.

## Prevention Rules

- Do not reintroduce Item World return fade overlay/timer fields directly into `LdtkWorldScene`.
- Do not destroy the runtime in `exit()` when the world scene is merely covered by Item World; destroy it only with the scene.
- Keep world visual normalization in `LdtkWorldScene` unless the full Item World return pipeline is intentionally refactored.
