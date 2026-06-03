# ItemWorldTemplatePickerRuntime

`game/src/scenes/itemworld/ItemWorldTemplatePickerRuntime.ts` owns LDtk ItemStratum template selection.

## Boundary

- Owns required-exit calculation, memory-room override validation, memory/cinematic/entry-corridor template exclusion, desired room type selection, exact room-type matching, boss fallback ranking, exit-compatible fallback, and warning messages for missing authored combinations.
- Preserves the current room-type policy: start room and hub use `Start`, stratum end uses `Boss`, shrine uses `Rest`, corridor uses `Corridor`, off-path rooms roll Treasure/Puzzle/Combat, and critical path defaults to Combat.
- `ItemWorldScene` still owns generated graph state, full-grid collision orchestration, and LDtk template asset loading.
- `ItemWorldMemoryRoomPlacementRuntime` owns the Memory Room placement map; this runtime only validates placed-template exits before using it.
- `ItemWorldRoomTypeRuntime` owns logical room-type map assignment after a template is picked.

## Verification

- 2026-06-02: Extracted from `ItemWorldScene.pickLdtkTemplate()`.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke, `git diff --check` with only existing line-ending warnings.
