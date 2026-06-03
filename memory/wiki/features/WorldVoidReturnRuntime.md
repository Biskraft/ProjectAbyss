# WorldVoidReturnRuntime

`game/src/scenes/world/WorldVoidReturnRuntime.ts` owns LDtk world void return-point resolution and teleport placement.

Responsibilities:

- Resolve void return positions from `WorldVoidRuntime`'s last safe point.
- Reject safe points that are inside the active Giant Builder volume or builder-stamped cells.
- Search the active collision grid for the nearest valid floor/body-clear fallback.
- Fall back to the LDtk `Player` entity, then the current player position.
- Teleport the player at full-black, reload the saved level when needed, reset velocity, restore `roomData`, save previous position, force the landed reveal pose, and snap the camera.
- Expose `isWorldFloorUnderPlayerAt()` so `LdtkWorldScene` can still decide when to record safe positions.

Boundaries:

- `WorldVoidRuntime` still owns void contact detection, fade timing, input lock, cooldown, and last-safe storage.
- `LdtkWorldScene` still owns `loadLevel()` itself; this runtime calls it through a callback.
- Builder stamp/volume data stays owned by `WorldBuilderStampRuntime` and the active `GiantBuilder`; this runtime only reads it.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
