# AnvilPromptController

`game/src/scenes/world/AnvilPromptController.ts` owns LDtk world anvil prompt UI and its short suppress timer.

- Creates, positions, hides, and destroys anvil action/disabled prompts.
- Owns `suppressMs`; call `suppress(ms)` after reclaiming an item so the place/reclaim prompt does not immediately reappear.
- `WorldAnvilInteractionRuntime` owns prompt visibility policy, proximity checks, and strike detection.
- `WorldAnvilRetirementRuntime` owns post-boss retired/disabled policy.
- `LdtkWorldScene` still owns inventory opening, placement, deployment, and reclaim behavior.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.

- 2026-06-05: Action/disabled prompt replacement and destroy paths now route through `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })`; prompt visibility/proximity policy remains split between this controller and `WorldAnvilInteractionRuntime`.

- 2026-06-08: World anvil prompt visibility and ATTACK interaction now share LdtkWorldScene.getWorldAnvilInteractionBlockReason(). WorldAnvilInteractionRuntime asks the scene for the same block reason used by ProximityRouter, restores shared UI visibility before showing an available prompt, and logs [WorldAnvil] state changes in ?debug=1. This prevents anvil UI from staying hidden after dive/transition UI gates diverge from interaction availability.
