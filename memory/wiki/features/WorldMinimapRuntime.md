# World Minimap Runtime

## Current State

- `game/src/scenes/world/WorldMinimapRuntime.ts` owns the LDtk world HUD minimap container, room tile rendering, blinking player dot, combat opacity, and active builder dynamic IntGrid overlay.
- `LdtkWorldScene` calls `WorldMinimapRuntime.draw()` directly when a level redraws. It should not keep scene-local minimap wrapper methods.
- `WorldUiController` receives `getMinimap()` instead of a captured minimap container because the minimap is recreated when levels redraw.

## Prevention Rules

- Do not add `minimapDot`, viewport scale, blink timer, or builder minimap layer fields back to `LdtkWorldScene`.
- Do not add `drawMinimap()` or `updateMinimapBuilderLayer()` wrappers back to `LdtkWorldScene`; call the runtime API directly.
- If a UI controller needs the minimap, pass a getter; do not store a one-time container reference because `WorldMinimapRuntime.draw()` replaces the container.
- Keep active-builder minimap rendering dynamic and visited-room gated so pressing `M` only syncs builder IntGrid in visited rooms.

## Verification

- 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings after removing the remaining scene minimap wrappers.

- 2026-06-05: Minimap detach/destroy now uses DisplayObjectLifecycleHelpers.detachDisplayObject()/destroyDisplayObject(..., { children: true }); detach remains non-destructive for UI hide/reattach flows.
