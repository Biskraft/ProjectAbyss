# LegacyWorldGameOverHelpers

`game/src/scenes/shared/LegacyWorldGameOverHelpers.ts` owns small legacy procedural `WorldScene` game-over UI helpers.

- `createLegacyWorldGameOverOverlay()` builds the legacy procgen game-over overlay with the existing localization keys, colors, and positions.
- `GameOverInputHelpers.isGameOverRespawnPressed(...)` centralizes the shared ATTACK/JUMP respawn input predicate used by both legacy and LDtk world game-over paths.

Boundaries:

- `WorldScene` still owns `gameOverActive`, HUD low-HP reset timing, overlay attachment/detach policy, input polling timing, and actual player respawn placement.
- `WorldGameOverRuntime` remains the LDtk world owner for full game-over state and save-point recovery flow.
