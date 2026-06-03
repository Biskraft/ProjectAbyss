# WorldProceduralDecorRuntime

`game/src/scenes/world/WorldProceduralDecorRuntime.ts` owns LDtk world procedural decoration lifecycle.

- Owns the primary `ProceduralDecorator` instance and any extra decorators.
- Detaches decoration layers, clears generated children, and forwards per-frame sway updates.
- `LdtkWorldScene` still owns generation timing, URL theme/noproc policy, palette filters, render insertion order, and grass burnable registration.
- Keep terrain filter bounds pinned from `LdtkWorldScene.applyTerrainFilterAreas()` because that method also covers renderer layers.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, and Puppeteer smoke against `http://localhost:3000/play/?debug=1` passed.
