# WorldProgressState

`game/src/scenes/world/WorldProgressState.ts` owns LDtk world persistent progress sets.

Current state:
- The state owns `visitedLevels`, `clearedLevels`, `collectedItems`, `collectedRelics`, and `unlockedEvents`.
- `LdtkWorldScene` exposes read-only getters returning those same Set objects so existing save, minimap, unlock, pickup, and Ego dialogue call sites can keep their current Set API.
- Save-load paths call `WorldProgressState.replaceFromSave()`, which mutates the existing Set objects instead of replacing them. This preserves Set references held by runtimes or pushed scenes.

Prevention rules:
- Do not add scene-owned progress Set fields back to `LdtkWorldScene`.
- Do not replace progress Sets during save load; mutate the existing Sets through `replaceFromSave()` so callback-held references remain valid.
- Keep save payload assembly in `LdtkWorldScene.performSave()` until save format ownership is intentionally extracted together with `SavePointRuntime`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.

## 2026-06-05 - Start_Room_01 Rustborn normalization fix

- Prologue Item World handoff now adds `__itemWorldTutorialDone` before loading `Start_Room_01`.
- `LdtkWorldScene.normalizeStartRoomInventoryAfterItemWorld()` runs from both `loadLevel()` and `enter()` so pop-return paths that do not reload the level still normalize inventory.
- The normalized inventory remains only `sword_rustborn`, equipped silently.
