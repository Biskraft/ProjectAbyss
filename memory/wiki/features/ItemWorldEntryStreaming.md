# Item World Entry Streaming

## Current State

- Shaft/anvil Item World entry still crosses from `LdtkWorldScene` into `ItemWorldScene`; this is prestreaming, not true same-scene map streaming.
- `LdtkWorldScene.init()` seeds `ItemWorldTemplatePool` from the already-parsed `ItemStratum` LDtk world so `ItemWorldScene` does not fetch `World_ProjectAbyss.ldtk` again on entry.
- `LdtkWorldScene` starts entry prestreaming during anvil dive, archived ItemTunnel load/exit, and portal entry. It warms the `item_world` bundle, ItemStratum templates, theme area tilesets, and extra LDtk tilesets.
- `ItemWorldScene` clones cached LDtk templates before theme retagging because `applyAreaTilesetToLdtkTiles()` mutates tile `tilesetPath`.
- Anvil/tunnel handoff skips the redundant second fade-to-black because those paths already reach black before `ItemWorldScene` is pushed; only the reveal fade remains.
- The anvil deployment ghost room is a walkable streamed extension: `LdtkWorldScene` temporarily extends collision rows/camera bounds, stamps ItemStratum air and solids into the extension, and moves the entry trigger inside the ghost room instead of the Shaft edge.
- Procedural `ItemWorldScene` entries can opt into an `ItemStratum_Corridor` interstitial. Overworld entries pass `{ entryCorridor: true }`, load the real LDtk `ItemStratum_Corridor` level from the shared ItemStratum template pool, start the player at the corridor's left air-over-solid tile, then hand off from the corridor right/bottom exit to the start room ceiling at the remembered corridor x-coordinate.
- `ItemStratum_Corridor` renders black platform tiles over the normal Item World parallax background and reveals solid tiles near the player with per-tile scale 0 -> 1 animation. During the corridor, both the corridor container and the parallax background are temporarily filtered to grayscale with contrast 0.5. Do not replace it with a generated grid unless the LDtk level is missing.
- When the entry corridor hands off into the actual Item World start room, preserve the grayscale/contrast look on the world/background layers for 1000 ms, then fade the filter alpha back to normal color over the next 1000 ms.
- During an armed anvil deployment, `LdtkWorldScene.checkLevelEdges()` treats the overworld right edge as the Item World handoff even when there is no LDtk neighbor. This starts `__item_world__`, so the next scene begins at the corridor's left edge.
- `AnvilGateLaser` enters a 1000ms max-width hold after the burst reaches full size, then decays. When the tunnel laser fires, `ItemDeploymentController` locks camera zoom at 1.0 until Item World handoff or controller destroy; debug zoom keys bypass the lock by updating the locked value.
- The anvil deployment now uses `ItemWorldForgeBirth`: its large item/INTGRID preview starts hidden so no duplicate big item appears at the forge. During `ItemPunch`, the placed anvil item stays in its sprite colors, scales up to the forge preview size, and travels from the anvil placement point to the laser-birth focus; then `ItemWorldForgeBirth` reveals that full-size item for the laser hit.
- The placed anvil item icon, local symbol prompt, and world-space `KeyPrompt` all anchor to `Anvil.getFloorPlateCenterWorld()`, the visual center of the anvil floor plate. Do not center these on raw `anvil.x`, which is the entity pivot and can sit off the plate center.
- On laser burst, `ItemWorldForgeBirth` hitstops and shatters the item sprite into deterministic random-size texture chunks. Screen-glass crack and forge lightning-branch calls are intentionally disabled.
- `ItemWorldForgeBirth` no longer draws a rectangular cyan frame around the item/internal grid. Laser strike shards remain floating after the laser ends with slow, low-amplitude motion; they are released only after the player starts moving into the streamed Item World area. Moving shards duplicate to roughly 2x count, darken toward black during travel, then scale to 0 near the end.
- `ItemWorldForgeBirth` is anchored in front of the anvil laser source instead of the placed-item icon, so future changes to the visible item placement do not move the world-birth focal point.
- On laser burst, deployment pans the camera target 20 tiles to the right to show the tunnel/world formation, then returns to the player 500 ms after `AnvilGateLaser` completes.
- `ItemWorldGhostOverlay` reveal tiles now start from the forge shard source and settle into place one at a time at a slower 400 ms scale-in pace. `LdtkWorldScene` initially clears the ghost room cells to air, then stamps each revealed tile's value into `collisionGrid`, so the reveal creates actual IntGrid pieces instead of a fake visual platform.
- Ghost terrain containers are inserted below the player/entity layer, and their IntGrid collision is stamped only after each visual tile reaches its final scale/position. If a newly stamped solid overlaps the player, `LdtkWorldScene` immediately resolves the player out of the tile.
- `ItemWorldScene` still uses stratum weather motes/sparks from area palette data, but forces `WeatherSystem.breathing=false` so the full-screen cyan haze does not pulse.
- First-boss return inventory hint can be deferred while the placed item is still on the anvil. If the anvil retires instead of entering the normal reclaim path, clear `lastUsedAnvilItem` and flush `pendingFirstIwReturnHintHadFirstBossClear` after retire so the persistent inventory tutorial still appears.
- The first-boss return inventory hint is complete once `sword_rustborn` is equipped. Dismiss visible inventory tutorial hints, clear pending inventory hint state, and stop the HUD item-key pulse when that equip is detected.

## Prevention Rules

- Do not pre-init a full `ItemWorldScene` while the overworld is still visible; `init()` attaches scene/UI/background state and can leak visuals before `SceneManager.push()`.
- Keep Item World birth/preview FX data-only or visual-only before handoff. Use lightweight template/collision grids for previews, not live `ItemWorldScene` instances.
- Keep Item World birth positioning tied to the forge/laser source when revising anvil item placement; the placed item icon and the world-birth focal point are intentionally separate.
- Keep anvil placed-item and prompt placement on `Anvil.getFloorPlateCenterWorld()` instead of `anvil.x`; the LDtk/entity pivot is not the visible floor plate center.
- Do not draw fake completed platform chunks in `ItemWorldForgeBirth`. Player-proximity completion belongs to `ItemWorldGhostOverlay`, which must stamp revealed tile values into the streamed `collisionGrid`.
- Do not place ghost terrain above `entityLayer` or stamp ghost collision before the tile has visually settled; either mistake can make the player appear buried or collide with invisible geometry.
- Do not re-enable full-screen stratum breathing haze in Item World; keep color movement local to motes/sparks or other small effects.
- Keep shared ItemStratum templates immutable. Clone before applying theme-specific tile retags.
- Keep streamed ghost collision scoped and restorable. Restore old row lengths and camera bounds when the ghost overlay is destroyed.
- When releasing overworld visuals for `ItemWorldScene`, restore ghost/tunnel collision without rerendering the tilemap; the return path rebuilds the level with `loadLevel()`.
- Keep the corridor as an `ItemWorldScene` entry state, not a second pre-pushed scene. It pauses normal start-room enemy spawn/dialogue until the corridor completes.
- Restore `game.backgroundContainer.filters` when the corridor completes or the scene exits; otherwise the grayscale/contrast filter leaks into normal Item World rendering.
- Exclude `RoomType=Cinematic` ItemStratum levels from procedural room template selection; cinematic maps such as `ItemStratum_Corridor` are loaded explicitly.
- Do not return early from edge handling solely because `itemDeployment.isActive`; the deployed state must still allow the overworld right edge to enter `ItemStratum_Corridor`.
- Do not leave `pendingInventoryHint` armed after the player equips `sword_rustborn`; otherwise the open-inventory tutorial can reappear after the goal has already been completed.
- If the project moves to true walkable same-scene streaming from Shaft into ItemStratum, update `DEC-039` because Stratum 1 entry currently remains a scene-bound entry flow.
