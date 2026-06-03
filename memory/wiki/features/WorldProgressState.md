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
