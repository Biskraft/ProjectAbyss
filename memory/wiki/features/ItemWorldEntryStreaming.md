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
- During an armed anvil deployment, `LdtkWorldScene.checkLevelEdges()` treats the overworld right edge as the Item World handoff even when there is no LDtk neighbor. This starts `__item_world__`, so the next scene begins at the corridor's left edge.
- `AnvilGateLaser` enters a 1000ms max-width hold after the burst reaches full size, then decays. When the tunnel laser fires, `ItemDeploymentController` locks camera zoom at 1.0 until Item World handoff or controller destroy; debug zoom keys bypass the lock by updating the locked value.

## Prevention Rules

- Do not pre-init a full `ItemWorldScene` while the overworld is still visible; `init()` attaches scene/UI/background state and can leak visuals before `SceneManager.push()`.
- Keep shared ItemStratum templates immutable. Clone before applying theme-specific tile retags.
- Keep streamed ghost collision scoped and restorable. Restore old row lengths and camera bounds when the ghost overlay is destroyed.
- When releasing overworld visuals for `ItemWorldScene`, restore ghost/tunnel collision without rerendering the tilemap; the return path rebuilds the level with `loadLevel()`.
- Keep the corridor as an `ItemWorldScene` entry state, not a second pre-pushed scene. It pauses normal start-room enemy spawn/dialogue until the corridor completes.
- Restore `game.backgroundContainer.filters` when the corridor completes or the scene exits; otherwise the grayscale/contrast filter leaks into normal Item World rendering.
- Exclude `RoomType=Cinematic` ItemStratum levels from procedural room template selection; cinematic maps such as `ItemStratum_Corridor` are loaded explicitly.
- Do not return early from edge handling solely because `itemDeployment.isActive`; the deployed state must still allow the overworld right edge to enter `ItemStratum_Corridor`.
- If the project moves to true walkable same-scene streaming from Shaft into ItemStratum, update `DEC-039` because Stratum 1 entry currently remains a scene-bound entry flow.
