# LdtkExternalEnums

`game/public/assets/World_ProjectAbyss.ldtk` uses LDtk external enums for content-backed editor dropdowns.

Current state:

- `ItemId` is external and sourced from `game/public/assets/World_ProjectAbyss_ExternalEnums.json`.
- `MonsterType` is external and sourced from the same file.
- The external enum file is generated from:
  - `Sheets/Content_Item_Master.csv` column `ItemID`.
  - `Sheets/Content_Enemy.csv` column `Type`.

Prevention rules:

- Do not manually add item or monster values only inside LDtk.
- Add item IDs to `Content_Item_Master.csv` and monster types to `Content_Enemy.csv`, then refresh `World_ProjectAbyss_ExternalEnums.json`.
- LDtk may prompt for enum rename/loss sync when value casing changes; confirm existing placements before saving large map edits.
