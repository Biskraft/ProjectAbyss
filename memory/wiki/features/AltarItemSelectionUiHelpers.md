# AltarItemSelectionUiHelpers

## Current State

- `game/src/scenes/shared/AltarItemSelectionUiHelpers.ts` owns shared altar item-select panel shell creation plus item-row label creation and `BitmapText` row placement.
- Legacy `WorldScene` altar UI and `WorldAltarController` both use `createAltarItemSelectionShell(...)` and `addAltarItemRows(...)`.

## Boundaries

- The helper may build localized row labels with `ui.altar.item_row`, `ui.altar.equipped_suffix`, and `getDisplayName(item)`.
- Callers still own title/localization choice, accent colors, selected/normal row fill colors, UI container lifetime, and item validation.
- The shell helper owns the shared 260px panel sizing, centering, background/title placement, and row origin/height constants.
- `equippedUid` follows the current `ItemInstance.uid` numeric type.

## Verification

- 2026-06-05: `npx tsc --noEmit` and `npm run build` passed from `game/`; build retained only the known LDtk/CSV `atlas/prologue_01.png` warning.
