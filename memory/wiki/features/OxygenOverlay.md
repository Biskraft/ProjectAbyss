# Oxygen Overlay

## Current State

- World and Item World scenes share `game/src/ui/OxygenOverlay.ts` for the submerged oxygen vignette and bottom-center oxygen bar.
- `OxygenOverlay` lazily creates its `Graphics` children under `game.legacyUIContainer`, hides them when oxygen UI is not needed, and destroys them explicitly on scene destroy.
- `LdtkWorldScene.sleep()` hides the overlay before the scene is backgrounded for Item World entry so external UI graphics do not leak over the pushed scene.

## Prevention Rules

- Do not reintroduce per-scene `oxygenOverlay` / `oxygenBar` `Graphics` fields. Add visual changes to `OxygenOverlay` so World and Item World remain consistent.
- If a scene using `OxygenOverlay` is pushed behind another scene, call `hide()` before backgrounding and `destroy()` when the scene is destroyed.
