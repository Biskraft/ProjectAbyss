# World Debug Warp Runtime

## Current State

- `game/src/scenes/world/WorldDebugWarpRuntime.ts` owns debug-only warp input for `?debug=1`: Backquote click-to-warp, ESC cancel, and Shift+M debug world-map entry.
- `LdtkWorldScene` provides scene-owned callbacks for `loadLevel()`, game-over revival, HUD visibility, and minimap visibility.
- The runtime owns the temporary warp hint `BitmapText`, canvas `pointerdown` listener, and crosshair cursor cleanup.

## Prevention Rules

- Do not add debug warp UI fields such as `warpModeActive`, `warpHintText`, or `warpClickHandler` back to `LdtkWorldScene`.
- Keep pointer listener and cursor cleanup in `WorldDebugWarpRuntime.destroy()` and call it from both scene `exit()` and `destroy()`.
- Keep room loading and game-over revival as scene callbacks; those mutate world scene state outside the debug input boundary.

## Verification

- 2026-06-02: `npx tsc --noEmit`, `npm run build`, and browser smoke at `/play/?debug=1` passed after extracting `WorldDebugWarpRuntime`; the smoke exercised Backquote, click-to-warp, ESC, and Shift+M with no console/page errors.

- 2026-06-05: Warp hint teardown now uses `DisplayObjectLifecycleHelpers.destroyDisplayObject()`; pointer listener and cursor cleanup remain owned by `deactivate()`.
- 2026-06-05: Shift+M debug world-map entry and MENU cancel now use `InputPressHelpers.consumeJustPressedAction()` for the press/consume gate; debug-enabled, item-tunnel, active-state, and world-map visibility guards remain runtime-owned.
