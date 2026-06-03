# ItemWorldResidentRuntime

`game/src/scenes/itemworld/ItemWorldResidentRuntime.ts` owns Item World memory resident lifetime and proximity Ego dialogue checks.

Current responsibilities:

- Store and destroy `MemoryResident` instances.
- Spawn active ambient hub residents onto the scene-owned residents layer.
- Update resident animation per frame.
- Check non-ambient gatekeeper/archivist proximity triggers and fire first/familiar Ego dialogue.
- Write resident proximity trigger state through `ItemWorldEgoDialogueRuntime`-provided `egoFlags` and scene-provided persistent `egoUnlockedEvents`.

Scene-owned boundaries:

- `ItemWorldScene` still chooses spawn points, hub policy, RNG variants, and whether main gatekeeper/archivist residents are enabled.
- Ego entry counts and global Ego trigger policy belong to `ItemWorldEgoDialogueRuntime`; do not move them back into resident proximity handling.
- `residentsLayer` remains scene-owned because it participates in global layer/filter ownership and the final absorb/dissolve sequence.
- Do not reintroduce a scene-owned `memoryResidents` array; resident lifetime should go through this runtime.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
