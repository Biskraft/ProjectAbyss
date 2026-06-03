# ItemWorldRoomTypeRuntime

`game/src/scenes/itemworld/ItemWorldRoomTypeRuntime.ts` owns logical Item World room-type assignment after LDtk template selection.

Current responsibilities:

- Assign room keys to logical room types after a template is picked.
- Preserve the existing gameplay override policy: stratum end rooms become `Boss`, critical-path rooms become `Combat`, and other rooms fall back to LDtk `roomType` or `Combat`.
- Serve room-type lookups for enemy spawn decisions and debug labels.

Scene-owned boundaries:

- `ItemWorldScene` still owns generated graph state, template selection orchestration, enemy spawning, and stratum-end checks.
- `ItemWorldTemplatePickerRuntime` owns desired template role selection before a template is picked; this runtime owns the post-pick logical room-type map.
- Keep logical room-type map state out of `ItemWorldScene`.

Verification after extraction: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed. `git diff --check` only reported existing line-ending warnings.
