# ConfirmCancelInputHelpers

`game/src/scenes/shared/ConfirmCancelInputHelpers.ts` owns the shared `ATTACK` confirm / `MENU` cancel input order for simple modal runtimes.

- `updateConfirmCancelInput()` checks `GameAction.ATTACK` before cancel actions, matching the previous direct runtime order.
- Default cancel action is `GameAction.MENU`; callers can pass `cancelActions` when a modal has extra cancel inputs such as `JUMP`.
- Used by `ItemWorldBossChoiceRuntime`, `AnvilCyclePromptRuntime`, `ItemWorldStratumPickerRuntime`, and visible `ItemWorldEscapeRuntime` confirm/cancel handling.
- Callers still own visibility gating, input consumption policy, UI lifetime, toasts, placement, and gameplay callbacks.

Prevention rule: for simple confirm/cancel modals that use `ATTACK` as confirm and one or more cancel actions without extra pressed-state animation needs, use `updateConfirmCancelInput()` instead of duplicating direct `isJustPressed` branches.
