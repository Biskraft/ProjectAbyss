# Save Point Runtime

## Current State

- `LdtkWorldScene` delegates save point entity lists, proximity hints, delayed save queue state, nearest-save snapping, and item-deployment prompt hiding to `game/src/scenes/world/SavePointRuntime.ts`.
- `SavePointRuntime.loadLevel(level, entityLayer)` owns LDtk `GameSaver` parsing, placeholder marker creation, save prompt creation, async `save_point_01.png` attachment, and stale async sprite guards.
- Save execution and serialization live in `WorldSaveRuntime.save()` so save-file format, player heal/refill, HUD updates, analytics, and toast order remain centralized outside the scene.
- `SavePointRuntime` uses `SavePointInteraction` for proximity UI and snapping, and owns stale async sprite guards through `has(entry)`.
- Save-room BGM dimming is owned by `game/src/scenes/world/SaveRoomAudioRuntime.ts`, which reads only whether the loaded level has save points and keeps audio policy out of save serialization/proximity logic.

## Prevention Rules

- Do not reintroduce `savePoints`, `saveHintShown`, `saveQueued`, or `saveDelayTimer` fields directly into `LdtkWorldScene`; add save point interaction state to `SavePointRuntime`.
- Do not parse LDtk `GameSaver` entities in `LdtkWorldScene`; call `SavePointRuntime.loadLevel(level, entityLayer)` during room load.
- Keep actual `SaveManager.save()` payload assembly in `WorldSaveRuntime`; do not re-add `performSave()` to `LdtkWorldScene`.
- When hiding Item World deployment cinematics, call `SavePointRuntime.hideForItemDeployment()` so the prompt and `SavepointPulseManager` aura are both cleared before snapshot capture.
- Do not add BGM volume-factor fields back to `LdtkWorldScene`; save-room audio policy belongs in `SaveRoomAudioRuntime`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.

- 2026-06-05: Save point marker/sprite/prompt clear now uses `DisplayObjectLifecycleHelpers.detachDisplayObject()`, preserving the existing detach-only cleanup semantics while `SavepointPulseManager` aura cleanup remains separate.
