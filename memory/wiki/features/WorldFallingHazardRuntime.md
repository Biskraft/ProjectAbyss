# WorldFallingHazardRuntime

`game/src/scenes/world/WorldFallingHazardRuntime.ts` owns LDtk world `FallingHazard` entities.

Current behavior:

- LDtk `FallingHazard` marks the falling column. When the player enters the automatic trigger band, the hazard telegraphs for `TelegraphMs` / `telegraphMs` milliseconds, default `1000`.
- During telegraph, dust falls from the falling column and the impact strip is highlighted.
- After telegraph, a block falls under gravity. Default size is `TileW=2`, `TileH=1`, in 16px tiles.
- Falling block contact always deals `20%` of player max HP once, applies knockback/iframes/HUD damage feedback, and uses `lastDamageSource='falling_hazard'`.
- On floor IntGrid impact, the block disappears with breakable-object-style shatter SFX/particles, landing dust, camera shake, and a water/magma/oil/acid/cyro splash if the impact neighborhood contains that fluid tile.
- Hazards are removed after impact during the current room visit. Leaving the map/room and loading it again recreates the LDtk entity, so it is rearmed automatically.

LDtk fields:

- `TelegraphMs` / `telegraphMs`: warning time in ms. Default `1000`.
- `TileW` / `tileW`: falling block width in tiles. Default derives from entity width, minimum `1`.
- `TileH` / `tileH`: falling block height in tiles. Default `1`.

Placement rule:

- Set the LDtk entity top-left at the falling block's left edge under the ceiling.
- The trigger band is automatic: one falling-block width to the left, the falling-block width itself, and one falling-block width to the right, for a total width of `TileW * 3` tiles.
- The trigger height is automatic: from the entity's ceiling/top y down to the first solid floor IntGrid under the falling block columns.
- The drop continues until the falling block hits floor IntGrid; no `DropColumnX` or floor target field is used.
