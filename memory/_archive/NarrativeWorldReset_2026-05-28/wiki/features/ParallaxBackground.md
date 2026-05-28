---
feature: Parallax Background
status: active
last_updated: 2026-05-27
---
# Parallax Background

## Current Rule

- `game/src/level/ParallaxBackground.ts` renders the gradient plus far/mid/near image layers into `Game.backgroundContainer`.
- Image layers use a small fixed screen-space grid of normal Pixi `Sprite`s, repositioned each frame from camera parallax offsets.
- Do not use Pixi `TilingSprite` or repeat sampler mode for these parallax image layers without rechecking shipping browser builds.

## Prevention

- Shipping builds can expose opaque square artifacts on the `TilingSprite`/repeat-sampler path for transparent parallax PNGs.
- Keep parallax textures in `clamp-to-edge`; repeat behavior should come from manually repositioned Sprites.
- Preserve the screen-space layer size so palette filter framebuffers stay small on large LDtk maps.

## Verification

- 2026-05-27: `npx tsc --noEmit` from `game/` passes.
- 2026-05-27: `npm run build` from `game/` passes. Remaining warnings are existing LDtk/CSV tileset divergence warnings plus the existing Vite large chunk warning.
- 2026-05-27: production preview at `http://127.0.0.1:4173/play/` reached `Start_Room_01` and rendered the world/parallax window without opaque square cover artifacts.
