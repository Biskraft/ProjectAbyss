# WorldPrologueEndRuntime

`game/src/scenes/world/WorldPrologueEndRuntime.ts` owns the prologue ending fade/threat sequence that transitions the player from chapter prologue cutscene into chapter 1.

Current state:

- Runs a 3-phase sequence (`arm` -> `threat` -> `fade`) once `loadLevel(PROLOGUE_END_LEVEL)` is called.
- `threat` and `fade` phases are owned by this runtime; each updates `fadeOverlay.alpha` directly.
- On fade completion, transitions scene state to `chapter_01` and loads `Start_Room_01` through callbacks.

Dependencies:

- `getFadeOverlay` (`Graphics` for alpha updates)
- `loadLevel(levelId, enterFrom)` scene transition callback
- `showToast`
- `isPrologueScene` callback instead of direct save read
- `setScene` callback (`chapter_01`) instead of direct save write

Boundaries:

- Do not add world-level scene-graph branching back into this runtime.
- Keep scene transition side-effects (`loadLevel`, scene-id write) delegated through callbacks from `LdtkWorldScene`.
- Keep fade visuals in this runtime to avoid duplicated fade logic at scene scope.

Verification:

- Confirmed by direct code inspection: no `sacredSave` import; scene checks and writes are injected as callbacks.
# WorldPrologueEndRuntime
game/src/scenes/world/WorldPrologueEndRuntime.ts owns the Ch.0 -> Ch.1 prologue handoff cutscene controller.

- Prologue end can start from the legacy world ItemStratum_Prologue_04 arm path or from the Item World onPrologueEnd callback via startFromItemWorldHandoff().
- The runtime renders a white-out/white-in overlay on Game.feedbackOverlayContainer, bakes Prologue_Cinema_01 into a RenderTexture with a temporary LdtkRenderer, zooms that baked texture, then calls the injected Ch.1 handoff to load Start_Room_01.
- During handoff-triggered loadLevel, the runtime ignores its own loadLevel() re-entry so the white overlay survives until the wake hold finishes.
- The injected Ch.1 handoff should set scene='chapter_01', mark __itemWorldTutorialDone, and load Start_Room_01; do not reintroduce an immediate prologue-end load in WorldAnvilItemWorldFlowRuntime.

## 2026-06-06 Fix: white fade, wake-up, and Player pivot alignment
- Item World prologue handoff now runs the same white-out -> baked cinema -> white-in -> zoom path instead of starting directly at white-in.
- `WorldPrologueEndRuntime` aligns the baked `Prologue_Cinema_01` zoom using a `Player` entity pivot, preferring `Scene=chapter_01`, so the cinematic handoff matches the `Start_Room_01` chapter spawn convention.
- `Player.playWakeUpOverride()` drives a one-shot wake-up animation after the live `Start_Room_01` load; keep this explicit callback instead of relying on normal idle/run state transitions.

## 2026-06-06 Fix: Playwright-tuned cutscene debug and bake alignment
- `?prologueCutscene` now bypasses TitleScene from `main.ts` and opens `LdtkWorldScene` directly, then starts the prologue cinematic handoff immediately.
- Baked `Prologue_Cinema_01` now includes `CommonSprite` entity tiles and uses `LdtkEntity.type` / `entity.tile`; do not use `identifier` or `fields.Tile` for parsed LDtk entities.
- The cinematic zoom final scale is 1:1 and the destination anchor is derived from the `Start_Room_01` `Player(Scene=chapter_01)` screen position after camera clamping.
- Playwright Chrome captures were used at `game/tmp/prologue-cutscene/` to tune the zoom and pivot.

## 2026-06-06 Change: live LDtk camera handoff replaces baked texture
- Removed the RenderTexture/baked-cinema approach for the prologue handoff because it duplicated renderer behavior and missed AreaPalette/filter/entity consistency.
- `WorldPrologueEndRuntime` now loads `Prologue_Cinema_01` as a real `LdtkWorldScene` level, so AreaPalette, wall retags, parallax, CommonSprite, and entity layers use the normal world renderer path.
- The cutscene blocks gameplay update but drives `game.camera` directly, tweening live camera position and zoom from a wide cinema view to the chapter_01 handoff composition.
- Cinematic UI visibility now hides `uiContainer`, `feedbackOverlayContainer`, HUD, and minimap during the camera move, then restores them after wake-up.

## 2026-06-06 Change: wake-gated camera handoff
- Prologue cinematic camera now starts at zoom `0.1` and tweens to `1.0` on the live `Prologue_Cinema_01` level.
- The player is present from the start of the zoom and is forced to the wake-up frame 0 pose during the cinema zoom and after `Start_Room_01` handoff.
- After zoom completes, `Start_Room_01` loads and remains input-locked until horizontal movement input is held; that input starts `Player.playWakeUpOverride(900)`.
- `Prologue_Cinema_01` gets runtime outer collision walls after load because its LDtk IntGrid lacks an exterior boundary.

## 2026-06-06 Fix: cinematic outer IntGrid must also create visual wall tiles
- `Prologue_Cinema_01` runtime outer wall fill must update both collision grid and visual `wallTiles`; collision-only fills do not render because `LdtkRenderer` draws sprites from `LdtkLevel.wallTiles`, not from IntGrid values.
- `LdtkWorldScene.fillCinemaOuterCollisionWalls()` now creates synthetic boundary `LdtkTile`s, applies the normal prologue wall area retag, and rebuilds the wall layer.

## 2026-06-06 Fix: synthesize all missing cinematic wall visuals
- Outer-only synthetic walls were insufficient: `Prologue_Cinema_01` can have `IntGrid = Wall` cells without corresponding `wallTiles` visuals.
- `fillCinemaOuterCollisionWalls()` now scans every `TILE_WALL` cell and adds a synthetic `LdtkTile` whenever the renderer has no visual wall tile for that cell.

## 2026-06-06 Reset: overlap cinema map over Start_Room
- Abandoned all cinematic IntGrid/wall synthesis attempts; they caused incorrect white wall fills and fought LDtk/AreaPalette behavior.
- Current approach: load `Start_Room_01` as the real scene, hold the player on wake frame 0, then render `Prologue_Cinema_01` as a temporary overlay and fade it out while zoom moves from 0.1 to 1.0.
- Do not patch `Prologue_Cinema_01` collision/visual wall data for this transition; scene consistency comes from the underlying Start_Room plus fading cinema overlay.

## 2026-06-06 Fix: overlay Player pivot alignment
- The reset overlap approach must offset the temporary `Prologue_Cinema_01` overlay root by `Start_Room_01 Player(Scene=chapter_01).px - Prologue_Cinema_01 Player(Scene=chapter_01).px`.
- Do not rely on child ordering alone; without this offset the cinema overlay renders, but it is spatially misregistered against the live Start_Room camera.

## 2026-06-06 Fix: overlay uses Start_Room geometry
- The prologue overlay now renders `Start_Room_01` geometry instead of `Prologue_Cinema_01` geometry so wall/floor silhouettes stay identical during fade-out.
- Playwright captures in `game/tmp/prologue-cutscene/overlay-*.png` confirmed the wall boundaries now match the live Start_Room underneath; only overlay alpha/empty-shadow appearance changes during fade.

## 2026-06-06 Fix: cinema overlay source restored with overlap tile replacement
- The temporary overlay must render `Prologue_Cinema_01`, not `Start_Room_01`; otherwise the cinematic map is absent and the sequence is only a Start_Room zoom.
- `Prologue_Cinema_01` contains a Start_Room-equivalent collision region at offset `Start_Room Player(Scene=chapter_01).px - Cinema Player(Scene=chapter_01).px = (-768, -768)`, confirmed by LDtk collision comparison with 0 diffs across Start_Room cells.
- To avoid fade mismatch in the overlap, the overlay now keeps the full cinema map but replaces aligned wall/shadow/interior visual tiles in the Start_Room-equivalent region with the live Start_Room visual tile variants.

## 2026-06-06 Fix: cinema overlay uses AreaPalette
- Temporary prologue cinema overlay renderers must get their own `WorldTerrainPaletteRuntime`; reusing the live scene palette runtime would steal/overwrite filter references from the active world renderer.
- `LdtkWorldScene` now injects the existing `bgAreaIdForLevel` / `wallAreaIdForLevel` policy, and the overlay applies default area retags plus palette filters to its renderer layers.

## 2026-06-06 Verification: cinema overlay AreaPalette color
- Playwright capture after the overlay palette fix confirmed the cinema overlay is no longer grayscale: walls render in the warm prologue wall ramp and background remains blue-toned.
- `npm run build` from `game/` passes after fixing CSV blockers. The AreaPalette blocker was an unescaped comma in `Sheets/Content_System_Area_Palette.csv` row `world_prologue_wall`, which shifted the `Tileset` column to `dimmed 0.82`.

## 2026-06-06 Fix: cinema overlay palette matched to live Start_Room darkness
- The cinema overlay keeps `Prologue_Cinema_01` geometry, but its palette IDs are resolved from `Start_Room_01` so the handoff target and overlay use the same area tone.
- Full cinema solid-wall tiles were too dark/black with normal WALL palette because they lack the live Start_Room interior overlay detail. Overlay-only wall fill now uses a custom BG-row palette filter with reduced brightness/depth (`0.40` / `0.28`) plus the normal rim filter, so large cinema walls stay visible in the same dark blue family without becoming warm/white or crushed black.
- Fade-out now starts at zoom progress `0.68` to avoid early alpha blending darkening the cinema map before the zoom composition is readable.
- Verified with Playwright `tmp/prologue-cutscene/capture-compare-overlay-live.cjs` and `npm run build` from `game/`.

## 2026-06-06 Correction: no manual cinema color grading
- Cinema overlay color should use the existing AreaPalette/world tone path directly. Do not add overlay-only brightness/depth color hacks for the cinematic wall layer.
- The overlay resolves palette IDs from `Start_Room_01` and applies `WorldTerrainPaletteRuntime` normally; remaining differences are geometry/layer-content differences between `Prologue_Cinema_01` and `Start_Room_01`, not custom color grading.
- `npm run build` from `game/` passes after removing the manual wall-fill palette override.

## 2026-06-06 Fix: avoid duplicate Start_Room overlap tint drift
- AreaPalette depth gradient depends on each filtered layer's `filterArea`; `Prologue_Cinema_01` and `Start_Room_01` have different dimensions, so rendering duplicate aligned tiles in the cinema overlay can shift tile/image hues even with the same AreaPalette IDs.
- The cinema overlay now omits tiles whose offset world position falls inside `Start_Room_01` bounds. The live Start_Room renderer underneath supplies those pixels with the exact world tone, while the cinema overlay still renders only the non-overlap cinematic map around it.
- Do not fix this with manual brightness/depth color grading; remove duplicate overlap rendering instead.

## 2026-06-06 Change: wake tail locks only the player
- After cinema zoom/fade completes, `awaitWakeInput` and `wakeUp` no longer block the full `LdtkWorldScene.update()` loop. Environment runtimes continue updating while the player remains locked on the wake pose/animation.
- `WorldPrologueEndRuntime.isPlayerLocked` gates only the Player update path in `LdtkWorldScene`; `shouldTickWakeUpAnimation` lets the wake-up frames advance without accepting movement input.
- Player movement unlocks `1000ms` after the `900ms` wake-up animation completes.

## 2026-06-06 Fix: wake-up unlock no longer leaves lying pose
- Bug cause: after `Player.playWakeUpOverride()` finished, the extra movement-unlock delay still called `holdWakeUpPose()`, re-enabling frame-0 lying pose before control returned.
- `WorldPrologueEndRuntime.shouldHoldWakeUpPose` now returns true only during `awaitWakeInput`; wake-up post-delay only zeroes player motion and does not touch the pose.
- Playwright `tmp/prologue-cutscene/verify-wake-move.cjs` pressed Right to trigger wake, waited through unlock, then held Right. Player moved from x=248 to x=334, FSM changed to `run`, and screenshot confirmed standing/running pose.
- `npm run build` from `game/` passes.
