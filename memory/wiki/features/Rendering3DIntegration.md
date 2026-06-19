# Rendering3DIntegration

## 2026-06-17

- Technical review documented in `Documents/System/System_Rendering_3DIntegration.md`.
- Project decision: Three.js/PixiJS integration is feasible, but initial scope must be decorative 3D only.
- Current Pixi render ownership in `game/src/Game.ts` uses background RT, world RT, then final stage render. A Three layer should start behind Pixi gameplay, not between gameplay sprites.
- Phase 1 recommendation is a separate-canvas prototype behind Pixi for quick visual/performance validation.
- Production direction, if validated, is shared WebGL context with explicit renderer `resetState()` calls between Three and Pixi.
- Prevention rule: do not introduce 3D gameplay collision, actor rendering, or tilemap authority before a separate design decision replaces the current LDtk/2D AABB model.
