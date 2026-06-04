---
feature: Parallax Background
status: active
last_updated: 2026-06-03
---
# Parallax Background

## Current Rule

- `game/src/level/ParallaxBackground.ts` renders the gradient plus far/mid/near image layers into `Game.backgroundContainer`.
- Image layers use a small fixed screen-space grid of normal Pixi `Sprite`s, repositioned each frame from camera parallax offsets.
- Do not use Pixi `TilingSprite` or repeat sampler mode for these parallax image layers without rechecking shipping browser builds.
- BG area is resolved **per level** in `LdtkWorldScene` via `bgAreaIdForLevel()` (`Prologue*` → `world_prologue_bg`, else `world_shaft_bg`); the parallax rebuilds when the area changes (tracked by `parallaxAreaId`), not just on first load.
- `setup(entry, w, h, paletteAtlas?, { nearNativeScale })`: `nearNativeScale: true` renders the near layer at scale 1.0 (1:1, pixel-for-pixel) via `addImageLayer`'s `scaleOverride` instead of the default `(360/texH)*1.5` fit zoom — used for a full-screen-sized backdrop (prologue near is 640x360 = GAME_WIDTH×GAME_HEIGHT). All layers (near included) are palette-swapped when `paletteAtlas` is supplied.
- Per-area parallax images/factors/tones are CSV-driven (`Sheets/Content_System_Area_Palette.csv`, SSoT). `world_prologue_bg` reuses `parallax_mid`/`parallax_far` and owns `parallax_near_prologue` (grayscale; `ParallaxFactorNear=0.45`).

## Prevention

- Shipping builds can expose opaque square artifacts on the `TilingSprite`/repeat-sampler path for transparent parallax PNGs.
- Keep parallax textures in `clamp-to-edge`; repeat behavior should come from manually repositioned Sprites.
- Preserve the screen-space layer size so palette filter framebuffers stay small on large LDtk maps.

## Verification

- 2026-05-27: `npx tsc --noEmit` from `game/` passes.
- 2026-05-27: `npm run build` from `game/` passes. Remaining warnings are existing LDtk/CSV tileset divergence warnings plus the existing Vite large chunk warning.
- 2026-05-27: production preview at `http://127.0.0.1:4173/play/` reached `Start_Room_01` and rendered the world/parallax window without opaque square cover artifacts.
