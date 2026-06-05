# Item World Return Fade Runtime

## Current State

- `game/src/scenes/world/ItemWorldReturnFadeRuntime.ts` owns the LDtk world Item World return fade overlay graphics and 500 ms fade timer.
- `LdtkWorldScene` still owns `normalizeWorldVisualsAfterItemWorldReturn()` and calls `ItemWorldReturnFadeRuntime.start()` after world visuals are normalized.
- The overlay is attached to `game.legacyUIContainer`, so `LdtkWorldScene.destroy()` explicitly destroys the runtime.
- `WorldItemWorldSceneTransitionRuntime` requires a `startReturnFade` dependency. `LdtkWorldScene` wires it to this runtime; legacy `WorldScene` passes an explicit no-op because it does not use the LDtk return fade.

## Prevention Rules

- Do not reintroduce Item World return fade overlay/timer fields directly into `LdtkWorldScene`.
- Do not destroy the runtime in `exit()` when the world scene is merely covered by Item World; destroy it only with the scene.
- Keep world visual normalization in `LdtkWorldScene` unless the full Item World return pipeline is intentionally refactored.
- Do not make the shared transition runtime silently skip return fade through an optional dependency; callers should make the fade/no-fade policy explicit.
