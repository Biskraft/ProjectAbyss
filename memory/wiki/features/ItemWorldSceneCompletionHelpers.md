# ItemWorldSceneCompletionHelpers

- Purpose:
  - Centralize shared Item World completion flow behavior so return handling is consistent across anvil/portal/fixed/portal-entry paths.

- File:
  - `game/src/scenes/world/ItemWorldSceneCompletionHelpers.ts`

- Key contracts:
  - `applyItemWorldSceneCompletionRewards(...)`
    - Executes shared reward logic (level-up toast, dungeon-item toast, atk delta toast).
    - Returns `{ didGrantDungeonItem }`.
  - `applyItemWorldSceneCompletionLifecycle(...)`
    - Executes `completeReturn` first.
    - Runs reward logic next.
    - Calls `onAfterCompletion({ hadFirstBossClear, didGrantDungeonItem })`.

- Users:
  - `game/src/scenes/world/WorldAnvilItemWorldFlowRuntime.ts`
  - `game/src/scenes/world/WorldPortalItemWorldFlowRuntime.ts`
  - `game/src/scenes/world/WorldFixedItemWorldFlowRuntime.ts`
  - `game/src/scenes/world/WorldScenePortalItemWorldFlowRuntime.ts`

- Refactor guardrails:
  - Keep completion side effects in per-path `onAfterCompletion` callbacks.
  - Do not spread completion ordering logic across each flow runtime.
  - Do not bypass `hadFirstBossClear` contract; pass pre-entry state and let downstream code decide "first clear this run" from saved state transitions.
  - Use `createOneShotHandler(...)` when wiring `itemWorldScene.onComplete`/`completeFlow` in callers to guarantee callback-idempotence at the boundary.
