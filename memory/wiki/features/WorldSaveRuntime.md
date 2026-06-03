# WorldSaveRuntime

`game/src/scenes/world/WorldSaveRuntime.ts` owns LDtk world save execution and save payload assembly.

Current state:
- `SavePointRuntime` still owns save-point entity parsing, proximity prompts, delayed save queue timing, and nearest-save snapping.
- `WorldSaveRuntime.save()` owns full heal/flask refill on save, save flash/hitstop/pulse callback order, `SaveManager.save()` payload assembly, saved toast, `trackSave()`, and post-save HUD refresh.
- Save payload fields come from callbacks: current level fallback, inventory, abilities, progress Sets, gold, playtime, HealthShard bonus, and completed tutorial hints.

Prevention rules:
- Do not re-add `performSave()` or direct save payload assembly to `LdtkWorldScene`; route save execution through `WorldSaveRuntime`.
- Keep save interaction timing in `SavePointRuntime`; this runtime should not own prompt/proximity state.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed; diff check only printed existing line-ending warnings.
