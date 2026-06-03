# Build Chunk Budget

## Current State

- `game/vite.config.ts` manually splits large scene entry modules into `scene-world` and `scene-item-world`, and splits Pixi dependencies into `pixi`.
- `chunkSizeWarningLimit` is set to `1024` KB through `SCENE_CHUNK_WARNING_LIMIT_KB` because the official Item World scene chunk is intentionally larger than Vite's previous `750` KB warning threshold after the scene split.

## Prevention Rules

- Do not treat the 1024 KB budget as a performance optimization. It only keeps expected scene chunks from reporting as warnings during normal build verification.
- If a scene chunk grows beyond 1024 KB, inspect whether new code belongs in a runtime helper, shared system, or lazily loaded asset path before raising the limit again.
- Keep manual chunk names stable unless release packaging or cache behavior is intentionally changed.

## Verification

- 2026-06-02: `npm run build` from `game/` passed without CSV, font, favicon, or chunk-size warnings after setting the explicit scene chunk warning budget.
