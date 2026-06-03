# WorldExitGlowRuntime

- `game/src/scenes/world/WorldExitGlowRuntime.ts` owns LDtk world exit glow creation, update, and destruction.
- `LdtkWorldScene` supplies only the entity layer and current player center. It should not keep a separate `exitGlows` list.
- Level-load edge glows are derived from `LdtkLevel.dirNeighbors` and passable edge collision cells (`0` or `2`).
- `BuilderEntrance` / `BuilderEntity` glow specs live in this runtime. Builder-mounted glows are tracked separately so `clearBuilder()` can remove only builder entrance glow VFX without clearing level edge glows.
- Builder entrance attachment sync lives in `WorldBuilderEntranceRuntime`, because it follows `GiantBuilder` transform state while lifetime checks use `WorldExitGlowRuntime.includesBuilderEntranceGlow()`.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `/play/?debug=1` Puppeteer smoke passed.
