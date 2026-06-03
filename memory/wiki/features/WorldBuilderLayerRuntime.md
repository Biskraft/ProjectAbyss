# WorldBuilderLayerRuntime

`game/src/scenes/world/WorldBuilderLayerRuntime.ts` owns LDtk world Giant Builder body/auxiliary layer attachment, sync, target lists, and teardown.

Invariants:

- The runtime attaches the main `builder.container` to the LDtk renderer root, either before the shadow layer when natural decor insertion is requested or at the end otherwise.
- The runtime attaches `builderInteriorLayer`, `lightContainer`, and `legFrontLayer` to the host scene root and keeps them positioned from `builder.container`.
- `legBackLayer` remains builder-internal while active, but teardown and filter target lists are owned by this runtime for consistency with the front-leg layer.
- `getAuxiliaryTargets()` supplies Item World growth hide targets for builder extra layers.
- `getAtmosphereTargets()` supplies dungeon/laser atmosphere filter targets for builder body, decorator, leg, and light layers.
- `getInteriorTargets()` supplies the builder interior dissolve pair used by `WorldDungeonAtmosphereRuntime`.
- `destroy(builder)` must run before `builder.destroy()` when clearing the active builder.
- Do not reintroduce manual builder body or auxiliary layer add/sync/destroy blocks to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
