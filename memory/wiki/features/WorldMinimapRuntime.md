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

## 2026-06-17 - Fixed exploration viewport

- World HUD minimap now uses a fixed exploration viewport instead of fitting the current map/world extents into the frame.
- The viewport is player-centered and always covers `40x24` tiles (`MINIMAP_VIEW_TILES_X/Y` in `game/src/scenes/world/WorldMinimapRuntime.ts`).
- The minimap uses a square cell size fitted into the HUD frame with horizontal padding, so large and small rooms render at the same spatial scale.
- The minimap content redraws when the player's world tile changes; the blinking player dot still updates per frame.
- Prevention rule: do not derive world minimap scale from full room/map dimensions. Full-map fit belongs to world map overlays, not the HUD minimap.

## 2026-06-17 - Smooth fixed viewport scrolling

- Fixed exploration viewport remains `40x24` tiles, but content no longer redraws on player tile changes.
- Room/tile/marker graphics are drawn once in minimap world-space coordinates.
- Per-frame update moves the content layer by continuous player pixel position, keeping the player dot centered and eliminating tile-step jitter.
