# Area Palette Validation

## Current State

- `Sheets/tools/validate.mjs` treats `Sheets/Content_System_Area_Palette.csv` as the SSoT for area-managed BG/WALL tilesets.
- LDtk-authored override tilesets are not CSV area rows. They are allowlisted in `AUTHORED_LDTK_TILESET_PATHS` and validated by direct file existence under `game/public/assets/`.
- Current authored override paths are:
  - `sprites/builder_sprite_01.png`
  - `atlas/builder_01.png`
  - `atlas/world_interior_01.png`
  - `atlas/itemstratum_01.png`
- `npm run build` now reports `[OK] CSV integrity check passed (0 warnings)` for the CSV/LDtk/atlas validator; the remaining build warning is Vite chunk size only.

## Prevention Rules

- Do not add fake `Content_System_Area_Palette.csv` rows just to silence LDtk-authored tileset warnings. Add intentional non-area LDtk tilesets to `AUTHORED_LDTK_TILESET_PATHS` and make sure the asset exists.
- Keep area retagging limited to default area tilesets. LDtk-specific override art should stay authored in LDtk and be preloaded/preserved by runtime loaders.
