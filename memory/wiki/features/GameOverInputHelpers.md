# GameOverInputHelpers

`game/src/scenes/shared/GameOverInputHelpers.ts` owns mode-neutral game-over respawn input predicates.

- `isGameOverRespawnPressed()` returns true for `GameAction.ATTACK` or `GameAction.JUMP` via `InputPressHelpers.isAnyJustPressedAction()`.
- Used by legacy procedural `WorldScene` and LDtk `WorldGameOverRuntime`.
- UI copy/key-label rendering remains owned by each overlay/runtime because the legacy and LDtk game-over screens use different localization keys and colors.

Prevention rule: do not duplicate `ATTACK || JUMP` game-over respawn checks in world scenes or game-over runtimes; use `isGameOverRespawnPressed()`.
