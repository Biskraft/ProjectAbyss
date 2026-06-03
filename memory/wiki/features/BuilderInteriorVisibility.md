---
feature: BuilderInterior Visibility
status: active
last_updated: 2026-06-02
---
# BuilderInterior Visibility

## Current Rule

- `GiantBuilder` computes BuilderInterior IntGrid cells for overlap checks.
- `LdtkWorldScene` keeps BuilderInterior visible as an occluder until the player actually overlaps a BuilderInterior cell.
- On overlap, the whole BuilderInterior layer dissolves away; it fades back in after the player leaves those cells.
- Builder-mounted `BuilderEntrance`/`BuilderEntity` VFX uses the same dissolve alpha, so entrances disappear with their builder interior.
- Do not add the 2026-05-27 circular player reveal mask back without a new visual direction. It was removed because the next readability pass will use a different approach.

## Implementation Notes

- `game/src/entities/GiantBuilder.ts`: owns `isPlayerInInteriorCells`.
- `game/src/scenes/LdtkWorldScene.ts`: computes the active builder/player overlap target.
- `game/src/scenes/world/WorldBuilderInteriorVisibilityRuntime.ts`: owns the full-layer dissolve alpha and applies it to builder-mounted entrance glows.
- `LdtkWorldScene` draws the active builder's current `collisionGrid` into a dedicated HUD minimap layer each frame. Use the builder grid directly so movement and runtime tunnel edits stay visible without redrawing the whole minimap.
- The `M` world map receives the same dynamic builder grid as a `WorldMapOverlay` dynamic layer, but only for rooms already in `visitedLevels`; do not leak builder layout into unvisited or adjacent-outline rooms.
- There is no overlap hint layer and no circular reveal mask.

## Verification

- 2026-05-27: `npx tsc --noEmit` passes.
- 2026-05-27: `npm run build` from `game/` passes. Remaining warnings are existing LDtk/CSV tileset divergence warnings plus the existing Vite large chunk warning.
- 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
