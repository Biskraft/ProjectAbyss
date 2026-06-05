# WorldProceduralDecorRuntime

`game/src/scenes/world/WorldProceduralDecorRuntime.ts` owns LDtk world procedural decoration lifecycle.

- Owns the primary `ProceduralDecorator` instance and any extra decorators.
- Detaches decoration layers, clears generated children, and forwards per-frame sway updates.
- Procedural decor layer list/detach helpers are shared through `game/src/scenes/shared/ProceduralDecorLayerHelpers.ts`; world still owns primary/extra decorator lifetime and update forwarding.
- `LdtkWorldScene` still owns generation timing, URL theme/noproc policy, palette filters, render insertion order, and grass burnable registration.
- Keep terrain filter bounds pinned from `LdtkWorldScene.applyTerrainFilterAreas()` because that method also covers renderer layers.
- Do not move world generation timing, URL policy, palette filters, render insertion order, or grass burnable registration into `ProceduralDecorLayerHelpers`; it should stay a layer attach/detach helper.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, and Puppeteer smoke against `http://localhost:3000/play/?debug=1` passed.

- 2026-06-05: `ProceduralDecorLayerHelpers.detachProceduralDecorLayers()` now uses `DisplayObjectLifecycleHelpers.detachDisplayObject()` for detach-only layer cleanup; generation timing and palette/filter policy remain world-owned.
