# WorldBuilderEntranceRuntime

`game/src/scenes/world/WorldBuilderEntranceRuntime.ts` owns LDtk world Giant Builder-mounted entrance glow attachment.

Current state:

- `spawnIfEntrance(builder, entity)` consumes `BuilderEntrance` / `BuilderEntity` variants through `WorldExitGlowRuntime.isEntranceVfxEntity()`.
- Glow spec parsing and glow lifetime remain in `WorldExitGlowRuntime`; this runtime only applies the active builder offset, creates builder-tracked entrance glows, and attaches their anchor sync to `WorldBuilderAttachmentRuntime`.
- The attached glow uses `reparent: false`; each sync updates the glow anchor with the builder's current world position while `WorldExitGlowRuntime.includesBuilderEntranceGlow()` is the liveness check.
- `LdtkWorldScene.clearBuilder()` still clears builder entrance glows through `WorldExitGlowRuntime.clearBuilderEntranceGlows()`.
- `WorldAnvilSpawnRuntime` owns builder-mounted `Anvil` construction and attachment.

Prevention rules:

- Do not reintroduce `BuilderEntrance` / `BuilderEntity` glow construction in `LdtkWorldScene.spawnBuilderEntities()`.
- Keep glow spec parsing in `WorldExitGlowRuntime`; keep builder transform sync here.
- Do not reparent entrance glow containers into `GiantBuilder.container`, because `ExitGlow` owns world-space anchor updates.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
