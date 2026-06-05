# WorldDialogueTriggerRuntime

`game/src/scenes/world/WorldDialogueTriggerRuntime.ts` owns LDtk-authored `Dialogue` and `Memory` trigger storage, interact prompts, and per-frame trigger checks for `LdtkWorldScene`.

Invariants:

- `LdtkWorldScene` still owns the shared `LoreDisplay` because Ego, pickup, and anvil flows use it directly.
- `loadLevel(level)` clears old prompts before reading the new level's `Dialogue`/`Memory` entities.
- Interact prompts use `KeyPrompt` with `GameAction.ATTACK` and are positioned through camera `renderX/renderY` plus `GAME_WIDTH/GAME_HEIGHT`, matching the previous screen-space calculation.
- Trigger completion writes to the scene's `unlockedEvents` set through a getter. One-shot `Dialogue` keys use `eventName` if provided, otherwise `dialogue_<level>_<iid>`; `Memory` keys use `memory_<level>_<iid>`.
- Call `clear()` on scene exit/destroy so prompt containers cannot leak into Item World or another scene.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` browser smoke on `127.0.0.1:5178` passed.

- 2026-06-05: Interact prompt cleanup now uses DisplayObjectLifecycleHelpers.detachDisplayObject(); prompts remain detach-only to preserve the existing non-destroy cleanup semantics.
- 2026-06-05: Interact dialogue `ATTACK` press/consume gating now uses `InputPressHelpers.consumeJustPressedAction()` after the in-trigger check, preserving the previous range-only consume policy.
- 2026-06-05: Interact prompt positioning now uses the shared `WorldPromptProjection.projectWorldToUi()` helper so UI-container prompts stay aligned with world anchors during camera zoom in/out.
