# World Game Over Runtime

## Current State

- `game/src/scenes/world/WorldGameOverRuntime.ts` owns the LDtk world custom game-over overlay, active state, ATTACK/JUMP respawn input, low-HP HUD reset before the overlay, and overlay teardown.
- `LdtkWorldScene` calls `WorldGameOverRuntime.show()` directly from death/drown handling; do not add a scene-local `showGameOver()` wrapper back.
- `LdtkWorldScene` still owns actual respawn/save-load recovery: inventory replacement, level reload, ability/progress restoration, player stat recalculation, and save point snapping.
- Debug warp receives game-over state through `WorldGameOverRuntime.isActive` and clears the overlay through the scene's `reviveFromGameOver()` callback.

## Prevention Rules

- Do not add `gameOverActive` or `gameOverOverlay` fields back to `LdtkWorldScene`; use `WorldGameOverRuntime`.
- Keep save-load respawn recovery in `LdtkWorldScene.respawnPlayer()` unless the save format and inventory replacement boundary are intentionally refactored.
- Call `WorldGameOverRuntime.destroy()` from scene teardown so the legacy overlay cannot leak into the next scene.

## Verification

- 2026-06-02: `npx tsc --noEmit`, `npm run build`, and browser smoke at `/play/?debug=1` passed after extracting `WorldGameOverRuntime`; the smoke also exercised debug warp input with no console/page errors.
