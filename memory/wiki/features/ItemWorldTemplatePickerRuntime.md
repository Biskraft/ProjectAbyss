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

## 2026-06-14 - Debug template exclusion

- `LdtkLoader` now preserves level custom fields on `LdtkLevel.fields`.
- `ItemWorldTemplatePool` filters out ItemStratum templates whose level fields contain a `debug` tag (`Tags`, `Tag`, `Debug`, case variants) before random Item World template selection.
- `ItemStratum_Prologue_*` templates are explicitly preserved even if tagged debug, because prologue forced dive loads them by identifier through `PrologueDive` placements.
- Prevention rule: exclude debug maps only at the Item World template pool boundary. Do not globally remove LDtk levels, or direct authored scene/prologue loads can break.

## 2026-06-14 - Random template final guard

- Debug/test exclusion is now two-layered: `ItemWorldTemplatePool` removes debug/test templates from the shared pool, and `ItemWorldTemplatePickerRuntime` applies `isExcludedItemWorldRandomTemplate()` again before exact/fallback random selection.
- `LdtkLevel.tags` now normalizes raw LDtk tags plus tag-like level fields. Debug detection checks tags, fields, `roomType=Debug`, and identifier fragments containing `debug` or `test`.
- `ItemStratum_Prologue_*` templates remain in the shared pool for forced prologue dive lookup, but are excluded from random Item World template selection by the picker.

## 2026-06-18 - Footprint-aware selection

- Random Item World template selection now prefers templates whose LDtk pixel size maps to the cell footprint using 24x12 tile slots.
- Current compatibility default: existing 48x32 templates match a 2x3 slot footprint.
- Fallback remains exit-compatible when no exact roomType/footprint template exists, so missing authored combinations warn instead of blocking ItemWorldScene creation.

## 2026-06-18 - Optional room types only when exact exits exist
- Treasure/Puzzle are now selected only when the footprint-filtered LDtk pool has an exact template for the required exit set.
- If no exact optional template exists, the picker falls back to Combat before generic fallback, preserving exit/socket correctness without noisy optional-type warnings.
- Prevention rule: topology exits are higher priority than desired room flavor; do not place a room template with mismatched exits just to preserve room type.

## 2026-06-18 - Geometry correction: footprint matching uses 16x16 cells
- Correction to earlier note: existing 48x32 item-world LDtk templates match a 3x2 footprint because the base cell is 16x16 tiles.
- Template footprint matching remains driven by `IW_ROOM_SLOT_W_TILES` / `IW_ROOM_SLOT_H_TILES`, now both 16.
