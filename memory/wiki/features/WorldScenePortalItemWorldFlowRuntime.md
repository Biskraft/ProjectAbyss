# WorldScenePortalItemWorldFlowRuntime

`game/src/scenes/world/WorldScenePortalItemWorldFlowRuntime.ts` owns the legacy `WorldScene` portal → `ItemWorldScene` entry orchestration.

Responsibilities:

- Resolve portal-entered item payload (already-prepared by `WorldScene.completePendingPortalEntry`) and inject it into an `ItemWorldSceneLike` scene via factory.
- Encapsulate portal return side-effects in `onComplete`, with shared return-completion semantics delegated through
  `applyItemWorldSceneCompletionLifecycle`:
  - scene pop
  - player attack refresh
  - weapon level-up toast
  - dungeon reward acquisition toast and pickup effect (for non-altar portals)
  - player ATK delta toast
  - progress auto-save
- Delegate entry transition visuals to `ItemWorldEntryPushTransition` (`alreadyBlack`/`revealMs` handling).
- Own only `preparePush` transition responsibility (Legacy `WorldScene` does not use shared return fade), passed through the runtime dependency.

Integration:

- `game/src/scenes/WorldScene.ts`:
  - Owns `ItemWorldEntryPushTransition` and `portalItemWorldFlowRuntime`.
  - Replaces direct `new ItemWorldScene` + `sceneManager.push` in `completePendingPortalEntry` with runtime invocation.
- This runtime complements `WorldItemWorldSceneFlowRuntime`:
  - it owns a procedural-mode `ItemWorldScene` entry strategy that does not require full LDtk world context.

Progress note:

- 2026-06-04: `WorldScenePortalItemWorldFlowRuntime` now captures `hadFirstBossClear` via injected save-state contract (`isFirstItemWorldBossDefeated`) and passes it into `applyItemWorldSceneCompletionLifecycle`, preserving compatibility with completion-result semantics used by other `ItemWorld` flows.
- 2026-06-05: Transition contract is explicit at the shared runtime boundary: legacy `WorldScene` passes a no-op `startReturnFade` because this path owns only `preparePush` and does not use LDtk `ItemWorldReturnFadeRuntime`.

Prevention rules:

- Keep world/scene transition side-effects in dedicated runtimes, not in ad-hoc `completePendingPortalEntry` logic.
- Avoid reintroducing direct `ItemWorldScene` push in `WorldScene` once this runtime is in place.
- Do not route this legacy flow through `WorldItemWorldSceneFlowRuntime` unless the full LDtk return context is introduced; its return completion intentionally remains local.
