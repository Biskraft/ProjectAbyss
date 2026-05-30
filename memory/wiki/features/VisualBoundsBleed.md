---
feature: Visual Bounds Bleed
status: active
last_updated: 2026-05-30
---
# Visual Bounds Bleed

## Current Rule

- Camera gameplay bounds stay exact; collision and normal follow remain limited to the authored level/map rectangle.
- `Camera.setBounds(..., renderPadding)` may allow render-only shake inside a small visual padding area.
- `game/src/level/VisualBoundsBleed.ts` draws that padding by mirroring LDtk edge tiles 4 tiles outward.
- `LdtkWorldScene` and `ItemWorldScene` use visual bleed instead of a single-color shake-only `BoundsGuard`.

## Prevention

- Do not cover camera-shake overscan with a flat rectangle in active LDtk/ItemWorld scenes; it reads as a foreign overlay.
- If shake amplitude is increased beyond 4 tiles, increase `VISUAL_BOUNDS_BLEED_PX` or clamp the shake effect to the current bleed width.
- Keep visual bleed render-only. Do not expand collision grids or gameplay camera bounds just to hide overscan.

## Verification

- 2026-05-30: `npx tsc --noEmit` from `game/` passes.
- 2026-05-30: `npm run build` from `game/` passes. Existing warnings remain the 3 LDtk/CSV tileset warnings, unresolved runtime font URL warning, and Vite large chunk warning.
