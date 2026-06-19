# ItemWorldFullGridRuntime

`game/src/scenes/itemworld/ItemWorldFullGridRuntime.ts` owns deterministic Item World `fullGrid` collision assembly helpers.

## Boundary

- Copies each picked LDtk room collision grid into the stitched Item World `fullGrid`.
- Creates the initial solid `fullGrid` sized to the active unified grid.
- Applies the existing 2-tile solid seal for closed up/down exits after copying room collision.
- Applies the outer full-map solid boundary collision using `IW_BOUNDARY_THICKNESS`.
- `ItemWorldScene` still owns template selection, item spawner capture, player spawn capture, and runtime entity attachment.
- `ItemWorldRoomTypeRuntime` owns post-template logical room-type assignment.
- `ItemWorldFullMapLayerRuntime` owns visual aggregate setup; `ItemWorldBoundaryVisualRuntime` owns boundary visuals.
- `ItemWorldMapController.ts` is now geometry constants only; full-grid creation should stay in this runtime.

## Verification

- 2026-06-02: Extracted room collision copy, vertical exit sealing, and boundary collision from `ItemWorldScene.buildFullMap()`.
- 2026-06-02: Moved initial fullGrid creation out of `ItemWorldMapController` into `ItemWorldFullGridRuntime`.
- Checks: `npx tsc --noEmit`, `npm run build`, `/play/?debug=1` Puppeteer smoke, `git diff --check` with only existing line-ending warnings.

## 2026-06-18 - 24x12 slot variable room generation

- Item World generation now treats the logical room grid as 24x12 tile slots. `RoomGraphAdapter` packs adjacent rooms by footprint/socket direction instead of assuming a 1x1 48x32 room cell.
- `UnifiedRoomCell.tileRect` is the authoritative fullGrid tile-space rectangle for a room anchor. Runtime collision copy and room visual placement must use `tileRect` rather than recomputing `col * 48` / `row * 32`.
- Existing 48x32 LDtk ItemStratum templates are temporarily represented as 2x3 slots so they remain uncut while new 24x12-multiple templates are authored.
- Prevention rule: do not add new Item World code that assumes `UnifiedRoomCell.col/absoluteRow` maps directly to a 48x32 tile rectangle. Use `tileRect` when available.

## 2026-06-18 - Room rect based spawn/current-room reconciliation
- Item World room generation now treats `RoomCell.tileRect` as authoritative for spawn, current-room detection, authored prologue monster offsets, safe-room residents, boss fallback placement, and trapdoor placement.
- `ItemWorldScene.getRoomRectTiles()` resolves runtime records first, then `cell.tileRect`, then the 24x12 slot fallback.
- Prevention rule: do not derive gameplay room ownership from `Math.floor(pixel / IW_ROOM_W_PX)` when variable-footprint rooms exist; use rect containment (`findRoomAtPixel`) or `getRoomRectTiles()`.

## 2026-06-18 - Playwright/debug verification hook
- `main.ts` exposes `globalThis.__abyssGame` only when `?debug=1` is present so Playwright can inspect `game.sceneManager.active`, `unifiedGrid`, `fullGrid`, and runtime room records.
- Verified `?debug=1&debugItemWorld=1`: `ItemWorldScene`, 7 generated cells, corridor count 0, all cells have `footprint` and `tileRect`, rect summary `48x36`, fullGrid `192x72`, no console errors.

## 2026-06-18 - Vertical socket carve uses footprint rect, not LDtk collision height
- Direct room attachment can place a 48x32 LDtk template in a 48x36 footprint slot. The extra bottom slot rows are initialized solid.
- `ItemWorldFullGridRuntime` now opens vertical exits against `cell.tileRect.w/h`, not only `ldtkLevel.collisionGrid` dimensions, so the 8-cell socket reaches the attached room seam.
- Playwright verified the down socket at `col=4,row=0`: seam rows `32..36` are air and a player dropped from the socket updates current room to `row=3`.

## 2026-06-18 - Geometry correction: base cell is 16x16, not 24x12
- Correction to earlier notes: the Item World logical slot cell is 16x16 tiles. Existing 48x32 LDtk rooms are exactly a 3x2 footprint, not 2x3.
- `IW_ROOM_SLOT_W_TILES` and `IW_ROOM_SLOT_H_TILES` are both 16. `RoomGraphAdapter` default footprint is `3x2`, and `tileRect` uses 16-tile multiples.
- Playwright verified `?debug=1&debugItemWorld=1`: rect summary `48x32`, footprint summary `3x2`, fullGrid `192x64`, corridor count 0, vertical seam open, drop updates current room to row 2.
- Prevention rule: do not reintroduce 24x12 geometry unless LDtk room authoring changes to that size. The current authoring target is 16x16 cell multiples.

## 2026-06-18 - Horizontal branch debug regeneration

- `horizontal_descent` graph generation now uses a variable horizontal spine plus downward side-branch budget. The macro graph remains horizontal + downward branches; L-shaped movement is expected to be authored inside rectangular LDtk rooms.
- In ItemWorld debug mode, `Shift+3` regenerates the current Item World at runtime with randomized rarity depth, archetype, and seed, then rebuilds the full map and respawns the player at the new start room.
- Prevention rule: do not add L-shaped macro graph nodes for Item World variety. Use `LRD`, `LR`, `L`, `R`, `D`, `UD`-style room authoring and put shape variety inside larger rooms.

## 2026-06-18 - Open top and borderless Item World grid

- Item World full-map build no longer adds generated outer boundary collision/visual frame.
- Closed upward exits no longer receive a synthetic ceiling seal. Closed downward exits still seal so floors/dead ends remain blocked unless the room graph opens a down exit.

## 2026-06-18 - Wider Item World cell culling buffer

- Item World cell visual culling now keeps a wider visible buffer around the camera. This prevents adjacent large-footprint rooms from disappearing at room seams while still destroying far-off rendered cells.

## 2026-06-18 - ItemStratum filler cells

- Empty slots inside each generated Item World stratum bounding rect are now filled with gameplay-inert filler cells, excluding slots already occupied by large room footprints.
- Filler cells use the LDtk template identifier `ItemStratum_Filler_01`, are excluded from room progress, enemy spawn, reward spawners, and player spawn capture.
- Prevention rule: filler cells are not graph nodes. Keep route/minimap/progression on graph cells only, and use filler cells only to visually/collision-fill macro voids.

## 2026-06-18 - Default room footprint is 1x1

- `RoomGraphAdapter` default room footprint is `1x1`. Large rooms must opt in via explicit `RoomNode.footprint` metadata before template picking.
- Prevention rule: do not use a large default footprint to reserve space for possible large templates. Graph placement decides footprint first; template picking must match that footprint later.

## 2026-06-18 - Template footprint matching is strict

- Item World template picking no longer falls back to arbitrary templates when no template matches the graph cell footprint.
- A graph cell with `footprint=1x1` can only render a 1x1 LDtk template. Large templates require an explicit larger graph footprint first.
- Prevention rule: never let template selection expand room footprint after graph placement; it causes room overlap and filler gaps.

## 2026-06-18 - Correction: ItemStratum base footprint

- Correction to the earlier default-footprint note: authored ItemStratum gameplay rooms are mostly `48x32` tiles, i.e. `3x2` of the 16x16 slot grid. `16x16` is the slot unit, not the common gameplay room footprint.
- `ItemStratum_Filler_01` is `16x16` tiles (`1x1` slot) and should only be used for filler cells.
- Keep default gameplay room footprint at `3x2`; larger templates such as `48x64` (`3x4`) require explicit graph footprint metadata and must not be selected for `3x2` graph cells.

## 2026-06-18 - Template-first footprint layout

- Item World procedural graph nodes now assign an LDtk `ItemStratum_*` template before layout when templates are available.
- Node footprint is derived from the assigned template size in 16x16-slot units (`gridW/16`, `gridH/16`), then graph embedding uses that footprint.
- Edge placement center-aligns sockets for mixed-size rooms instead of anchoring every child to the parent top-left.
- Render/template picking now prefers `UnifiedRoomCell.templateId`; runtime must not re-randomize a different template after layout.
- Filler remains `ItemStratum_Filler_01` and is a 1x1 slot visual/collision fill, not a graph node.

## 2026-06-18 - No mismatched-exit template fallback

- Template-first graph assignment now refuses templates whose LDtk edge openings do not exactly match the graph node exits.
- Runtime template picker also skips rooms instead of falling back to mismatched exits. This preserves graph/template integrity and prevents visually connected rooms from having incompatible collision openings.

## 2026-06-18 - Tile-coordinate socket alignment

- Item World graph placement now carries tile-coordinate room rects (`tileX/tileY/tileW/tileH`) in addition to representative slot `col/row`.
- Assigned LDtk templates provide edge-opening socket anchors derived from collision edge openings. Graph edges align those anchors, not just integer slot centers.
- This is intended to remove exact half-slot (8 tile) gaps when rooms with odd/even slot widths connect vertically or horizontally.

## 2026-06-18 - Authored templates skip runtime socket carve

- `ItemWorldFullGridRuntime.applyRoomCollision()` no longer applies runtime vertical socket carve/seal to cells with assigned `templateId`.
- Reason: authored LDtk ItemStratum templates already own their edge openings. Runtime `IW_ROOM_SOCKET_TILES=8` carving changed fullGrid to air, and `ItemWorldCellVisualRuntime` hides wall tiles over air, visually cutting an exact 8-tile strip from authored rooms.
- Prevention rule: only use runtime socket carve for legacy/unassigned cells; assigned LDtk templates must preserve authored collision/openings.

## 2026-06-18 - Rect-based Item World visual culling

- `ItemWorldCellVisualRuntime` now culls rendered room visuals by each record's actual world rectangle (`roomX`, `roomY`, `roomW`, `roomH`) instead of converting the camera view to fixed `col,row` windows.
- This matters for variable-footprint LDtk ItemStratum rooms: a large room can visually overlap several logical slots while still being anchored by one representative cell.
- Prevention rule: do not use representative `col,row` alone to decide Item World visual visibility or destruction. Use world-space room rectangles for culling and filter bounds.

## 2026-06-19 - Item World generation responsibility split

- Item World template interpretation moved into `game/src/level/ItemWorldTemplateCatalog.ts`.
  - Owns assignable LDtk ItemStratum filtering, 16x16-slot footprint calculation, edge exit set comparison, exit match scoring, and socket anchor extraction.
- Item World graph tile-space placement moved into `game/src/level/ItemWorldGraphLayout.ts`.
  - Owns template-footprint placement, socket-anchor alignment, graph edge maps, and deriving exits from placed graph edges.
- `RoomGraphAdapter.ts` remains the orchestration layer: generate graph, assign templates, embed layout, convert placements to `UnifiedGridData`, and fill inert filler cells.
- Prevention rule: do not add new LDtk template parsing or graph tile-placement math directly to `RoomGraphAdapter.ts`; add it to the catalog/layout modules and keep the adapter as orchestration.

## 2026-06-19 - Thin RoomGraphAdapter orchestration

- `RoomGraphAdapter.ts` is now a thin orchestration layer for Item World generation.
- Template assignment moved to `game/src/level/ItemWorldTemplateAssignment.ts`.
- Unified grid assembly and filler insertion moved to `game/src/level/ItemWorldUnifiedGridBuilder.ts`.
- The current generation pipeline is: `RoomGraph` generation/validation -> `ItemWorldTemplateAssignment` -> `ItemWorldGraphLayout` -> `ItemWorldUnifiedGridBuilder`.
- Prevention rule: keep graph generation policy, LDtk template assignment, tile-space layout, and unified-grid/filler assembly in separate modules. Do not rebuild a monolithic Item World adapter.

## 2026-06-19 - Full-map population helper owns room iteration and rect coordinates

- `ItemWorldFullMapPopulationHelpers.populateItemWorldFullMapRooms()` now owns unified-grid room iteration and room world/tile coordinate derivation.
- Room placement coordinates are derived from `UnifiedRoomCell.tileRect` first, then legacy fixed room fallback.
- `ItemWorldScene.buildFullMap()` now supplies callbacks for collision copy, room type assignment, reward/player spawn capture, and visual record registration instead of owning the nested room loop.
- Prevention rule: do not reintroduce `col * IW_ROOM_W_PX` / `absRow * IW_ROOM_H_PX` room placement math inside `ItemWorldScene`; use `populateItemWorldFullMapRooms()` or `tileRect`.

## 2026-06-19 - BuildFullMap orchestration and template override priority

- `ItemWorldScene.buildFullMap()` now delegates build reset and full-map layer rebuild to named private methods, and delegates room iteration/coordinate derivation to `populateItemWorldFullMapRooms()`.
- `ItemWorldTemplatePickerRuntime` priority is now filler -> memory/prologue placement -> assigned `cell.templateId` -> fallback selection. Memory/prologue placements must be able to override procedural assigned templates.
- `populateItemWorldFullMapRooms()` uses `cell.tileRect` for room position but keeps rendered room size from the selected LDtk level (`pxWid/pxHei`) so override templates are not cropped by the procedural cell footprint.
- Prevention rule: template override priority belongs in `ItemWorldTemplatePickerRuntime`; do not bypass it by reading `cell.templateId` directly in map-build code.

## 2026-06-19 - Full-map build reset owner

- `ItemWorldBuildStateRuntime` now owns the reset sequence for a fresh Item World full-map build.
- `ItemWorldScene.resetFullMapBuildState()` delegates to the runtime instead of directly clearing tile mutation, burnables, residue, containers, room state, player spawn records, cell visual records, and runtime cell spawn state.
- `ItemWorldScene.attachBuiltFullMap()` owns the post-build scene attachment step: add the full-map container, spawn the current visible cell, update visual culling, bind player collision, and set camera bounds.
- Prevention rule: when adding state that must be cleared during Item World rebuild, wire it through `ItemWorldBuildStateRuntime` rather than adding another direct clear call inside `buildFullMap()`.

## 2026-06-19 - Full-map attach owner

- `ItemWorldFullMapAttachRuntime` now owns the post-build attachment step for Item World full maps.
- It attaches the rebuilt full-map container to the scene, spawns the current visible cell, updates cell visibility, binds the player collision grid, and sets camera bounds.
- `ItemWorldScene.attachBuiltFullMap()` now delegates to this runtime and only passes built-grid dimensions and geometry constants.
- Prevention rule: post-build scene attachment, collision-grid binding, and camera bounds updates should stay in `ItemWorldFullMapAttachRuntime`; do not add these steps directly back into `buildFullMap()`.

## 2026-06-19 - Full-map room application boundary

- `populateItemWorldFullMapRooms()` now exports `PopulatedItemWorldFullMapRoom`, the typed payload for one selected room template placed in the unified full map.
- `ItemWorldScene.applyPopulatedFullMapRoom()` owns the per-room application callback: room type assignment, collision copy, reward spawn capture, cell visual record registration, player spawn capture, and current-room visited marking.
- `ItemWorldScene.buildFullMap()` no longer contains the per-room application body inline.
- Prevention rule: keep room iteration and coordinate derivation in `populateItemWorldFullMapRooms()`; keep per-room side effects in `applyPopulatedFullMapRoom()` or a future dedicated runtime, not inline inside `buildFullMap()`.

## 2026-06-19 - Full-map build orchestrator runtime

- `ItemWorldFullMapBuildRuntime` now owns the high-level full-map build sequence: reset build state, compute depth ratio, rebuild layers, create fullGrid, clear static entities, populate rooms, generate procedural deco, attach the built map, persist room state, and spawn procedural breakables.
- `ItemWorldScene.buildFullMap()` now delegates to this runtime and only passes geometry constants.
- `ItemWorldFullMapRoomApplyRuntime` owns per-room side effects during population; `ItemWorldFullMapAttachRuntime` owns post-build scene/camera/collision attachment.
- Prevention rule: do not add new full-map build steps directly to `ItemWorldScene.buildFullMap()`. Add them to the appropriate runtime (`BuildState`, `FullMapBuild`, `RoomApply`, `FullMapAttach`, or `FullMapLayer`).

## 2026-06-19 - Template picker priority methods

- `ItemWorldTemplatePickerRuntime` now exposes its selection priority internally as named methods: filler, memory/prologue override, assigned template, then fallback selection.
- This preserves the required override order while making fallback selection easier to extract later.
- `ItemWorldFullMapBuildRuntime` evaluates template-rendering readiness once per build before room population instead of checking the same scene state per room.
- Prevention rule: keep memory/prologue override before assigned procedural `templateId`; procedural assignment must not block explicit placement overrides.

## 2026-06-19 - Template fallback selector and build method phases

- `ItemWorldTemplateFallbackSelector` now owns fallback LDtk template matching: random pool filtering, desired room type selection, footprint matching, exact exit matching, and boss fallback scoring.
- `ItemWorldTemplatePickerRuntime` now only resolves priority: filler -> memory/prologue override -> assigned template -> fallback selector.
- `ItemWorldFullMapBuildRuntime.build()` is split into named phases: populate rooms, generate procedural decor, attach built map, and finalize build.
- Prevention rule: keep fallback matching out of `ItemWorldTemplatePickerRuntime`; picker should stay as an override-priority resolver.

## 2026-06-19 - Full-map layer binding boundary

- `ItemWorldFullMapLayerBindingRuntime` now owns binding a rebuilt `ItemWorldFullMapLayerSet` back to `ItemWorldScene` fields.
- `ItemWorldScene.rebuildFullMapLayers()` creates layers through `ItemWorldFullMapLayerRuntime`, then delegates field assignment to the binding runtime.
- This keeps layer creation, layer binding, build orchestration, room application, and post-build attachment as separate responsibilities.
- Prevention rule: do not spread `fullMapContainer`, aggregate layer, or deco/struct aggregate assignment throughout map build code; bind full-map layer sets through `ItemWorldFullMapLayerBindingRuntime`.

## 2026-06-19 - Room rect lookup owner

- `ItemWorldRoomRectRuntime` now owns Item World room rectangle lookup and pixel-to-room resolution.
- It resolves room rects in this order: rendered cell visual record, `UnifiedRoomCell.tileRect`, then legacy fixed-room fallback.
- `ItemWorldScene.getRoomRectTiles()` and `findRoomAtPixel()` now delegate to this runtime for compatibility with existing call sites.
- Prevention rule: do not add new `tileRect` fallback or pixel-to-room scanning logic directly in `ItemWorldScene`; use `ItemWorldRoomRectRuntime`.

## 2026-06-19 - TypeScript validation after Item World refactor

- Ran `npx tsc --noEmit` from `game/` after splitting Item World generation, full-map build, room application, attach, layer binding, and room-rect lookup responsibilities.
- Result: passed with no TypeScript errors.

## 2026-06-19 - RoomGraph debug is conceptual
- `game/src/level/RoomGraphDebugOverlay.ts` now draws the graph from topology only: critical path nodes are laid out horizontally and non-critical branches hang below their parent node.
- Do not use generated room pixel/tile positions for this overlay. It is a conceptual room-to-room graph view, not a minimap or world-space layout preview.

## 2026-06-19 - Item World generation runtime boundary
- `game/src/scenes/itemworld/ItemWorldGenerationRuntime.ts` owns Item World generation decisions: URL topology/archetype overrides, prologue forced dive selection, normal `RoomGraphAdapter` generation, and Shift+3 debug regeneration seed/rarity/depth/archetype randomization.
- `ItemWorldScene` should not import `RoomGraphAdapter`, `RoomGraphArchetypes`, or `PrologueDive` directly. It should apply generation results to scene state and continue with placement/build/spawn orchestration.
- Keep debug regeneration on the same generation runtime path so graph-layout experiments and normal generation do not drift.

## 2026-06-19 - Debug map refresh sequence owner
- `game/src/scenes/itemworld/ItemWorldDebugMapRefreshRuntime.ts` now owns the ordered Shift+3 debug regeneration refresh sequence after generation: apply generated map, compute memory placements, reset to start room, reset run state, rebuild environment, place player, activate start room, and show the debug toast.
- `ItemWorldScene.regenerateDebugItemWorldMap()` should only request a generation result from `ItemWorldGenerationRuntime` and pass it to the refresh runtime.
- Keep the refresh order centralized so debug map regeneration stays aligned with full-map rebuild, fluid reattach, player placement, HUD visibility, and first-room spawning.

## 2026-06-19 - Item World room spawn placement helper
- `ItemWorldScene.placePlayerAtRoomSpawn()` centralizes the common player placement mutation for normal room spawn placement: resolve spawn from `ItemWorldPlayerSpawnRuntime`, set player position, clear velocity, save previous position, snap camera, and optionally show gameplay HUD.
- Keep `ItemWorldPlayerSpawnRuntime` focused on spawn coordinate resolution. Do not move player/camera/HUD mutation into it unless introducing a dedicated placement runtime.
- Keep special entry-corridor completion placement separate while it needs custom velocity/camera-target behavior.

## 2026-06-19 - Stratum jump method phases
- `ItemWorldScene.jumpToStratum()` is split into named phases: resolve stratum start room, apply current stratum/room state, update progress, reset trapdoor state, place the player, activate the start room, and show the depth toast.
- Keep start-room activation idempotent through `roomSpawnState.hasSpawned()` so returning/jumping to a stratum does not double-spawn hub content.
- Future extraction target: move these phases into a dedicated stratum-jump runtime once the remaining direct scene field writes are narrowed further.

## 2026-06-19 - Stratum jump runtime owner
- `game/src/scenes/itemworld/ItemWorldStratumJumpRuntime.ts` now owns the ordered stratum jump sequence used by the stratum picker: guard current/out-of-range jumps, resolve start room, clear enemies, apply current stratum state, update progress, reset trapdoor state, place player, activate the start room, and show the depth toast.
- `ItemWorldScene.jumpToStratum()` should remain a thin delegate to this runtime.
- Keep direct scene field mutation behind named callbacks until a broader state object exists; do not re-inline the jump sequence in `ItemWorldScene`.

## 2026-06-19 - Stratum exit runtime owner
- `game/src/scenes/itemworld/ItemWorldStratumExitRuntime.ts` now owns the ordered stratum-exit preparation sequence: hide prompts, compute final/next-stratum state, update progress, mark final clear, hide cinematic HUD, clear damage numbers, and show the stratum-clear overlay.
- `ItemWorldScene.handleStratumExit()` should remain a thin delegate to this runtime.
- Keep progress/final-clear/HUD mutations behind named callbacks until those state owners are further narrowed; do not re-inline stratum-exit preparation into `ItemWorldScene`.

## 2026-06-19 - Stratum continue runtime owner
- `game/src/scenes/itemworld/ItemWorldStratumContinueRuntime.ts` now owns the ordered Continue-after-clear sequence: show gameplay HUD, reset flow state, punch the boss-floor trapdoor hole, play clear VFX, clear damage numbers, and show the descending-depth toast.
- `ItemWorldScene._continueToNextStratum()` should remain a thin delegate to this runtime.
- Keep aggregate-specific hole punch wiring inside `ItemWorldScene.punchBossFloorHoleForStratumContinue()` until full-map aggregate ownership is narrowed further; do not re-inline the Continue sequence.

## 2026-06-19 - Exit-after-boss runtime owner
- `game/src/scenes/itemworld/ItemWorldExitAfterBossRuntime.ts` now owns the ordered Exit-after-boss/clear-overlay escape sequence: set last safe stratum, request escape exit, persist room state, clean up for return result, and start exit fade.
- `ItemWorldScene._exitAfterBoss()` should remain a thin delegate to this runtime.
- This runtime is scoped to the boss/stratum-clear overlay Exit path; do not route unrelated death, ESC escape, absorb, or prologue-end exits through it without re-evaluating their requirements.

## 2026-06-19 - Return-result cleanup runtime owner
- `game/src/scenes/itemworld/ItemWorldReturnResultCleanupRuntime.ts` now owns the ordered cleanup sequence before showing the Item World return-result modal: hide gameplay HUD, clear toasts, hide world prompts, destroy stratum-clear overlay, hide boss choice, and hide escape confirm.
- `ItemWorldScene.cleanupForReturnResult()` should remain a thin delegate to this runtime.
- Keep route-specific exit handling separate from this cleanup runtime; it only handles shared UI/modal cleanup before the return-result presentation.

## 2026-06-19 - Exit cleanup runtime owner
- `game/src/scenes/itemworld/ItemWorldExitCleanupRuntime.ts` now owns the ordered cleanup sequence when leaving Item World: track exit analytics once, sync source-player HP, hide escape confirm, clean absorb dissolve, hide HUD depth/item EXP, detach HUD container, and clear the UI container.
- `ItemWorldScene.cleanupForExit()` should remain a thin delegate to this runtime.
- Keep death-path analytics guard behavior intact: death can mark exit telemetry earlier, so normal exit cleanup must call the guarded tracking callback rather than tracking directly.

## 2026-06-19 - Prologue death restart runtime owner
- `game/src/scenes/itemworld/ItemWorldPrologueDeathRestartRuntime.ts` now owns the ordered prologue Item World death-restart sequence: guard duplicate restarts, fire death dialogue, reset prologue run progress, respawn the source player, create the restarted scene, and perform the black cover swap/reveal.
- `ItemWorldScene.restartPrologueItemWorldAfterDeath()` should remain a thin delegate to this runtime.
- Keep restarted-scene construction in `ItemWorldScene.createRestartedPrologueItemWorldScene()` so callback transfer (`onComplete`, `onPrologueEnd`, tutorial flags, ego events) stays close to scene ownership.

## 2026-06-19 - Prologue run progress reset helper
- `game/src/scenes/itemworld/ItemWorldPrologueRunProgressReset.ts` now owns the field-level reset for prologue Item World death restart progress.
- It resets deepest unlock, visited/cleared/spawned room arrays, boss portals, last safe stratum, and `cleared`; it intentionally preserves `cycle`, matching the prior scene-local behavior.
- `ItemWorldScene.resetPrologueItemWorldRunProgress()` should only obtain the progress object and delegate to this helper.

## 2026-06-19 - Final exit runtime owner
- `game/src/scenes/itemworld/ItemWorldFinalExitRuntime.ts` now owns the final Item World exit dispatch after cleanup: exit to normal world completion or exit to prologue-end callback.
- `ItemWorldScene.exitItemWorld()` and `ItemWorldScene.exitItemWorldToPrologueEnd()` should remain thin delegates to this runtime.
- Keep route-specific cleanup in `ItemWorldExitCleanupRuntime`; this final runtime only chooses the post-cleanup callback target.

## 2026-06-19 - Trapdoor activation runtime owner
- `game/src/scenes/itemworld/ItemWorldTrapdoorActivationRuntime.ts` now owns the ordered trapdoor activation sequence: guard missing trapdoor, capture descent snapshot, dispose/hide prompt depending on final descent, clear transient UI, hide cinematic HUD, mark final clear and start absorb dissolve for world descent, or show the stratum-clear overlay for intermediate descent.
- `ItemWorldScene.startTrapdoorDescent()` should remain a thin delegate to this runtime.
- Keep final absorb startup in `ItemWorldScene.startFinalTrapdoorAbsorbDissolve()` and hole-punching in `ItemWorldStratumContinueRuntime`/`ItemWorldTrapdoorDescentRuntime`; activation should not own the later Continue hole punch.

## 2026-06-19 - Transition update runtime owner
- Removed unused `game/src/scenes/itemworld/ItemWorldReturnFlowRuntime.ts`; its responsibilities are now covered by narrower exit, return-result cleanup, final-exit, and transition-update runtimes.
- `game/src/scenes/itemworld/ItemWorldTransitionUpdateRuntime.ts` now owns the ordered transition update sequence: update exit fade and complete Item World exit when done, otherwise update post-clear hold.
- `ItemWorldScene.updateTransition()` should remain a thin delegate to this runtime.

## 2026-06-19 - Entry corridor runtime consolidation
- `ItemWorldScene` now uses the existing `game/src/scenes/itemworld/ItemWorldEntryCorridorRuntime.ts` as the owner for entry corridor activation, update, completion, color restoration, scene-exit cleanup, and destroy cleanup.
- Scene-local ownership of `ItemWorldEntryCorridorState`, `ItemWorldEntryCorridorVisibilityRuntime`, `ItemWorldEntryCorridorRevealRuntime`, and `ItemWorldEntryCorridorVisualRuntime` was removed from `ItemWorldScene`.
- Preserve collision binding through the runtime `setRoomData` callback: when entry corridor swaps between corridor grid and fullGrid, the scene must update both `roomData` and `bindPlayerCollisionGrid(player, grid)`.
- `ItemWorldScene.activateEntryCorridor()` and `updateEntryCorridor()` should remain thin delegates to `ItemWorldEntryCorridorRuntime`.

## 2026-06-19 - Room graph debug topology view
- game/src/level/RoomGraphDebugOverlay.ts draws the graph as conceptual topology, not generated room/world-space placement.
- Critical path stays horizontal; non-critical branches are compressed into abstract branch rows so long downward dives do not imply actual grid distance in the debug view.
- Keep Shift+2 graph debug focused on room connectivity validation. Use gameplay view/debug collision overlays for spatial placement issues.

## 2026-06-19 - Entity cleanup runtime owner
- game/src/scenes/itemworld/ItemWorldEntityCleanupRuntime.ts owns Item World entity cleanup sequences for enemy clears and static rebuild/exit cleanup.
- Enemy cleanup clears enemy registry, projectiles, pickups, residents, and neighbor pre-spawn state together.
- Static cleanup clears LDtk static registries, camera zones, memory/prologue triggers, residents, trapdoor prompt/object, and Item World anvils together.
- ItemWorldScene.clearEnemies() and clearStaticEntities() should stay thin delegates so rebuild, stratum jump, and exit paths use one cleanup owner.

## 2026-06-19 - Room state persistence helper
- ItemWorldScene.persistRoomState() and estoreRoomState() now centralize the repeated unifiedGrid + progress + roomSpawnState.spawnedRooms wiring into ItemWorldRoomStateRuntime.
- Runtime dependencies should receive callbacks to these helpers instead of rebuilding the three-argument state tuple in each caller.
- Keep ItemWorldRoomStateRuntime focused on serialization/restoration; scene-level helpers own the current scene state bundle until a broader Item World state context is introduced.

## 2026-06-19 - Boss defeat runtime owner
- game/src/scenes/itemworld/ItemWorldBossDefeatRuntime.ts owns the Item World boss-defeat handling sequence after ItemWorldBossClearRuntime.consumeDefeatedBoss(): room clear, first-boss save flag, floor-clear analytics, stage jump/fragment notice, boss heal, anvil flame drop, boss portal persistence, cinematic feedback, trapdoor/FloatingItemDrop spawn, and boss/trapdoor Ego dialogue gates.
- ItemWorldBossClearRuntime remains the delayed-step scheduler/defeated-boss consumer; do not re-expand reward and trapdoor side effects into ItemWorldScene.update().'
- ItemWorldScene.update() should call ossDefeatRuntime.consumeAndHandle() and then continue with room/stratum sync.

## 2026-06-19 - Room progression runtime owner
- game/src/scenes/itemworld/ItemWorldRoomProgressionRuntime.ts owns the active gameplay room progression sequence: resolve player foot position to room, sync current room, mark first visit, sync stratum/depth progress, spawn the room once, fire first-monster Ego dialogue, and trigger neighbor pre-spawn.
- ItemWorldScene.update() should call oomProgressionRuntime.update() after combat/projectile/contact updates and before HUD updates.
- Keep spawn-once and neighbor pre-spawn gates inside this runtime so current room, visited state, stratum progress, and pre-spawn state cannot drift across separate update blocks.

## 2026-06-19 - Death runtime owner
- game/src/scenes/itemworld/ItemWorldDeathRuntime.ts owns Item World player-death handling: analytics, prologue restart dispatch, normal death exit reason/telemetry, player-death Ego dialogue, death UI cleanup, earned EXP penalty, last-safe-stratum fallback, room-state persistence, respawn, and death ReturnResult presentation.
- ItemWorldScene.update() should call deathRuntime.update() after static/memory trigger updates and return immediately when it handles death.
- Keep prologue death restart details in ItemWorldPrologueDeathRestartRuntime; death runtime only chooses that route when saveAccess.isPrologue() is true.

## 2026-06-19 - Initial build runtime owner
- game/src/scenes/itemworld/ItemWorldInitialBuildRuntime.ts owns the Item World init-time environment build sequence: restore room state, count rooms, clear fluid/container staging state, build full map, resolve generic fluid tiles, init weather, attach FluidSystem, settle containers, show gameplay HUD, set camera zoom, place player, and optionally activate the entry corridor.
- ItemWorldScene.init() should call initialBuildRuntime.initialize() after HUD/toast/tutorial setup and before LoreDisplay creation/start gameplay.
- Keep this ordered sequence centralized because uildFullMap() must happen after spawner cleanup and before fluid generic resolution, fluid attach, container settling, and player placement.

## 2026-06-19 - Shared environment rebuild path
- ItemWorldInitialBuildRuntime.rebuildEnvironment() is the shared ordered path for Item World full-map environment rebuilds: clear fluid/container staging, mark FluidSystem not ready, build full map, resolve generic fluids, init weather, attach FluidSystem, mark ready, and settle containers.
- Initial entry calls initialize(), which wraps ebuildEnvironment() with room-state restore/counting, gameplay HUD, camera zoom, player placement, and optional entry corridor activation.
- Debug map regeneration must call initialBuildRuntime.rebuildEnvironment() instead of duplicating the build/attach sequence, so debug refresh and normal entry cannot drift.

## 2026-06-19 - Gameplay start runtime owner
- game/src/scenes/itemworld/ItemWorldGameplayStartRuntime.ts owns the Item World gameplay-start sequence after initial build or entry-corridor completion: one-shot entry gate, current-room spawned mark, current-room spawn, stratum banner toast, and optional stratum picker display.
- ItemWorldScene.startItemWorldGameplayAfterEntry() should remain a thin delegate to this runtime so normal entry and entry-corridor completion share the same start gate.
- Keep the start-spawn gate here; room progression handles later room changes, while this runtime handles only the first active gameplay spawn.

## 2026-06-19 - Lifecycle cleanup runtime owner
- game/src/scenes/itemworld/ItemWorldLifecycleCleanupRuntime.ts owns Item World scene lifecycle cleanup for exit() and non-super destroy() cleanup.
- exit() cleanup handles gamepad toast unsubscribe, parallax hide, toast/UI/carry/collision HUD cleanup, entry-corridor scene-exit update, absorb cleanup, trapdoor prompt cleanup, anvil/capture/static cleanup, lore/HUD/title/screen-flash detaches, low-HP/tutorial destruction, and debug/boss/weather/stratum-picker destruction.
- destroy() cleanup handles runtime/container final destruction that is safe before super.destroy(): entry corridor, weather, oxygen overlay, dev overlay, boss clear, capture orb, stratum picker, container carry, anvil runtime, parallax, damage numbers, and collision HUD.
- Keep super.destroy() in ItemWorldScene.destroy(); the lifecycle runtime must not destroy the scene root container directly.

## 2026-06-19 - Debug render runtime owner
- `game/src/scenes/itemworld/ItemWorldDebugRenderRuntime.ts` owns the Shift+I collision/hurtbox debug input assembly for Item World render.
- `ItemWorldScene.render()` should stay focused on player/enemy rendering, parallax scroll, and delegating collision debug overlay updates.
- Keep player/enemy debug box shape conversion out of the scene so future hurtbox/collision debug additions have one owner.

## 2026-06-19 - Cell visibility runtime owner
- `game/src/scenes/itemworld/ItemWorldCellVisibilityRuntime.ts` now owns the Item World cell visibility orchestration: viewport culling update, runtime cell spawning, and fluid refresh when the visible window changes.
- `ItemWorldScene.updateCellVisibility()` should remain a thin delegate because full-map attach, debug refresh, and normal update all need the same path.
- Keep low-level per-cell render/cull details in `ItemWorldCellVisualRuntime`; the visibility runtime owns scene-level wiring between camera, cell spawner, and fluid system refresh.

## 2026-06-19 - Onboarding jump hint owner
- `game/src/scenes/itemworld/ItemWorldOnboardingRuntime.ts` now owns the Item World jump tutorial hint dismissal state.
- `ItemWorldScene` should not keep separate jump tutorial handled/timer fields; it should delegate onboarding and tutorial hint input handling to the onboarding runtime.

## 2026-06-19 - HUD visibility runtime owner
- `game/src/scenes/itemworld/ItemWorldHudRuntime.ts` now owns Item World gameplay HUD blocker state and reconciliation.
- Keep durable HUD permission/state in the runtime via `setGameplayHudBlock()` and `reconcileGameplayHudVisibility()`; avoid reintroducing scene-local HUD visibility sets.
- Cinematic HUD hiding should go through `ItemWorldHudRuntime.hideForCinematic()` so boss HP, depth gauge, and item EXP are hidden together.

## 2026-06-19 - Debug map regeneration owner
- `game/src/scenes/itemworld/ItemWorldDebugMapRefreshRuntime.ts` now owns the Shift+3 debug map regeneration entrypoint.
- The scene may provide generation/state setter callbacks, but should not rebuild the debug regeneration sequence locally.

## 2026-06-19 - Damage increase toast helper
- `game/src/scenes/itemworld/ItemWorldDamageIncreaseToast.ts` owns the A6 damage increase toast calculation and localization call.
- Keep pure toast math out of `ItemWorldScene`; progress/controller callbacks should call the helper with a toast sink.

## 2026-06-19 - Prompt runtime owner
- `game/src/scenes/itemworld/ItemWorldPromptRuntime.ts` now owns Item World world-prompt suppression and hiding across UI controller, trapdoor prompt, and anvil prompt.
- `ItemWorldScene` should call `promptRuntime.hideWorldPrompts()`, `shouldSuppressWorldPrompts()`, or `hideIfSuppressed()` instead of directly mixing modal/transition checks with individual prompt hides.

## 2026-06-19 - Room query runtime owner
- `game/src/scenes/itemworld/ItemWorldRoomQueryRuntime.ts` now owns Item World room/end-room/final-room/boss-engagement queries and grid AABB-clear checks.
- Keep room topology queries out of `ItemWorldScene`; runtimes should receive callbacks to `roomQueryRuntime` methods.

## 2026-06-19 - Stratum exit runtime removed
- `game/src/scenes/itemworld/ItemWorldStratumExitRuntime.ts` was removed because it was no longer called after trapdoor activation and stratum-clear flows became the active path.
- The older wiki note saying `ItemWorldScene.handleStratumExit()` should delegate to this runtime is superseded; do not reintroduce the unused runtime unless a real caller is restored.

## 2026-06-19 - Thin delegate cleanup
- Pure delegate methods for continue/exit/return-result/final-exit/trapdoor-start were removed from `ItemWorldScene` where callbacks can call the owning runtime directly.
- Prefer direct runtime callback wiring over adding private scene methods that only forward one call.

## 2026-06-19 - Frame effects runtime owner
- `game/src/scenes/itemworld/ItemWorldFrameEffectsRuntime.ts` now owns the per-frame Item World effects update bundle that combines movement VFX, container physics, Ego shard projectile VFX, water/drop/ice/item pickup effects, and low-HP vignette update.
- Entry corridor and normal gameplay should call the same frame-effects runtime instead of duplicating the effect update sequence in `ItemWorldScene`.

## 2026-06-19 - More thin delegate cleanup
- Additional pure delegates were removed from `ItemWorldScene`: stratum picker jump forwarding, prologue death restart forwarding, exit cleanup forwarding, and transition update forwarding.
- Keep named scene methods only when they bundle meaningful scene state or are intentionally shared paths; direct callback wiring is preferred for one-call forwarding.

## 2026-06-19 - Trapdoor activation callback cleanup
- Trapdoor activation callbacks now call `ItemWorldHudRuntime` and absorb/final-clear side effects directly for simple one-call cases.
- Keep trapdoor object lifecycle helpers in the scene until trapdoor ownership is moved wholesale; do not split trapdoor destroy/capture logic across more local toggles.

## 2026-06-19 - Player spawn placement owner
- `game/src/scenes/itemworld/ItemWorldPlayerSpawnRuntime.ts` now owns Item World player spawn placement as well as spawn resolution.
- Use `placeAtRoom()` for room/stratum starts and `placeAtFloor()` for room-transition floor placement; these reset velocity, save previous position, and optionally snap the camera.
- Avoid reintroducing direct `player.x/y/vx/vy` placement logic in `ItemWorldScene` for Item World spawn/transition placement.

## 2026-06-19 - Room rect delegate cleanup
- `ItemWorldScene` no longer wraps `ItemWorldRoomRectRuntime.getRoomRectTiles()` and `findRoomAtPixel()` in private delegate methods.
- Runtimes should receive callbacks to `roomRectRuntime` directly when they need room rect or pixel-to-room queries.

## 2026-06-19 - Room graph debug compact topology
- game/src/level/RoomGraphDebugOverlay.ts now packs Shift+2 RoomGraph debug as abstract topology lanes instead of implying generated grid distance.
- Critical path remains a conceptual horizontal chain; branches alternate above/below and shrink labels when needed so the graph stays readable on one screen.
- Use this overlay for connectivity shape only, not room footprint, camera size, or LDtk placement validation.

## 2026-06-19 - Room transition and prologue restart delegate cleanup
- ItemWorldScene no longer keeps pure forwarding methods for room-transition player placement or prologue run-progress reset.
- Room transition callbacks call ItemWorldPlayerSpawnRuntime.placeAtFloor() directly, and prologue death restart callbacks call esetPrologueRunProgress(getOrCreateWorldProgress(item)) directly.
- Keep private scene helpers only when they bundle meaningful scene state or protect a shared lifecycle path.

## 2026-06-19 - Stratum continue presentation owner
- game/src/scenes/itemworld/ItemWorldStratumContinueRuntime.ts now owns the stratum-continue presentation side effects: boss floor hole punch, orange screen flash, camera shake, hitstop, damage-number clear, and descending-depth toast.
- ItemWorldScene only supplies state accessors and rendering aggregate accessors to the runtime; do not restore separate scene helper methods for these one sequence effects.

## 2026-06-19 - Trapdoor activation lifecycle owner
- game/src/scenes/itemworld/ItemWorldTrapdoorActivationRuntime.ts now owns trapdoor activation lifecycle details: descent snapshot capture, non-final trapdoor disposal, transient UI clear, cinematic HUD hide, final clear marking, absorb start, and stratum-clear overlay start.
- ItemWorldScene should provide trapdoor state/entity accessors only; do not re-add scene-local trapdoor activation helper methods for capture, transient UI clear, or disposal.

## 2026-06-19 - Template picker delegate cleanup
- ItemWorldScene no longer wraps ItemWorldTemplatePickerRuntime.pick() in a private pickLdtkTemplate() delegate.
- Full-map build wiring should call the template picker runtime directly; keep scene helper methods for shared ordered paths, not one-call forwarding.

## 2026-06-19 - Full-map layer rebuild owner
- game/src/scenes/itemworld/ItemWorldFullMapLayerRebuildRuntime.ts now owns the full-map layer rebuild + layer binding sequence.
- ItemWorldScene supplies palette/container accessors; ItemWorldFullMapBuildRuntime should call ullMapLayerRebuildRuntime.rebuild(depthRatio) instead of a scene-local rebuild wrapper.

## 2026-06-19 - Paused-frame update owner
- game/src/scenes/itemworld/ItemWorldPausedFrameRuntime.ts owns Item World paused-frame upkeep for entry freeze and prologue-end blocking sequences.
- It centralizes player velocity freeze, previous-position sync, HUD/text/damage/screen-flash updates, and camera upkeep during those early-return states.
- ItemWorldScene.update() should call this runtime instead of duplicating paused-frame presentation blocks.

## 2026-06-19 - Blocking transition update owner
- game/src/scenes/itemworld/ItemWorldBlockingTransitionRuntime.ts owns the Item World early-return transition gate for room transitions, absorb dissolve, and exit/post-clear flow hold.
- It preserves the HUD blocker order and routes room-transition player placement through ItemWorldPlayerSpawnRuntime.placeAtFloor() via scene callbacks.
- ItemWorldScene.update() should call this runtime instead of directly toggling oomTransition, bsorb, and lowHold HUD blocks.

## 2026-06-19 - Presentation frame update owner
- game/src/scenes/itemworld/ItemWorldPresentationFrameRuntime.ts owns the final active-gameplay presentation update order: HUD visibility/stat sync, oxygen, boss HP, HUD text, damage/effects, capture orb, boss clear delay, screen flash, frame effects, and camera clamp.
- ItemWorldScene.update() should end active gameplay by calling this runtime, leaving stat value calculations in scene callbacks where player/HUD state is still owned.

## 2026-06-19 - Gameplay simulation update owner
- game/src/scenes/itemworld/ItemWorldGameplaySimulationRuntime.ts owns the active gameplay simulation phase after modal/transition gates pass.
- The runtime preserves update order for unavailable input, player/container grounding, player update, tutorial hints, updraft/debug/Ego shard/container/static/memory updates, death early-return, enemies, residents, trapdoor/anvil prompts, cell visibility, combat, pickups, projectiles, boss defeat handling, and room progression.
- ItemWorldScene.update() should call this runtime and return when it reports death/exit handling before presentation-frame updates.

## 2026-06-19 - Modal gate update owner
- game/src/scenes/itemworld/ItemWorldModalGateRuntime.ts owns Item World modal/blocking gates before gameplay simulation: feedback panel, area title tick, return-result modal, toast/debug HUD sync, onboarding input block, stratum picker, lore display pause, entry corridor update, and boss-choice input after prompt suppression.
- ItemWorldScene.update() should call modalGateRuntime.updatePreGameplay(dt) before paused-frame/escape/prologue gates and modalGateRuntime.updateBossChoice() after prompt suppression, preserving the old ordering.

## 2026-06-19 - Ambient frame update owner
- game/src/scenes/itemworld/ItemWorldAmbientFrameRuntime.ts owns per-frame ambient upkeep before modal gates: input interaction-frame commit, weather update, and entry-corridor color restore.
- ItemWorldScene.update() should start with this runtime so prompt suppression buffering and ambient visuals keep a single update order across modal and gameplay states.

## 2026-06-19 - ItemWorldScene wiring block split
- ItemWorldScene wiring is split by responsibility: interaction/UI flow, boss/stratum clear, stratum/panel, memory/combat/hazard, full-map build, room state/spawn, cell/static entities, enemy/HUD, and entity cleanup.
- Keep full-map build pipeline construction in wireFullMapBuildRuntimes() and cell/static entity construction in wireCellAndStaticEntityRuntimes(); do not fold them back into room-state or memory/combat wiring blocks.
- Some callbacks intentionally reference runtimes assigned later; they are invoked after all wiring completes during init/update, so preserve call order rather than eagerly invoking them during construction.

## 2026-06-19 - Init palette and player setup helpers
- game/src/scenes/itemworld/ItemWorldPaletteSetup.ts owns Item World palette filter construction, fallback palette selection, interior dimming, and per-weapon visual micro-variation.
- game/src/scenes/itemworld/ItemWorldPlayerSetup.ts owns cloning Item World player stats/abilities from the source player, attack enablement, fluid overlay query, fixed 3-flask baseline, and flask heal callback assignment.
- Keep these init rules out of ItemWorldScene.init() so scene init remains an ordered orchestration of assets, topology, render layers, player/effects, HUD, and initial build.

## 2026-06-19 - Room graph debug conceptual spacing
- Shift+2 RoomGraph debug spacing is now explicitly conceptual: branch lanes and branch node steps use compressed display-only units instead of grid/world distance or room footprint.
- Treat the overlay as a topology sketch like Start-Room-Room-Boss; do not infer actual generated room size, shaft length, or LDtk placement from node distance.

## 2026-06-19 - Item World asset bootstrap owner
- game/src/scenes/itemworld/ItemWorldAssetBootstrap.ts owns Item World asset bootstrap: theme slug resolution, item_world bundle prefetch, HUD skin load, area tileset preload, LDtk template cloning, LdtkRenderer creation, and authored LDtk tileset loading.
- ItemWorldScene.init() should only assign the bootstrap result to scene fields; do not restore template clone/load loops or asset bundle calls directly in the scene.

## 2026-06-19 - Item World VFX manager setup owner
- game/src/scenes/itemworld/ItemWorldVfxManagersSetup.ts owns construction of Item World damage-number, hit-spark, movement VFX, fluid-residue, pickup-glow, and low-HP vignette managers.
- ItemWorldScene.init() should request the VFX manager bundle and assign scene fields; keep runtime wiring and update order in the scene/runtimes, not in the setup helper.

## 2026-06-19 - Item World render layer setup owner
- game/src/scenes/itemworld/ItemWorldRenderLayerSetup.ts owns Item World render-layer bootstrap: tilemap, palette filters, parallax background, building/resident/entity layers, collision debug overlay, tile mutator renderer, fluid layers/systems, weather layer, and updraft system construction.
- ItemWorldScene.init() should assign the returned layer/system bundle and keep gameplay runtime wiring/update order outside this setup helper.

## 2026-06-19 - Item World player entity setup owner
- game/src/scenes/itemworld/ItemWorldPlayerEntitySetup.ts owns Item World player entity creation, source-player stat configuration, entity-layer attachment, and ArcTether creation/attachment.
- ItemWorldPlayerSetup remains the stat/ability copy helper; ItemWorldScene.init() should inject fluid/flask callbacks and assign the returned player/tether fields instead of constructing them directly.

## 2026-06-19 - Item World UI bootstrap owner
- game/src/scenes/itemworld/ItemWorldUiBootstrapSetup.ts owns Item World HUD/UI bootstrap construction: HUD baseline gold, area title, UI controller, spawn/progress controllers, toast/gamepad toast binding, tutorial hint, low-HP heal hint, and lore display creation/attachment.
- ItemWorldScene.init() should inject scene-specific callbacks and keep return-result skin application/initial build ordering in the scene; do not restore direct HUD/UI constructors in init.

## 2026-06-19 - Item World screen overlay setup owner
- game/src/scenes/itemworld/ItemWorldScreenOverlaySetup.ts owns Item World screen overlay construction: ScreenFlash creation/legacy UI attachment and fade overlay Graphics creation/scene attachment.
- ItemWorldScene.init() should assign the returned overlay fields; keep transition runtimes as the users of those overlays, not the constructors.

## 2026-06-19 - Item World gameplay entity runtime wiring
- ItemWorldScene.wireGameplayEntityRuntimes() owns late gameplay entity runtime construction that depends on initialized player/layers/VFX: movement VFX, container physics, pickup, projectile, enemy contact, static entity runtime, and entity cleanup runtime wiring.
- Keep this as a scene private wiring method rather than an external helper because it closes over many scene-owned callbacks and mutable runtime fields.

## 2026-06-19 - Item World VFX and fluid reaction wiring
- ItemWorldScene.wireVfxAndFluidReaction() owns late VFX assignment plus FluidReactionRuntime binding, EgoShard entity-layer initialization, and wall-tile mutation callback wiring.
- Keep the construction of individual VFX managers in ItemWorldVfxManagersSetup, but keep reaction/mutation callbacks in the scene private method because they depend on scene-owned grid, full-map layer, tile hazard, and camera callbacks.

## 2026-06-19 - Item World init run/generation staging
- ItemWorldScene.initializeRunEntryState() owns initial strata config, prologue one-stratum override, re-dive progress reset, ego dialogue seed init, analytics entry tracking, RNG, and HitManager creation.
- ItemWorldScene.buildInitialGridAndMemoryPlacements() owns initial RoomGraph/full-grid generation and memory-room placement injection/computation.
- ItemWorldScene.selectInitialRoomFromProgress() owns starting room selection from saved progress and captures the stratum-start item snapshot.
- Keep these as scene private staging methods because they mutate scene-owned fields used by later render/player/runtime bootstrap steps.

## 2026-06-19 - Item World render/player staging methods
- ItemWorldScene.assignInitialRenderLayers() owns assignment of the render-layer setup bundle returned by ItemWorldRenderLayerSetup.
- ItemWorldScene.createInitialPlayerEntity() owns assignment of the player/tether entity setup returned by ItemWorldPlayerEntitySetup while keeping ItemWorld-specific flask/fluid callbacks in the scene.
- Keep these as scene private staging methods so ItemWorldScene.init() reads as the ordered bootstrap pipeline: assets, spawn table, run state, grid/memory, start room, render layers, player, VFX/reactions, gameplay runtimes, overlays, UI, initial build.

## 2026-06-19 - Item World overlay/UI staging methods
- ItemWorldScene.assignInitialScreenOverlays() owns assignment of the screen/fade overlay setup bundle returned by ItemWorldScreenOverlaySetup.
- ItemWorldScene.assignInitialUiBootstrap() owns assignment of the HUD/UI bootstrap bundle returned by ItemWorldUiBootstrapSetup while keeping skin application and return-result creation ordering in init.
- Keep these as scene private staging methods so init remains an ordered bootstrap pipeline and UI policy stays centralized in the existing HUD/UI runtimes.

## 2026-06-19 - Item World asset/final bootstrap staging
- ItemWorldScene.applyAssetBootstrap() owns assignment of the asset bootstrap result fields and returns the pending HUD skin load promise for init ordering.
- ItemWorldScene.finishInitialBootstrap() owns the final init completion sequence after HUD skin load: apply HUD skin, create return-result UI, initialize the initial build runtime, mark initialized, and start gameplay when no entry corridor is active.
- Keep these as scene private staging methods so init keeps only ordered bootstrap calls and the final start condition remains explicit.

## 2026-06-19 - Item World initial data staging
- ItemWorldScene.prepareInitialData() owns init-time non-asset data preparation: procedural-decor enable flag from URL params and Item World spawn-table loading.
- Keep this separate from asset bootstrap so init preserves the ordering: load assets first, then prepare runtime data before run/progress/generation state.

## 2026-06-19 - ItemWorldScene type-only import boundary
- After moving render/player/VFX/UI constructors into setup helpers, ItemWorldScene imports those classes as type-only when it only stores scene fields or callback types.
- Keep value imports in ItemWorldScene only for objects it still constructs directly or constants/functions it invokes; new setup helpers should own constructor imports.

## 2026-06-19 - Item World frame/gate runtime wiring
- ItemWorldScene.wireFrameAndGateRuntimes() owns constructor-time setup for frame/query/gate runtimes: room query, frame effects, paused-frame handling, blocking transitions, presentation frame, gameplay simulation, modal gate, and ambient frame.
- Keep these together because they define the high-level update pipeline used by ItemWorldScene.update(); constructor code should call the wiring method rather than inline those runtime constructors.

## 2026-06-19 - Item World debug map and stratum jump wiring
- ItemWorldScene.wireDebugMapAndStratumJumpRuntimes() owns constructor-time setup for debug map state/refresh runtimes and stratum jump state/action runtimes.
- Keep this block separate from frame/gate wiring because it mutates generated map state, room spawn state, progress, and player placement during debug regeneration or stratum jump flows.

## 2026-06-19 - Room graph debug topology-only layout
- Shift+2 RoomGraph debug now treats node positions as topology-only display coordinates: critical path is forced into a compact horizontal Start-Room-...-Boss chain, and branches wrap near their parent.
- Do not use generated grid coordinates, LDtk level size, vertical shaft length, or room footprint when drawing this overlay; it is a conceptual graph, not a minimap.

## 2026-06-19 - Item World exit and lifecycle wiring
- ItemWorldScene.wireExitFlowRuntimes() owns constructor-time exit/return/prologue-death/final-exit runtime wiring: stratum continuation, boss exit request, return-result cleanup, exit cleanup, prologue death restart, and final exit callbacks.
- ItemWorldScene.wireLifecycleAndBuildRuntimes() owns trapdoor activation, transition update, death flow, initial build, gameplay start, lifecycle cleanup, and debug render runtime wiring.
- Keep these callback-heavy runtimes in scene private wiring methods rather than direct constructor blocks; the constructor should read as ordered wiring calls only.

## 2026-06-19 - Item World constructor wiring entrypoint
- ItemWorldScene constructor should assign injected dependencies, then call wireConstructorRuntimes() as the single constructor wiring entrypoint.
- wireConstructorRuntimes() preserves the ordered runtime wiring sequence; add new constructor-time runtime groups there instead of appending direct calls to the constructor body.

## 2026-06-19 - Gameplay entity runtime wiring split
- ItemWorldScene.wireGameplayEntityRuntimes() is the ordered entrypoint only: movement VFX, container physics, pickup/projectile, cleanup, enemy contact, then static entity runtime.
- Keep individual callback-heavy constructors in wireMovementVfxRuntime(), wireContainerPhysicsRuntime(), wirePickupAndProjectileRuntimes(), wireEnemyContactRuntime(), and wireStaticEntityRuntime() rather than re-expanding wireGameplayEntityRuntimes().
- Preserve the cleanup runtime position after projectile/pickup construction because ItemWorldEntityCleanupRuntime receives those runtime instances.

## 2026-06-19 - Enemy and HUD runtime wiring split
- ItemWorldScene.wireEnemyAndHudRuntimes() is the ordered entrypoint only: enemy/room runtimes, dev/weather/picker runtimes, then camera/HUD/progression runtimes.
- Keep enemy spawn/encounter/clear/memory-shard wiring in wireEnemyRoomRuntimes(), debug/weather/stratum picker wiring in wireDevWeatherAndPickerRuntimes(), and camera zone/boss HP/room progression wiring in wireCameraHudProgressionRuntimes().
- Preserve this order because later progression/HUD callbacks expect the enemy registry, debug overlay, weather, and picker runtimes to already exist.

## 2026-06-19 - Full-map build wiring split
- ItemWorldScene.wireFullMapBuildRuntimes() is the ordered entrypoint only: template/memory placement, build-state reset, layer runtimes, room-apply runtime, build pipeline, then boundary visuals.
- Keep template picker and memory placement wiring in wireFullMapTemplateRuntimes(), reset callbacks in wireFullMapBuildStateRuntime(), aggregate/layer rebuild wiring in wireFullMapLayerRuntimes(), collision/spawner capture in wireFullMapRoomApplyRuntime(), and procedural-decor/full-map build orchestration in wireFullMapBuildPipelineRuntime().
- Preserve this order because build pipeline callbacks depend on template picker, build-state, layer rebuild, room apply, and procedural deco runtimes already existing.

## 2026-06-19 - Stratum and panel runtime wiring split
- ItemWorldScene.wireStratumAndPanelRuntimes() is the ordered entrypoint only: stratum transition/Ego shard, unavailable input/absorb dissolve, entry corridor, then capture/dialogue runtimes.
- Keep exit fade and Ego shard cast/combat/projectile wiring in wireStratumTransitionAndEgoShardRuntimes(), input blocking and absorb dissolve in wireInputAndAbsorbRuntimes(), entry-corridor callbacks in wireEntryCorridorRuntime(), and capture-orb/Ego dialogue wiring in wireCaptureAndDialogueRuntimes().
- Preserve this order because Ego shard projectile callbacks depend on Ego shard combat, absorb depends on exit fade, and entry/capture/dialogue callbacks are invoked after render/player/bootstrap state exists.

## 2026-06-19 - Memory combat hazard wiring split
- ItemWorldScene.wireMemoryCombatAndHazardRuntimes() is the ordered entrypoint only: memory/prologue, resident, enemy combat, then hazard/fluid impact runtimes.
- Keep memory trigger and prologue-end wiring in wireMemoryAndPrologueRuntimes(), resident and safe-room resident spawn wiring in wireResidentRuntimes(), combat kill/drop/EXP wiring in wireEnemyCombatRuntime(), and tile hazard/container fluid/Ego shard impact wiring in wireHazardAndFluidImpactRuntimes().
- Preserve this order because resident callbacks depend on Ego dialogue state, enemy combat callbacks depend on pickup runtime availability at use time, and fluid impact callbacks depend on tile hazard active bounds.

## 2026-06-19 - Cell and static entity wiring split
- ItemWorldScene.wireCellAndStaticEntityRuntimes() is the ordered entrypoint only: cell geometry, runtime cell visibility, static entity spawning, then reward/destruction runtimes.
- Keep cell visual and room rect wiring in wireCellGeometryRuntimes(), runtime cell spawner and cell visibility wiring in wireRuntimeCellVisibilityRuntimes(), authored static entity spawning in wireStaticEntitySpawnerRuntime(), and rewards/breakables/container destruction in wireRewardAndDestructionRuntimes().
- Preserve this order because runtime cell spawning depends on cell visual records, static spawning callbacks register memory/prologue/camera/anvil entities, and reward/destruction callbacks depend on pickup/container registries at use time.

## 2026-06-19 - Room state and spawn wiring split
- ItemWorldScene.wireRoomStateAndSpawnRuntimes() is the ordered entrypoint only: room state/player spawn, then neighbor pre-spawn/room spawn flow.
- Keep room state, player spawn, and room type wiring in wireRoomStateAndPlayerSpawnRuntimes(); keep neighbor pre-spawn and room spawn orchestration in wireRoomSpawnFlowRuntimes().
- Preserve this order because room spawn flow callbacks depend on room type, player spawn, room rect, enemy spawn, memory placement, and reward runtimes being available at use time.

## 2026-06-19 - Interaction UI flow wiring split
- ItemWorldScene.wireInteractionAndUiFlowRuntimes() is the ordered entrypoint only: screen/camera flow, world interaction prompts, then HUD/onboarding/escape runtimes.
- Keep oxygen overlay, room transition, and camera runtime wiring in wireScreenAndCameraFlowRuntimes(); container carry, trapdoor, anvil, and prompt wiring in wireWorldInteractionPromptRuntimes(); HUD, onboarding, and escape wiring in wireHudOnboardingAndEscapeRuntimes().
- Preserve this order because prompt suppression callbacks depend on transition/trapdoor/anvil runtime instances, and HUD/escape callbacks are consumed later by modal and transition gates.

## 2026-06-19 - Boss and stratum clear wiring split
- ItemWorldScene.wireBossAndStratumClearRuntimes() is the ordered entrypoint only: boss choice/stratum clear UI first, then boss clear/defeat flow.
- Keep boss choice and stratum-clear overlay wiring in wireBossChoiceAndStratumClearRuntimes(); keep boss clear delay plus boss defeat/trapdoor/absorb/dialogue callbacks in wireBossDefeatFlowRuntimes().
- Preserve this order because ItemWorldBossDefeatRuntime depends on ItemWorldBossClearRuntime and later callbacks depend on trapdoor, room rect, absorb, pickup, and dialogue runtimes being available at use time.

## 2026-06-19 - Frame and gate wiring split
- ItemWorldScene.wireFrameAndGateRuntimes() is the ordered entrypoint only: frame query/effects, paused/blocking gates, presentation/simulation, then modal/ambient gates.
- Keep room query and frame effects wiring in wireFrameQueryAndEffectsRuntimes(), paused-frame and blocking-transition gates in wirePausedAndBlockingGateRuntimes(), presentation and active gameplay simulation in wirePresentationAndSimulationRuntimes(), and modal/ambient gates in wireModalAndAmbientGateRuntimes().
- Preserve this order because presentation depends on frame effects, simulation depends on gameplay runtimes at use time, and modal/ambient gates define the update early-return order used by ItemWorldScene.update().

## 2026-06-19 - VFX and fluid reaction wiring split
- ItemWorldScene.wireVfxAndFluidReaction() is the ordered entrypoint only: create VFX bundle, assign core VFX managers, initialize Ego shard layer, bind fluid reactions, bind tile mutation reactions, then assign ambient VFX managers.
- Keep combat/core VFX field assignment in assignCoreVfxManagers(), FluidReactionRuntime binding in bindFluidReactionRuntime(), TileMutator wall-change side effects in bindTileMutationReactions(), and water/drop-through/item-glow/low-HP ambient managers in assignAmbientVfxManagers().
- Preserve this order because fluid reactions depend on core VFX fields, tile mutation callbacks depend on tile hazard/full-map layer runtimes, and later frame updates expect ambient VFX fields assigned before gameplay starts.

## 2026-06-19 - Room graph debug conceptual branch layout
- Shift+2 RoomGraph debug should render an abstract topology diagram, not a generated-grid/minimap view: critical path stays horizontal and side branches stay as short conceptual room chains near their parent.
- Do not infer room footprint, shaft length, LDtk level dimensions, or actual generated grid alignment from this overlay; use gameplay view/minimap/debug grid for physical placement issues.


## 2026-06-19 - Exit lifecycle debug wiring split
- ItemWorldScene.wireExitFlowRuntimes() is the ordered entrypoint only: stratum continuation, boss-exit/return-result cleanup, then world/prologue/final exit cleanup.
- ItemWorldScene.wireLifecycleAndBuildRuntimes() is the ordered entrypoint only: trapdoor/transition, death/initial build, gameplay start/lifecycle cleanup, then debug render.
- ItemWorldScene.wireDebugMapAndStratumJumpRuntimes() is the ordered entrypoint only: debug map regeneration runtimes first, stratum jump runtimes second.
- Keep these callback-heavy constructor-time runtimes inside scene private wiring methods; do not re-expand direct constructor blocks into the ItemWorldScene constructor.


## 2026-06-19 - ItemWorldScene init/update staging
- ItemWorldScene.init() is the ordered bootstrap entrypoint only: asset/data bootstrap, run/grid selection, render/player/gameplay wiring, overlay/UI bootstrap, then final HUD-skin-dependent completion.
- Keep the stage bodies in bootstrapInitialAssetsAndData(), initializeInitialRunAndGrid(), initializeInitialRenderAndGameplay(), and initializeInitialOverlaysAndUi(); do not re-expand long setup sequences into init().
- ItemWorldScene.update() is the ordered frame entrypoint only: pre-gameplay gates, prompt suppression, blocking/gameplay gates, then presentation frame update.
- Preserve early-return order inside updatePreGameplayFrame() and updateBlockingGameplayFrame(); these methods define modal/transition/gameplay priority.


## 2026-06-19 - Item World feedback context helper
- game/src/scenes/itemworld/ItemWorldFeedbackContext.ts owns Item World FeedbackPanel context DTO construction: player tile coordinate, equipped weapon id, HP percentage, and entry-corridor level id.
- Keep getFeedbackContext() in ItemWorldScene as a thin adapter only; do not re-add coordinate/HP snapshot math directly to the scene.


## 2026-06-19 - Item World restart scene factory
- game/src/scenes/itemworld/ItemWorldSceneRestartFactory.ts owns continuation-state copying for restarted ItemWorldScene instances: onComplete, onPrologueEnd, tutorial completion, and Ego unlocked events.
- Keep ItemWorldScene.createRestartedPrologueItemWorldScene() as a thin constructor adapter; do not re-add continuation field copying directly to the scene method.
- The factory intentionally accepts a createScene callback instead of importing ItemWorldScene to avoid a scene/factory circular runtime import.


## 2026-06-19 - Initial room selection helper
- game/src/scenes/itemworld/ItemWorldInitialRoomSelection.ts owns initial Item World start-room selection from saved progress, deepest unlocked stratum, unified grid offsets, and stratum start rooms.
- Keep ItemWorldScene.selectInitialRoomFromProgress() as a thin field-application adapter plus stratum-start snapshot capture; do not re-add progress/grid selection logic directly to the scene.


## 2026-06-19 - Run entry state helper
- game/src/scenes/itemworld/ItemWorldRunEntryState.ts owns Item World run-entry decisions: rarity strata config, prologue one-stratum override, existing world progress lookup, and cleared-item cycle reset.
- Keep ItemWorldScene.initializeRunEntryState() as the scene-runtime initializer: apply entry state, log reset cycle, initialize Ego dialogue/RNG/analytics/HitManager, and return forcePrologue.
- Do not re-add STRATA_BY_RARITY or resetItemForNextCycle logic directly to ItemWorldScene.


## 2026-06-19 - Initial grid and memory placement staging
- ItemWorldScene.buildInitialGridAndMemoryPlacements() is the ordered entrypoint only: generate initial grid, apply generated grid/graphs/dev overlay, then initialize memory placements.
- Keep generation invocation in generateInitialGrid(), scene field assignment in applyInitialGenerationResult(), and forced-vs-computed memory placement handling in initializeInitialMemoryPlacements().
- ItemWorldGenerationRuntime remains the owner of actual graph/unified-grid generation; ItemWorldScene should only apply the result and wire memory placement state.


## 2026-06-19 - Asset and render bundle application staging
- ItemWorldScene.applyAssetBootstrap() should only apply asset bootstrap fields and return the HUD skin load promise; keep field assignment in applyAssetBootstrapFields().
- ItemWorldScene.assignInitialRenderLayers() should only orchestrate render-layer bundle creation and application; keep setupItemWorldRenderLayers invocation in createInitialRenderLayerBundle() and scene field assignment in applyInitialRenderLayerBundle().
- Do not mix bundle construction and scene field fan-out in the same method when adding new Item World bootstrap bundles.


## 2026-06-19 - UI and overlay bundle application staging
- ItemWorldScene.assignInitialScreenOverlays() should only orchestrate screen-overlay bundle creation/application; keep setupItemWorldScreenOverlays() in createInitialScreenOverlayBundle() and scene field fan-out in applyInitialScreenOverlayBundle().
- ItemWorldScene.assignInitialUiBootstrap() should only orchestrate UI bootstrap bundle creation/application; keep setupItemWorldUiBootstrap() in createInitialUiBootstrapBundle() and scene field fan-out in applyInitialUiBootstrapBundle().
- Bootstrap bundle methods should follow the same pattern: assign*() entrypoint, create*Bundle() construction, apply*Bundle() scene field assignment.


## 2026-06-19 - Player bootstrap callback boundary
- ItemWorldPlayerEntitySetup owns player/ArcTether creation and source-player configuration only.
- ItemWorldScene.createInitialPlayerEntity() should pass callbacks as thin delegates; scene-side VFX/UI side effects for flask healing live in handlePlayerFlaskHeal().
- Do not move screen flash, damage numbers, or flask burst effects into ItemWorldPlayerEntitySetup; that helper should remain construction/configuration-only.


## 2026-06-19 - Final initial bootstrap staging
- ItemWorldScene.finishInitialBootstrap() is the ordered final bootstrap entrypoint only: apply loaded HUD skin, create return-result UI, initialize initial build runtime, mark initialized, then start gameplay when the entry corridor is inactive.
- Keep HUD skin application in applyLoadedHudSkin(), return-result UI creation in createInitialReturnResultUi(), initialized flag mutation in markInitialBootstrapComplete(), and entry-corridor start gate in startGameplayIfEntryCorridorInactive().
- Preserve this order because initial build and gameplay start depend on all asset/render/player/VFX/overlay/UI bootstrap stages already being applied.


## 2026-06-19 - ItemWorldScene state surface cleanup
- Removed unused outsideRenderer/outsideLevel state from ItemWorldScene; full-map rendering should use the current full-map/layer runtimes rather than legacy outside-level render fields.
- When refactoring ItemWorldScene, prefer deleting stale scene fields after confirming no reads/writes remain instead of leaving compatibility state around.


## 2026-06-19 - Gameplay start and lifecycle cleanup wiring split
- ItemWorldScene.wireGameplayStartAndCleanupRuntimes() is the ordered entrypoint only: gameplay-start runtime first, lifecycle-cleanup runtime second.
- Keep gameplay entry/start callbacks in wireGameplayStartRuntime(); keep scene exit/destroy cleanup callbacks in wireLifecycleCleanupRuntime().
- Do not mix gameplay start policy with cleanup/destruction policy in the same constructor-time wiring method.


## 2026-06-19 - Entry corridor dependency wiring split
- ItemWorldScene.wireEntryCorridorRuntime() should only construct ItemWorldEntryCorridorRuntime from grouped dependency bundles.
- Keep world/grid/template callbacks in createEntryCorridorWorldDeps(), player/frame callbacks in createEntryCorridorPlayerFrameDeps(), camera callbacks in createEntryCorridorCameraDeps(), hide/restore targets in createEntryCorridorVisibilityDeps(), and entry-flow callbacks in createEntryCorridorFlowDeps().
- Do not re-expand the flat ItemWorldEntryCorridorRuntime dependency object directly inside wireEntryCorridorRuntime(); grouping keeps corridor lifecycle, visibility, and player-frame responsibilities traceable.


## 2026-06-19 - Death and initial build wiring split
- ItemWorldScene.wireDeathAndInitialBuildRuntimes() is the ordered entrypoint only: death runtime first, initial-build runtime second.
- Keep death/return-result callbacks in wireDeathRuntime(); keep first environment build, fluid/container reset, weather init, player placement, and entry corridor activation callbacks in wireInitialBuildRuntime().
- Do not mix death-return policy with initial map/bootstrap build policy in one constructor-time wiring method.


## 2026-06-19 - Presentation and gameplay simulation wiring split
- ItemWorldScene.wirePresentationAndSimulationRuntimes() is the ordered entrypoint only: presentation frame runtime first, gameplay simulation runtime second.
- Keep HUD/VFX/camera presentation callbacks in wirePresentationFrameRuntime(); keep active gameplay simulation callbacks in wireGameplaySimulationRuntime().
- Do not mix post-simulation presentation updates with active gameplay state mutation in one constructor-time wiring method.


## 2026-06-19 - Boss clear and defeat wiring split
- ItemWorldScene.wireBossDefeatFlowRuntimes() is the ordered entrypoint only: boss-clear timing runtime first, boss-defeat handling runtime second.
- Keep ItemWorldBossClearRuntime construction in wireBossClearRuntime(); keep boss defeat rewards, trapdoor/absorb preparation, first-boss save flags, and Ego dialogue callbacks in wireBossDefeatRuntime().
- Preserve this order because ItemWorldBossDefeatRuntime receives ItemWorldBossClearRuntime through getBossClearRuntime().


## 2026-06-19 - Debug map state and refresh wiring split
- ItemWorldScene.wireDebugMapRuntimes() is the ordered entrypoint only: debug map state runtime first, refresh/action runtime second.
- Keep generated-map state mutation callbacks in wireDebugMapStateRuntime(); keep Shift+3/debug refresh orchestration callbacks in wireDebugMapRefreshRuntime().
- Preserve this order because ItemWorldDebugMapRefreshRuntime delegates generated map application and rebuild steps through ItemWorldDebugMapStateRuntime.



## 2026-06-19 - RoomGraph debug conceptual spacing
- game/src/level/RoomGraphDebugOverlay.ts renders Shift+2/F2 RoomGraph as a conceptual room graph, not a world-space minimap.
- Branches should be displayed as compact parent-Room-Room lanes and must not preserve generated grid depth, shaft length, or LDtk room footprint.
- Keep this overlay for topology readability; use separate collision/minimap debug tools for actual world-space validation.


## 2026-06-19 - Hazard and fluid impact wiring split
- ItemWorldScene.wireHazardAndFluidImpactRuntimes() is the ordered entrypoint only: tile hazard first, container-fluid interactions second, Ego shard fluid/impact reactions third.
- Keep ItemWorldTileHazardRuntime construction in wireTileHazardRuntime(), ItemWorldContainerFluidRuntime in wireContainerFluidRuntime(), and ItemWorldEgoShardImpactRuntime in wireEgoShardImpactRuntime().
- Preserve this order because container-fluid and Ego shard impact callbacks read tileHazardRuntime.getActiveTileBounds().


## 2026-06-19 - Full-map build pipeline wiring split
- ItemWorldScene.wireFullMapBuildPipelineRuntime() is the ordered entrypoint only: procedural decor runtime first, full-map build runtime second.
- Keep ItemWorldProceduralDecorRuntime construction in wireProceduralDecorRuntime(); keep ItemWorldFullMapBuildRuntime construction and build pipeline callbacks in wireFullMapBuildRuntime().
- Preserve this order because ItemWorldFullMapBuildRuntime receives proceduralDecorRuntime as a constructor dependency.


## 2026-06-19 - Camera HUD progression wiring split
- ItemWorldScene.wireCameraHudProgressionRuntimes() is the ordered entrypoint only: camera zone runtime, boss HP runtime, then room progression runtime.
- Keep camera follow/zone construction in wireCameraZoneRuntime(), boss HUD engagement display in wireBossHpRuntime(), and room/stratum progression mutation in wireRoomProgressionRuntime().
- Do not mix camera presentation, HUD boss display, and room progression state mutation in one constructor-time wiring block.


## 2026-06-19 - Dev weather picker wiring split
- ItemWorldScene.wireDevWeatherAndPickerRuntimes() is the ordered entrypoint only: dev overlay, debug input, weather runtime, then stratum picker runtime.
- Keep RoomGraph/debug overlay construction in wireDevOverlayRuntime(), debug hotkey actions in wireDebugInputRuntime(), weather presentation in wireWeatherRuntime(), and stratum selection UI in wireStratumPickerRuntime().
- Do not mix debug tooling, ambient weather presentation, and stratum jump UI wiring in one constructor-time block.


## 2026-06-19 - Enemy room wiring split
- ItemWorldScene.wireEnemyRoomRuntimes() is the ordered entrypoint only: enemy spawn, enemy encounter, room clear, then memory shard spawn runtime.
- Keep direct enemy creation in wireEnemySpawnRuntime(), encounter/spawn-table orchestration in wireEnemyEncounterRuntime(), room-clear bookkeeping in wireRoomClearRuntime(), and shard reward spawning in wireMemoryShardSpawnRuntime().
- ItemWorldEnemyEncounterRuntime should access memoryShardSpawnRuntime through the provided getter; do not inline memory shard construction into encounter wiring.


## 2026-06-19 - Reward and destruction wiring split
- ItemWorldScene.wireRewardAndDestructionRuntimes() is the ordered entrypoint only: room reward spawner, breakable prop runtime, then container destruction runtime.
- Keep room reward pickup spawning in wireRoomRewardSpawner(), breakable prop combat/destruction handling in wireBreakablePropRuntime(), and container shatter-only destruction wiring in wireContainerDestructionRuntime().
- Do not mix room reward policy with destructible prop/container effect wiring in one constructor-time block.


## 2026-06-19 - Cell geometry and visibility wiring split
- ItemWorldScene.wireCellGeometryRuntimes() is the ordered entrypoint only: cell visual runtime first, room rect runtime second.
- ItemWorldScene.wireRuntimeCellVisibilityRuntimes() is the ordered entrypoint only: runtime cell spawner first, cell visibility runtime second.
- Keep aggregate visual record creation in wireCellVisualRuntime(), pixel/tile room rect lookup in wireRoomRectRuntime(), runtime cell spawning in wireRuntimeCellSpawner(), and camera/fluid visibility decisions in wireCellVisibilityRuntime().
- Preserve these orders because room rect lookup reads cellVisualRuntime records, and cell visibility delegates room realization through runtimeCellSpawner.


## 2026-06-19 - Static entity spawner dependency bundles
- ItemWorldScene.wireStaticEntitySpawnerRuntime() should only construct ItemWorldStaticEntitySpawner from grouped dependency bundles.
- Keep collision/layer/item callbacks in createStaticEntityWorldDeps(), static registry collection callbacks in createStaticEntityRegistryDeps(), and memory/prologue/camera/anvil side-effect callbacks in createStaticEntitySpecialSpawnDeps().
- Do not re-expand the flat static entity dependency object directly in wireStaticEntitySpawnerRuntime(); grouped deps make authored entity side effects easier to audit.


## 2026-06-19 - Room state and spawn flow wiring split
- ItemWorldScene.wireRoomStateAndPlayerSpawnRuntimes() is the ordered entrypoint only: room state runtime, player spawn runtime, then room type runtime.
- ItemWorldScene.wireRoomSpawnFlowRuntimes() is the ordered entrypoint only: neighbor pre-spawn runtime first, room spawn runtime second.
- Keep persistent room-state storage in wireRoomStateRuntime(), player/camera placement in wirePlayerSpawnRuntime(), room classification in wireRoomTypeRuntime(), neighbor realization in wireNeighborPreSpawnRuntime(), and actual room spawn orchestration in wireRoomSpawnRuntime().
- Neighbor pre-spawn may reference roomSpawnRuntime through a callback; do not inline room spawn construction into neighbor pre-spawn wiring.


## 2026-06-19 - Full-map layer wiring split
- ItemWorldScene.wireFullMapLayerRuntimes() is the ordered entrypoint only: layer runtime, layer binding runtime, layer rebuild runtime, then attach runtime.
- Keep raw layer construction in wireFullMapLayerRuntime(), scene aggregate field binding in wireFullMapLayerBindingRuntime(), palette-aware layer rebuild in wireFullMapLayerRebuildRuntime(), and scene/container attachment plus current-cell realization in wireFullMapAttachRuntime().
- Preserve this order because layer rebuild depends on layer runtime and binding runtime, and attachment expects full-map container state to be managed by the rebuild/binding path.


## 2026-06-19 - Full-map template and build-state wiring split
- ItemWorldScene.wireFullMapTemplateRuntimes() is the ordered entrypoint only: memory room placement, template picker, then full-grid runtime.
- Keep memory placement construction in wireMemoryRoomPlacementRuntime(), LDtk template selection in wireTemplatePickerRuntime(), and full-grid mutation helpers in wireFullGridRuntime().
- ItemWorldScene.wireFullMapBuildStateRuntime() should construct ItemWorldBuildStateRuntime from cleanup bundles: tile/fluid cleanup, entity cleanup, room-state cleanup, and visual/cell cleanup.
- Do not re-expand build-state cleanup into one flat callback object; grouped cleanup deps make full-map rebuild side effects auditable.


## 2026-06-19 - Gameplay entity pickup/projectile and static runtime bundles
- ItemWorldScene.wirePickupAndProjectileRuntimes() is the ordered entrypoint only: pickup runtime first, projectile runtime second.
- Keep pickup collection/reward HUD side effects in wirePickupRuntime(), and projectile combat handling in wireProjectileRuntime().
- ItemWorldScene.wireStaticEntityRuntime() should construct ItemWorldStaticEntityRuntime from grouped dependency bundles: world deps, registry deps, combat feedback deps, and side-effect deps.
- Do not re-expand static entity runtime into one flat dependency object; grouped deps separate world access, authored static collections, combat feedback, and mutation side effects.


## 2026-06-19 - Core VFX manager assignment split
- ItemWorldScene.assignCoreVfxManagers() is the ordered entrypoint only: combat VFX, movement VFX, then fluid/impact VFX manager assignment.
- Keep damage/combat feedback managers in assignCombatVfxManagers(), locomotion effect managers in assignMovementVfxManagers(), and water/steam/ash/fluid residue managers in assignFluidImpactVfxManagers().
- Preserve this grouping so FluidReactionRuntime and movement/static/entity runtimes can depend on already-assigned manager fields without mixing unrelated VFX categories.


## 2026-06-19 - Frame query/effects and blocking gate wiring split
- ItemWorldScene.wireFrameQueryAndEffectsRuntimes() is the ordered entrypoint only: room query runtime first, frame effects runtime second.
- ItemWorldScene.wirePausedAndBlockingGateRuntimes() is the ordered entrypoint only: paused-frame runtime first, blocking-transition runtime second.
- Keep spatial room query helpers in wireRoomQueryRuntime(), passive per-frame VFX updates in wireFrameEffectsRuntime(), paused/frozen presentation updates in wirePausedFrameRuntime(), and transition/absorb/flow-hold gates in wireBlockingTransitionRuntime().
- Do not mix query helpers, passive effects, pause handling, and blocking transition gates in one constructor-time block.


## 2026-06-19 - Modal and ambient gate wiring split
- ItemWorldScene.wireModalAndAmbientGateRuntimes() is the ordered entrypoint only: modal gate runtime first, ambient frame runtime second.
- Keep modal/blocking UI flows, lore, stratum picker, boss choice, and entry corridor blocking updates in wireModalGateRuntime().
- Keep non-blocking per-frame ambient updates such as interaction-frame begin, weather, and entry-corridor color restore in wireAmbientFrameRuntime().
- Do not mix modal input gates with ambient frame updates in one constructor-time block.


## 2026-06-19 - Interaction UI flow wiring split
- ItemWorldScene.wireScreenAndCameraFlowRuntimes() is the ordered entrypoint only: oxygen overlay, room transition runtime, then Item World camera runtime.
- ItemWorldScene.wireWorldInteractionPromptRuntimes() is the ordered entrypoint only: container carry, trapdoor, trapdoor descent, anvil, then prompt runtime.
- ItemWorldScene.wireHudOnboardingAndEscapeRuntimes() is the ordered entrypoint only: HUD runtime, onboarding runtime, then escape runtime.
- Keep each runtime construction in its own wire* method; do not mix screen overlays, world interaction prompts, HUD policy, onboarding hints, and escape confirmation wiring in shared constructor blocks.


## 2026-06-19 - Boss choice and stratum clear wiring split
- ItemWorldScene.wireBossChoiceAndStratumClearRuntimes() is the ordered entrypoint only: boss choice runtime first, stratum clear runtime second.
- Keep post-boss continue/exit choice UI in wireBossChoiceRuntime(), and stratum result/stat comparison/hold flow in wireStratumClearRuntime().
- Do not mix boss choice UI wiring with stratum clear result wiring in one constructor-time block.


## 2026-06-19 - Stratum transition Ego shard input absorb wiring split
- ItemWorldScene.wireStratumTransitionAndEgoShardRuntimes() is the ordered entrypoint only: exit fade, Ego shard cast, Ego shard combat, then Ego shard projectile runtime.
- ItemWorldScene.wireInputAndAbsorbRuntimes() is the ordered entrypoint only: unavailable-input runtime first, absorb dissolve runtime second.
- Keep exit fade in wireItemWorldExitFadeRuntime(), shard casting in wireEgoShardCastRuntime(), shard collision/combat effects in wireEgoShardCombatRuntime(), shard projectile travel/impact handoff in wireEgoShardProjectileRuntime(), unavailable input feedback in wireUnavailableInputRuntime(), and absorb dissolve layer choreography in wireAbsorbDissolveRuntime().
- Preserve Ego shard order because projectile hit checks delegate to egoShardCombatRuntime and impacts delegate to egoShardImpactRuntime.


## 2026-06-19 - Capture dialogue memory prologue wiring split
- ItemWorldScene.wireCaptureAndDialogueRuntimes() is the ordered entrypoint only: capture orb runtime first, Ego dialogue runtime second.
- ItemWorldScene.wireMemoryAndPrologueRuntimes() is the ordered entrypoint only: memory trigger runtime first, prologue-end runtime second.
- Keep capture-orb visuals in wireCaptureOrbRuntime(), Ego dialogue state/unlocked-event access in wireEgoDialogueRuntime(), memory trigger entity handling in wireMemoryTriggerRuntime(), and prologue completion routing in wirePrologueEndRuntime().
- Do not mix capture VFX, Ego dialogue state, memory triggers, and prologue exit routing in shared constructor-time blocks.


## 2026-06-19 - Resident wiring split
- ItemWorldScene.wireResidentRuntimes() is the ordered entrypoint only: resident runtime first, safe-room resident spawn runtime second.
- Keep resident interaction/dialogue access in wireResidentRuntime(), and safe-room ambient resident spawning in wireSafeRoomResidentSpawnRuntime().
- Preserve this order because safe-room resident spawning delegates to residentRuntime through getResidentRuntime().


## 2026-06-19 - RoomGraph debug conceptual layout
- `RoomGraphDebugOverlay` is a topology/debug view, not a world-space minimap.
- Nodes must render as uniform conceptual rooms; critical path should read like `Start-Room-Room-Boss`, and branches should fold near the parent instead of reflecting generated shaft length, LDtk template footprint, or grid coordinates.
- Do not use actual room size or generated grid distance for Shift+2 graph placement; use the real map/minimap when spatial scale is needed.


## 2026-06-19 - Enemy combat dependency bundles
- `ItemWorldScene.wireEnemyCombatRuntime()` should only compose grouped dependency bundles for `ItemWorldEnemyCombatRuntime`.
- Keep player/enemy/grid/hit-manager access in `createEnemyCombatWorldDeps()`, HUD/VFX feedback in `createEnemyCombatFeedbackDeps()`, exp/room progression in `createEnemyCombatProgressionDeps()`, and drop/pickup callbacks in `createEnemyCombatRewardDeps()`.
- Do not re-expand enemy combat into one flat callback object; progression and reward side effects must remain separately auditable.


## 2026-06-19 - Gameplay simulation dependency bundles
- `ItemWorldScene.wireGameplaySimulationRuntime()` should only compose grouped dependency bundles for `ItemWorldGameplaySimulationRuntime`.
- Keep player/input/tutorial/updraft callbacks in `createGameplaySimulationPlayerDeps()`, active world entity updates in `createGameplaySimulationWorldDeps()`, combat/reward pickup/projectile updates in `createGameplaySimulationCombatDeps()`, and boss/room progression callbacks in `createGameplaySimulationProgressionDeps()`.
- Preserve update order inside `ItemWorldGameplaySimulationRuntime`; the scene-side bundles are wiring boundaries only, not a license to reorder simulation phases.


## 2026-06-19 - Boss defeat dependency bundles
- `ItemWorldScene.wireBossDefeatRuntime()` should only compose grouped dependency bundles for `ItemWorldBossDefeatRuntime`.
- Keep item/player/stratum/cell access in `createBossDefeatRuntimeCoreDeps()`, save/progression/HUD toast callbacks in `createBossDefeatProgressionDeps()`, hitstop/camera/screen/death VFX in `createBossDefeatFeedbackDeps()`, trapdoor/grid/room lookup callbacks in `createBossDefeatTrapdoorDeps()`, Ego dialogue callbacks in `createBossDefeatDialogueDeps()`, and healing pickup reward callbacks in `createBossDefeatRewardDeps()`.
- Do not mix boss progression, reward spawning, trapdoor placement, and dialogue side effects back into one flat constructor dependency object.


## 2026-06-19 - Full-map build dependency bundles
- `ItemWorldScene.wireFullMapBuildRuntime()` should only compose grouped dependency bundles for `ItemWorldFullMapBuildRuntime`.
- Keep item UID/stratum/theme/procedural-deco inputs in `createFullMapBuildGenerationDeps()`, template picking and layer rebuild in `createFullMapBuildTemplateAndLayerDeps()`, full-grid/static-entity/room-state mutation in `createFullMapBuildGridStateDeps()`, and breakable-prop/log finalization in `createFullMapBuildFinalizeDeps()`.
- Do not re-expand full-map build into one flat object; generation inputs, rendering/template wiring, grid state mutation, and post-build side effects must remain separately auditable.


## 2026-06-19 - Full-map room apply dependency bundles
- `ItemWorldScene.wireFullMapRoomApplyRuntime()` should only compose grouped dependency bundles for `ItemWorldFullMapRoomApplyRuntime`.
- Keep unified/full-grid/current-cell access in `createFullMapRoomApplyGridDeps()`, room type/collision/cell-visual application in `createFullMapRoomApplyMaterializationDeps()`, and reward/player-spawn capture callbacks in `createFullMapRoomApplySpawnCaptureDeps()`.
- Do not mix room materialization with spawn/reward capture in one flat constructor object; filler-room exceptions and authored room side effects must remain easy to audit.


## 2026-06-19 - Initial build dependency bundles
- `ItemWorldScene.wireInitialBuildRuntime()` should only compose grouped dependency bundles for `ItemWorldInitialBuildRuntime`.
- Keep room-state/stat restoration in `createInitialBuildRunStateDeps()`, full-map/fluid/weather/container rebuild work in `createInitialBuildEnvironmentDeps()`, and HUD/camera/player/entry-corridor setup in `createInitialBuildPresentationDeps()`.
- Preserve initialization order inside `ItemWorldInitialBuildRuntime`; scene-side bundles are wiring boundaries only and must not reorder restore, environment rebuild, HUD/camera, and player placement phases.


## 2026-06-19 - Lifecycle cleanup dependency bundles
- `ItemWorldScene.wireLifecycleCleanupRuntime()` should only compose grouped dependency bundles for `ItemWorldLifecycleCleanupRuntime`.
- Keep gamepad/toast/basic UI visibility cleanup in `createLifecycleCleanupInputAndUiDeps()`, active world runtime cleanup in `createLifecycleCleanupWorldRuntimeDeps()`, display detach/destruction for HUD/lore/overlays in `createLifecycleCleanupDisplayDetachDeps()`, and destroy-only runtime cleanup in `createLifecycleCleanupDestroyDeps()`.
- Preserve `exit()` and `destroy()` call order inside `ItemWorldLifecycleCleanupRuntime`; scene-side bundles only separate ownership surfaces for cleanup callbacks.


## 2026-06-19 - Debug map state dependency bundles
- `ItemWorldScene.wireDebugMapStateRuntime()` should only compose grouped dependency bundles for `ItemWorldDebugMapStateRuntime`.
- Keep template/grid/strata read access and memory placement in `createDebugMapGenerationStateDeps()`, generated-map mutation and dev overlay init in `createDebugMapMutationDeps()`, trapdoor/neighbour/run-stat/environment/player reset in `createDebugMapRunResetDeps()`, and start-room spawn activation in `createDebugMapSpawnActivationDeps()`.
- Debug map regeneration may mutate authoritative Item World state, but those mutation surfaces must remain grouped and auditable instead of being re-expanded into one flat debug callback object.


## 2026-06-19 - Stratum jump dependency bundles
- `ItemWorldScene.wireStratumJumpRuntimes()` should only call `wireStratumJumpStateRuntime()` then `wireStratumJumpRuntime()`.
- Keep grid/current-room mutation in `createStratumJumpStateGridDeps()`, deepest/last-safe/persist/toast progress mutation in `createStratumJumpStateProgressDeps()`, and room spawned-state callbacks in `createStratumJumpStateSpawnDeps()`.
- Keep jump runtime state reads in `createStratumJumpRuntimeStateDeps()`, flow orchestration callbacks in `createStratumJumpRuntimeFlowDeps()`, and player placement/HUD restoration in `createStratumJumpRuntimePlayerDeps()`.
- Do not mix stratum progress mutation, trapdoor reset, room activation, and player placement back into a single constructor object.


## 2026-06-19 - Full-map layer binding dependency bundles
- `ItemWorldScene.wireFullMapLayerBindingRuntime()` should only compose grouped dependency bundles for `ItemWorldFullMapLayerBindingRuntime`.
- Keep the full-map container/background/interior bindings in `createFullMapCoreLayerBindingDeps()`, wall/special/shadow/seal bindings in `createFullMapTerrainLayerBindingDeps()`, and deco/artificial-deco/structure bindings in `createFullMapDetailLayerBindingDeps()`.
- Use `ItemWorldFullMapLayerSet` for setter parameter types so aggregate binding remains type-safe when moved into scene helper methods.


## 2026-06-19 - Debug map refresh dependency bundles
- `ItemWorldScene.wireDebugMapRefreshRuntime()` should only compose grouped dependency bundles for `ItemWorldDebugMapRefreshRuntime`.
- Keep initialization guard and debug generation in `createDebugMapRefreshGenerationDeps()`, generated-map application and memory placement in `createDebugMapRefreshApplyDeps()`, start-room/run/environment/player reset in `createDebugMapRefreshResetDeps()`, and debug toast feedback in `createDebugMapRefreshFeedbackDeps()`.
- Preserve the refresh apply order inside `ItemWorldDebugMapRefreshRuntime`; scene-side helpers only separate callback ownership.


## 2026-06-19 - Frame effects dependency bundles
- `ItemWorldScene.wireFrameEffectsRuntime()` should only compose grouped dependency bundles for `ItemWorldFrameEffectsRuntime`.
- Keep movement VFX and container physics in `createFrameEffectsLocomotionDeps()`, Ego shard projectile update in `createFrameEffectsProjectileDeps()`, passive world VFX in `createFrameEffectsAmbientVfxDeps()`, and low-HP vignette/player HP ratio callbacks in `createFrameEffectsHudDeps()`.
- Preserve the per-frame update order inside `ItemWorldFrameEffectsRuntime`; scene-side helpers only separate callback ownership.


## 2026-06-19 - Paused frame dependency bundles
- `ItemWorldScene.wirePausedFrameRuntime()` should only compose grouped dependency bundles for `ItemWorldPausedFrameRuntime`.
- Keep entry-freeze/prologue-end gates in `createPausedFrameGateDeps()`, player velocity/previous-position handling in `createPausedFramePlayerFreezeDeps()`, HUD/damage-number/screen-flash feedback in `createPausedFrameFeedbackDeps()`, and camera targeting/update callbacks in `createPausedFrameCameraDeps()`.
- Preserve paused update order inside `ItemWorldPausedFrameRuntime`; scene-side bundles only separate callback ownership for frozen presentation paths.


## 2026-06-19 - Blocking transition dependency bundles
- `ItemWorldScene.wireBlockingTransitionRuntime()` should only compose grouped dependency bundles for `ItemWorldBlockingTransitionRuntime`.
- Keep room transition gate/update/player placement in `createBlockingTransitionRoomDeps()`, absorb dissolve gate/update in `createBlockingTransitionAbsorbDeps()`, exit/post-clear flow hold gate/update in `createBlockingTransitionFlowHoldDeps()`, and gameplay HUD block mutation in `createBlockingTransitionHudDeps()`.
- Preserve blocking gate priority inside `ItemWorldBlockingTransitionRuntime`; scene-side helpers only separate transition ownership surfaces.


## 2026-06-19 - Presentation frame dependency bundles
- `ItemWorldScene.wirePresentationFrameRuntime()` should only compose grouped dependency bundles for `ItemWorldPresentationFrameRuntime`.
- Keep gameplay HUD reconciliation/stats/oxygen/boss HP/HUD text in `createPresentationFrameHudDeps()`, combat feedback VFX in `createPresentationFrameCombatFeedbackDeps()`, capture-orb/boss-clear/screen-flash/frame effects in `createPresentationFrameWorldVfxDeps()`, and camera update in `createPresentationFrameCameraDeps()`.
- Preserve presentation update order inside `ItemWorldPresentationFrameRuntime`; scene-side helpers only separate callback ownership for normal presentation frames.


## 2026-06-19 - Room progression dependency bundles
- `ItemWorldScene.wireRoomProgressionRuntime()` should only compose grouped dependency bundles for `ItemWorldRoomProgressionRuntime`.
- Keep player-foot/room lookup/grid access in `createRoomProgressionSpatialDeps()`, current room/stratum/progress persistence in `createRoomProgressionStateDeps()`, room spawn/pre-spawn/enemy presence in `createRoomProgressionSpawnDeps()`, and monster-visible/toast feedback in `createRoomProgressionFeedbackDeps()`.
- Preserve room progression order inside `ItemWorldRoomProgressionRuntime`; scene-side bundles only separate callback ownership for room entry state changes.


## 2026-06-19 - Tile hazard dependency bundles
- `ItemWorldScene.wireTileHazardRuntime()` should only compose grouped dependency bundles for `ItemWorldTileHazardRuntime`.
- Keep game/grid/current-room/current-room-rect access in `createTileHazardWorldDeps()`, tile mutator/burnable/breakable/ash/grass-fire callbacks in `createTileHazardMutationDeps()`, fluid system/spawner/crest foam callbacks in `createTileHazardFluidDeps()`, and player/enemy/HUD/damage/screen feedback callbacks in `createTileHazardCombatFeedbackDeps()`.
- Do not re-expand tile hazard wiring into one flat object; mutation, fluid, and combat feedback surfaces must remain separately auditable.


## 2026-06-19 - Container fluid dependency bundles
- `ItemWorldScene.wireContainerFluidRuntime()` should only compose grouped dependency bundles for `ItemWorldContainerFluidRuntime`.
- Keep game/grid/tile-mutator access in `createContainerFluidWorldDeps()`, fluid refresh and active bounds in `createContainerFluidRefreshDeps()`, container/enemy collections in `createContainerFluidEntityDeps()`, and steam puff feedback in `createContainerFluidFeedbackDeps()`.
- Do not mix container fluid painting, fluid refresh, entity contact, and feedback callbacks back into a single flat constructor object.


## 2026-06-19 - Ego shard impact dependency bundles
- `ItemWorldScene.wireEgoShardImpactRuntime()` should only compose grouped dependency bundles for `ItemWorldEgoShardImpactRuntime`.
- Keep game/player/grid access in `createEgoShardImpactWorldDeps()`, tile mutator/fluid system/active bounds/fluid residue/grass fire in `createEgoShardImpactTileFluidDeps()`, and steam puff feedback in `createEgoShardImpactFeedbackDeps()`.
- Do not re-expand Ego shard impact wiring into one flat object; world access, tile/fluid mutation, and VFX feedback must remain separately auditable.


## 2026-06-19 - Movement VFX dependency bundles
- `ItemWorldScene.wireMovementVfxRuntime()` should only compose actor/world deps plus a grouped managers object for `ItemWorldMovementVfxRuntime`.
- Keep player/enemy access in `createMovementVfxActorDeps()`, collision/fluid/damage-number access in `createMovementVfxWorldDeps()`, and manager grouping in `createMovementVfxManagers()`.
- Split manager construction into locomotion, combat, fluid, and passive groups: `createMovementVfxLocomotionManagers()`, `createMovementVfxCombatManagers()`, `createMovementVfxFluidManagers()`, and `createMovementVfxPassiveManagers()`.
- Do not re-expand all movement VFX managers into one inline constructor object; VFX categories must remain auditable.


## 2026-06-19 - Container physics dependency bundles
- `ItemWorldScene.wireContainerPhysicsRuntime()` should only compose grouped dependency bundles for `ItemWorldContainerPhysicsRuntime`.
- Keep player/enemy/container access in `createContainerPhysicsActorDeps()`, grid/tile-mutator access in `createContainerPhysicsWorldDeps()`, damage/hit-spark feedback in `createContainerPhysicsFeedbackDeps()`, fluid paint/effect/flush callbacks in `createContainerPhysicsFluidDeps()`, and destruction/registry mutation in `createContainerPhysicsMutationDeps()`.
- Do not mix container physics, fluid side effects, feedback, and registry mutation back into a single flat constructor object.


## 2026-06-19 - Pickup dependency bundles
- `ItemWorldScene.wirePickupRuntime()` should only compose grouped dependency bundles for `ItemWorldPickupRuntime`.
- Keep player/entity-layer access in `createPickupWorldDeps()`, damage/glow/screen/toast feedback in `createPickupFeedbackDeps()`, and run-stat/HUD gold mutation in `createPickupRewardDeps()`.
- Do not mix pickup world access, feedback, and reward state mutation back into one flat constructor object.


## 2026-06-19 - Projectile dependency bundles
- `ItemWorldScene.wireProjectileRuntime()` should only compose grouped dependency bundles for `ItemWorldProjectileRuntime`.
- Keep game/entity-layer access in `createProjectileWorldDeps()`, player/enemy access in `createProjectileActorDeps()`, and HUD/damage/hit-spark/screen feedback in `createProjectileFeedbackDeps()`.
- Do not mix projectile world access, actor access, and combat feedback back into a single flat constructor object.


## 2026-06-19 - Enemy contact dependency bundles
- `ItemWorldScene.wireEnemyContactRuntime()` should only compose grouped dependency bundles for `ItemWorldEnemyContactRuntime`.
- Keep game access in `createEnemyContactWorldDeps()`, player/enemy access in `createEnemyContactActorDeps()`, and HUD/damage/hit-spark/screen feedback in `createEnemyContactFeedbackDeps()`.
- Keep enemy contact and projectile combat feedback wiring patterns aligned; do not re-expand actor and feedback callbacks into flat constructor objects.


## 2026-06-19 - Room graph debug overlay is conceptual
- `RoomGraphDebugOverlay` is a topology/debug diagram, not a world-space minimap.
- Do not use LDtk grid coordinates, room footprint, shaft length, or template size to determine node distances in Shift+2 graph view.
- Render generated rooms as compact conceptual chains such as `Hub-Room-Room-Boss`, with branches folded near their parent so the full graph stays readable on one screen.


## 2026-06-19 - Room spawn dependency bundles
- `ItemWorldScene.wireRoomSpawnRuntime()` should only compose grouped dependency bundles for `ItemWorldRoomSpawnRuntime`.
- Keep room/grid progression state in `createRoomSpawnStateDeps()`, safe-room ambient spawning in `createRoomSpawnSafeRoomDeps()`, authored/procedural enemy spawning in `createRoomSpawnEnemyDeps()`, and reward spawning in `createRoomSpawnRewardDeps()`.
- Do not mix room entry state checks, safe-room residents, enemy encounter creation, and reward drops back into one flat constructor object.


## 2026-06-19 - Full map attach dependency bundles
- `ItemWorldScene.wireFullMapAttachRuntime()` should only compose grouped dependency bundles for `ItemWorldFullMapAttachRuntime`.
- Keep scene/full-map/player container access in `createFullMapAttachContainerDeps()`, room data assignment in `createFullMapAttachStateDeps()`, current-cell spawn and visibility refresh in `createFullMapAttachSpawnDeps()`, and camera access in `createFullMapAttachCameraDeps()`.
- Do not mix display attachment, scene state assignment, spawn side effects, and camera access back into one flat constructor object.


## 2026-06-19 - Procedural decor dependency bundles
- `ItemWorldScene.wireProceduralDecorRuntime()` should only compose grouped dependency bundles for `ItemWorldProceduralDecorRuntime`.
- Keep aggregate access in `createProceduralDecorAggregateDeps()` and grass/tile mutation access in `createProceduralDecorMutationDeps()`.
- Do not mix decorative aggregate containers and tile-mutation side effects back into one flat constructor object.


## 2026-06-19 - Death runtime dependency bundles
- `ItemWorldScene.wireDeathRuntime()` should only compose grouped dependency bundles for `ItemWorldDeathRuntime`.
- Keep player access in `createDeathActorDeps()`, prologue restart rules in `createDeathPrologueDeps()`, analytics/exit telemetry in `createDeathTelemetryDeps()`, HUD/dialogue/container mutations in `createDeathUiDeps()`, and return-result/final-exit data in `createDeathResultDeps()`.
- Do not mix prologue restart, death analytics, HUD mutation, room persistence, and return-result presentation back into one flat constructor object.


## 2026-06-19 - Stratum continue dependency bundles
- `ItemWorldScene.wireStratumContinueRuntime()` should only compose grouped dependency bundles for `ItemWorldStratumContinueRuntime`.
- Keep HUD/flow reset in `createStratumContinueFlowDeps()`, trapdoor descent access in `createStratumContinueTrapdoorDeps()`, grid/hole aggregate access in `createStratumContinueHoleDeps()`, screen/camera/hitstop/toast feedback in `createStratumContinueFeedbackDeps()`, and stratum counters in `createStratumContinueProgressDeps()`.
- Do not mix descent snapshot state, full-grid hole rendering, gameplay HUD restoration, and feedback effects back into one flat constructor object.


## 2026-06-19 - Exit cleanup dependency bundles
- `ItemWorldScene.wireBossExitAndReturnCleanupRuntimes()` should compose grouped dependencies for boss exit and return-result cleanup runtimes.
- Keep boss-exit progress mutations in `createExitAfterBossProgressDeps()`, return-result cleanup trigger in `createExitAfterBossCleanupDeps()`, and fade startup in `createExitAfterBossFadeDeps()`.
- Keep return-result HUD/toast cleanup, prompt cleanup, stratum-clear overlay cleanup, and modal choice cleanup in separate `createReturnResultCleanup*Deps()` helpers.
- `ItemWorldScene.wireDeathRestartAndFinalExitRuntimes()` should keep exit telemetry, player HP sync, UI cleanup, HUD detachment, prologue restart core/progress/scene creation, and final-exit callbacks in separate helper groups.
- Do not mix exit telemetry, HUD/container cleanup, prologue restart, and final world callbacks back into flat constructor objects.


## 2026-06-19 - Modal gate dependency bundles
- `ItemWorldScene.wireModalGateRuntime()` should only compose grouped dependency bundles for `ItemWorldModalGateRuntime`.
- Keep passive UI ticking in `createModalGatePassiveUiDeps()`, return-result modal handling in `createModalGateReturnResultDeps()`, debug/onboarding gates in `createModalGateDebugAndOnboardingDeps()`, overlay modal handling in `createModalGateOverlayDeps()`, and gameplay hold updates in `createModalGateGameplayHoldDeps()`.
- Do not mix feedback/toast ticking, return-result input, debug HUD state, lore/stratum overlays, entry corridor, and boss choice input back into one flat constructor object.


## 2026-06-19 - Absorb dissolve dependency bundles
- `ItemWorldScene.wireAbsorbDissolveRuntime()` should only compose grouped dependency bundles for `ItemWorldAbsorbDissolveRuntime`.
- Keep game/core access in `createAbsorbDissolveCoreDeps()`, render layer/container access in `createAbsorbDissolveLayerDeps()`, player/trapdoor access in `createAbsorbDissolveActorDeps()`, fade overlay lookup in `createAbsorbDissolveOverlayDeps()`, and exit-fade completion flow in `createAbsorbDissolveCompletionDeps()`.
- Do not mix full-map/tilemap layers, actor/trapdoor references, fade overlay lookup, and exit flow mutation back into one flat constructor object.


## 2026-06-19 - HUD runtime dependency bundles
- `ItemWorldScene.wireHudRuntime()` should only compose grouped dependency bundles for `ItemWorldHudRuntime`.
- Keep HUD/item display objects in `createHudDisplayDeps()`, item-world progress/stratum/grid/earned-exp data in `createHudProgressDeps()`, and cinematic/modal/transition block conditions in `createHudBlockStateDeps()`.
- Do not mix HUD display data and HUD visibility/blocking state back into one flat constructor object; HUD state bugs should keep data source ownership separate from temporary block conditions.


## 2026-06-19 - Ego shard combat dependency bundles
- `ItemWorldScene.wireEgoShardCombatRuntime()` should only compose grouped dependency bundles for `ItemWorldEgoShardCombatRuntime`.
- Keep player/enemy/container access in `createEgoShardCombatActorDeps()`, collision grid and tile mutator access in `createEgoShardCombatWorldDeps()`, damage/hit-spark feedback in `createEgoShardCombatFeedbackDeps()`, shard retrieval in `createEgoShardCombatShardDeps()`, and container fluid/destruction/removal side effects in `createEgoShardCombatContainerDeps()`.
- Do not mix shard hit detection, tile mutation, feedback, and container side effects back into one flat constructor object.


## 2026-06-19 - Gameplay start dependency bundles
- `ItemWorldScene.wireGameplayStartRuntime()` should only compose grouped dependency bundles for `ItemWorldGameplayStartRuntime`.
- Keep entry-gate/stratum state in `createGameplayStartEntryDeps()`, current room and room spawn access in `createGameplayStartRoomDeps()`, item/progress/strata data in `createGameplayStartProgressDeps()`, and stratum picker/toast UI feedback in `createGameplayStartUiDeps()`.
- Do not mix initial entry gate state, room spawning, durable progress data, and startup UI feedback back into one flat constructor object.


## 2026-06-19 - Stratum clear dependency bundles
- `ItemWorldScene.wireStratumClearRuntime()` should only compose grouped dependency bundles for `ItemWorldStratumClearRuntime`.
- Keep game/UI/item access in `createStratumClearCoreDeps()`, before/after item stat snapshot data in `createStratumClearStatDeps()`, and post-clear hold/continue/exit flow callbacks in `createStratumClearFlowDeps()`.
- Do not mix stratum clear overlay data, item stat deltas, and exit/continue flow mutations back into one flat constructor object.


## 2026-06-19 - Escape runtime dependency bundles
- `ItemWorldScene.wireEscapeRuntime()` should only compose grouped dependency bundles for `ItemWorldEscapeRuntime`.
- Keep game/UI/HUD skin/item access in `createEscapeCoreDeps()`, run summary values in `createEscapeRunSummaryDeps()`, and post-clear hold/exit-fade callbacks in `createEscapeFlowDeps()`.
- Do not mix escape modal presentation, run-result summary data, and exit flow mutation back into one flat constructor object.


## 2026-06-19 - Breakable prop dependency bundles
- `ItemWorldScene.wireBreakablePropRuntime()` should only compose grouped dependency bundles for `ItemWorldBreakablePropRuntime`.
- Keep game/player/room/entity-layer access in `createBreakablePropWorldDeps()`, registry access in `createBreakablePropRegistryDeps()`, gold pickup rewards in `createBreakablePropRewardDeps()`, shatter/hit-spark feedback in `createBreakablePropFeedbackDeps()`, and tile mutator access in `createBreakablePropMutationDeps()`.
- Do not mix breakable prop lookup, reward spawning, VFX feedback, and tile mutation back into one flat constructor object.


## 2026-06-19 - Debug input dependency bundles
- `ItemWorldScene.wireDebugInputRuntime()` should only compose grouped dependency bundles for `ItemWorldDebugInputRuntime`.
- Keep game/input access in `createDebugInputCoreDeps()`, player/entity/container world access in `createDebugInputWorldDeps()`, toast feedback in `createDebugInputFeedbackDeps()`, element debug actions in `createDebugInputElementDeps()`, and map regeneration in `createDebugInputMapDeps()`.
- Do not mix debug-only element actions or map regeneration callbacks back into production gameplay wiring groups.


## 2026-06-19 - Enemy encounter dependency bundles
- `ItemWorldScene.wireEnemyEncounterRuntime()` should only compose grouped dependency bundles for `ItemWorldEnemyEncounterRuntime`.
- Keep item/cycle/strata data in `createEnemyEncounterProgressDeps()`, start-room/collision-grid context in `createEnemyEncounterSpatialDeps()`, and spawn controller/enemy spawn/memory shard spawn runtime access in `createEnemyEncounterSpawnerDeps()`.
- Do not mix encounter difficulty/progress data, spatial context, and concrete spawner runtime dependencies back into one flat constructor object.


## 2026-06-19 - Memory shard spawn dependency bundles
- `ItemWorldScene.wireMemoryShardSpawnRuntime()` should only compose grouped dependency bundles for `ItemWorldMemoryShardSpawnRuntime`.
- Keep item access in `createMemoryShardSpawnItemDeps()`, damage/HUD/screen feedback in `createMemoryShardSpawnFeedbackDeps()`, capture-orb access in `createMemoryShardSpawnCaptureDeps()`, lore display and unlocked event state in `createMemoryShardSpawnLoreDeps()`, and enemy spawn runtime access in `createMemoryShardSpawnEnemyDeps()`.
- Do not mix memory shard reward spawning, combat feedback, capture behavior, lore unlock state, and enemy-spawn access back into one flat constructor object.


## 2026-06-19 - Neighbor pre-spawn dependency bundles
- `ItemWorldScene.wireNeighborPreSpawnRuntime()` should only compose grouped dependency bundles for `ItemWorldNeighborPreSpawnRuntime`.
- Keep unified-grid/spawned-room state in `createNeighborPreSpawnGridDeps()`, enemy pressure checks in `createNeighborPreSpawnPressureDeps()`, runtime cell/enemy spawn side effects in `createNeighborPreSpawnSpawnDeps()`, and debug label/persistence state in `createNeighborPreSpawnStateDeps()`.
- Do not mix neighbor spawn eligibility state, current enemy pressure, spawn side effects, and persistence/debug labeling back into one flat constructor object.


## 2026-06-19 - Cell visibility dependency bundles
- `ItemWorldScene.wireCellVisibilityRuntime()` should only compose grouped dependency bundles for `ItemWorldCellVisibilityRuntime`.
- Keep cell visual/spawn runtime access in `createCellVisibilityVisualDeps()`, camera access in `createCellVisibilityCameraDeps()`, fluid/full-grid access in `createCellVisibilityFluidDeps()`, and tile hazard access in `createCellVisibilityHazardDeps()`.
- Do not mix visual cell visibility, camera culling context, fluid refresh context, and hazard visibility side effects back into one flat constructor object.


## 2026-06-19 - Ego shard projectile dependency bundles
- `ItemWorldScene.wireEgoShardProjectileRuntime()` should only compose grouped dependency bundles for `ItemWorldEgoShardProjectileRuntime`.
- Keep player access in `createEgoShardProjectileActorDeps()`, collision grid access in `createEgoShardProjectileWorldDeps()`, Ego shard runtime access in `createEgoShardProjectileRuntimeDeps()`, and impact/combat/fluid flush callbacks in `createEgoShardProjectileImpactDeps()`.
- Do not mix projectile movement context, shard runtime access, impact handling, hit checking, and fluid flush side effects back into one flat constructor object.


## 2026-06-19 - Player spawn dependency bundles
- `ItemWorldScene.wirePlayerSpawnRuntime()` should only compose grouped dependency bundles for `ItemWorldPlayerSpawnRuntime`.
- Keep collision grid access in `createPlayerSpawnWorldDeps()`, player and player-size access in `createPlayerSpawnActorDeps()`, camera snap in `createPlayerSpawnCameraDeps()`, and spawn point resolution in `createPlayerSpawnResolverDeps()`.
- Do not mix spawn point computation, player mutation context, and camera snap side effects back into one flat constructor object.


## 2026-06-19 - Prologue end dependency bundles
- `ItemWorldScene.wirePrologueEndRuntime()` should only compose grouped dependency bundles for `ItemWorldPrologueEndRuntime`.
- Keep game/core access in `createPrologueEndCoreDeps()`, player/fade/entity-layer access in `createPrologueEndActorDeps()`, prologue gating in `createPrologueEndGateDeps()`, camera/screen feedback in `createPrologueEndFeedbackDeps()`, and world/prologue-end exit fallback in `createPrologueEndExitDeps()`.
- Do not mix prologue eligibility checks, visual actors, feedback effects, and final exit routing back into one flat constructor object.


## 2026-06-19 - Prompt runtime dependency bundles
- `ItemWorldScene.wirePromptRuntime()` should only compose grouped dependency bundles for `ItemWorldPromptRuntime`.
- Keep UI/trapdoor/anvil target runtime access in `createPromptTargetDeps()` and transition/absorb/exit/post-clear suppression state in `createPromptSuppressionDeps()`.
- Do not mix prompt target ownership and temporary prompt suppression gates back into one flat constructor object.


## 2026-06-19 - Cell visual dependency bundles
- `ItemWorldScene.wireCellVisualRuntime()` should only compose grouped dependency bundles for `ItemWorldCellVisualRuntime`.
- Keep collision grid access in `createCellVisualWorldDeps()`, atlas/theme/temperament data in `createCellVisualThemeDeps()`, unified-map dimensions in `createCellVisualMapDeps()`, and render aggregate layer access in `createCellVisualAggregateDeps()`.
- Do not mix grid collision context, visual theme selection, map sizing, and aggregate layer ownership back into one flat constructor object.


## 2026-06-19 - Stratum picker dependency bundles
- `ItemWorldScene.wireStratumPickerRuntime()` should only compose grouped dependency bundles for `ItemWorldStratumPickerRuntime`.
- Keep game/HUD skin access in `createStratumPickerCoreDeps()`, item/progress/strata/cleared-flag data in `createStratumPickerProgressDeps()`, and jump action dispatch in `createStratumPickerActionDeps()`.
- Do not mix stratum picker UI setup, durable progression data, and debug/jump side effects back into one flat constructor object.


## 2026-06-19 - Enemy spawn dependency bundles
- `ItemWorldScene.wireEnemySpawnRuntime()` should only compose grouped dependency bundles for `ItemWorldEnemySpawnRuntime`.
- Keep collision grid access in `createEnemySpawnWorldDeps()`, player access in `createEnemySpawnActorDeps()`, registry/entity-layer mutation in `createEnemySpawnRegistryDeps()`, room enemy count state in `createEnemySpawnRoomStateDeps()`, and spawn controller access in `createEnemySpawnControllerDeps()`.
- Do not mix spawn placement context, actor access, enemy registry mutation, room count state, and spawn controller ownership back into one flat constructor object.


## 2026-06-19 - Resident runtime dependency bundles
- `ItemWorldScene.wireResidentRuntime()` should only compose grouped dependency bundles for `ItemWorldResidentRuntime`.
- Keep resident layer access in `createResidentRenderDeps()`, player access in `createResidentActorDeps()`, lore display access in `createResidentLoreDeps()`, and Ego flags/unlocked event state in `createResidentEgoStateDeps()`.
- Do not mix resident rendering, player proximity context, lore display access, and Ego durable state back into one flat constructor object.


## 2026-06-19 - Safe-room resident spawn dependency bundles
- `ItemWorldScene.wireSafeRoomResidentSpawnRuntime()` should only compose grouped dependency bundles for `ItemWorldSafeRoomResidentSpawnRuntime`.
- Keep item UID seed access in `createSafeRoomResidentSpawnSeedDeps()`, collision grid access in `createSafeRoomResidentSpawnWorldDeps()`, PRNG creation in `createSafeRoomResidentSpawnRandomDeps()`, spawn controller access in `createSafeRoomResidentSpawnControllerDeps()`, and resident runtime access in `createSafeRoomResidentSpawnRuntimeDeps()`.
- Do not mix deterministic spawn seed data, collision context, random factory, spawn controller, and resident runtime mutation back into one flat constructor object.


## 2026-06-19 - Full map layer rebuild dependency bundles
- `ItemWorldScene.wireFullMapLayerRebuildRuntime()` should only compose grouped dependency bundles for `ItemWorldFullMapLayerRebuildRuntime`.
- Keep previous full-map container access in `createFullMapLayerRebuildContainerDeps()` and area palette filter access in `createFullMapLayerRebuildPaletteDeps()`.
- Do not mix full-map container replacement and palette/filter ownership back into one flat constructor object.


## 2026-06-19 - Anvil runtime dependency bundles
- `ItemWorldScene.wireItemWorldAnvilRuntime()` should only compose grouped dependency bundles for `ItemWorldAnvilRuntime`.
- Keep game/entity/player access in `createAnvilCoreDeps()`, prompt/modal/flow/transition suppression checks in `createAnvilInteractionGateDeps()`, and escape modal dispatch in `createAnvilReturnDeps()`.
- Do not mix anvil interaction target access, temporary interaction suppression gates, and return/escape UI actions back into one flat constructor object.


## 2026-06-19 - Trapdoor runtime dependency bundles
- `ItemWorldScene.wireTrapdoorRuntime()` should only compose grouped dependency bundles for `ItemWorldTrapdoorRuntime`.
- Keep game/player/trapdoor target access in `createTrapdoorCoreDeps()`, exit/post-clear/transition suppression checks in `createTrapdoorInteractionGateDeps()`, and descent activation dispatch in `createTrapdoorActivationDeps()`.
- Do not mix trapdoor target access, temporary interaction suppression gates, and activation side effects back into one flat constructor object.


## 2026-06-19 - Weather runtime dependency bundles
- `ItemWorldScene.wireWeatherRuntime()` should only compose grouped dependency bundles for `ItemWorldWeatherRuntime`.
- Keep game/tile-size config in `createWeatherCoreDeps()`, weather layer access in `createWeatherRenderDeps()`, theme/temperament data in `createWeatherThemeDeps()`, and collision grid access in `createWeatherWorldDeps()`.
- Do not mix weather rendering layer ownership, theme selection, and collision/world context back into one flat constructor object.


## 2026-06-19 - Boss choice dependency bundles
- `ItemWorldScene.wireBossChoiceRuntime()` should only compose grouped dependency bundles for `ItemWorldBossChoiceRuntime`.
- Keep game/UI/HUD skin modal access in `createBossChoiceCoreDeps()` and continue/exit flow dispatch in `createBossChoiceActionDeps()`.
- Do not mix boss-choice modal presentation and stratum continue/exit side effects back into one flat constructor object.


## 2026-06-19 - Ego shard cast dependency bundles
- `ItemWorldScene.wireEgoShardCastRuntime()` should only compose grouped dependency bundles for `ItemWorldEgoShardCastRuntime`.
- Keep game/input access in `createEgoShardCastCoreDeps()`, player access in `createEgoShardCastActorDeps()`, collision grid access in `createEgoShardCastWorldDeps()`, Ego shard runtime access in `createEgoShardCastRuntimeDeps()`, and held-container casting gate in `createEgoShardCastGateDeps()`.
- Do not mix cast input/core context, player/world context, shard runtime dispatch, and held-container suppression gates back into one flat constructor object.


## 2026-06-19 - Template picker dependency bundles
- `ItemWorldScene.wireTemplatePickerRuntime()` should only compose grouped dependency bundles for `ItemWorldTemplatePickerRuntime`.
- Keep LDtk template and memory-room placement sources in `createTemplatePickerSourceDeps()` and start/end room role queries in `createTemplatePickerRoomRoleDeps()`.
- Do not mix template source ownership and generated room role classification back into one flat constructor object.


## 2026-06-19 - Capture orb dependency bundles
- `ItemWorldScene.wireCaptureOrbRuntime()` should only compose grouped dependency bundles for `ItemWorldCaptureOrbRuntime`.
- Keep entity-layer rendering access in `createCaptureOrbRenderDeps()`, player target-center calculation in `createCaptureOrbTargetDeps()`, and arrival screen-flash feedback in `createCaptureOrbFeedbackDeps()`.
- Do not mix capture orb rendering, target actor positioning, and feedback effects back into one flat constructor object.


## 2026-06-19 - Onboarding dependency bundles
- `ItemWorldScene.wireOnboardingRuntime()` should only compose grouped dependency bundles for `ItemWorldOnboardingRuntime`.
- Keep game/input core access in `createOnboardingCoreDeps()`, UI controller/HUD skin access in `createOnboardingUiDeps()`, and tutorial hint access in `createOnboardingHintDeps()`.
- Do not mix onboarding core input handling, modal UI surfaces, and tutorial hint display access back into one flat constructor object.


## 2026-06-19 - Container carry dependency bundles
- `ItemWorldScene.wireContainerCarryRuntime()` should only compose grouped dependency bundles for `ItemWorldContainerCarryRuntime`.
- Keep game/input core access in `createContainerCarryCoreDeps()`, player/container collection access in `createContainerCarryActorDeps()`, and arc tether feedback access in `createContainerCarryFeedbackDeps()`.
- Do not mix container carry input context, actor/container lookup, and tether feedback ownership back into one flat constructor object.


## 2026-06-19 - Memory trigger dependency bundles
- `ItemWorldScene.wireMemoryTriggerRuntime()` should only compose grouped dependency bundles for `ItemWorldMemoryTriggerRuntime`.
- Keep entity-layer trigger rendering in `createMemoryTriggerRenderDeps()`, player proximity access in `createMemoryTriggerActorDeps()`, and lore display access in `createMemoryTriggerLoreDeps()`.
- Do not mix memory trigger rendering, player lookup, and lore display dispatch back into one flat constructor object.


## 2026-06-19 - Room clear dependency bundles
- `ItemWorldScene.wireRoomClearRuntime()` should only compose grouped dependency bundles for `ItemWorldRoomClearRuntime`.
- Keep item access in `createRoomClearItemDeps()`, run-stat room-clear mutation in `createRoomClearStatsDeps()`, and room-state persistence in `createRoomClearPersistenceDeps()`.
- Do not mix item context, run-stat mutation, and persistence side effects back into one flat constructor object.


## 2026-06-19 - Ambient frame dependency bundles
- `ItemWorldScene.wireAmbientFrameRuntime()` should only compose grouped dependency bundles for `ItemWorldAmbientFrameRuntime`.
- Keep per-frame interaction input reset in `createAmbientFrameInputDeps()`, weather ticking in `createAmbientFrameWeatherDeps()`, and entry-corridor color restoration in `createAmbientFrameEntryCorridorDeps()`.
- Do not mix input frame boundaries, ambient weather updates, and entry-corridor visual restoration back into one flat constructor object.


## 2026-06-19 - Room query dependency bundles
- `ItemWorldScene.wireRoomQueryRuntime()` should only compose grouped dependency bundles for `ItemWorldRoomQueryRuntime`.
- Keep unified-grid access in `createRoomQueryGridDeps()`, current room cursor access in `createRoomQueryCurrentRoomDeps()`, and enemy registry query access in `createRoomQueryEnemyDeps()`.
- Do not mix generated room topology/grid access, mutable current-room cursor state, and enemy registry query context back into one flat constructor object.


## 2026-06-19 - Room rect dependency bundles
- `ItemWorldScene.wireRoomRectRuntime()` should construct `ItemWorldRoomRectRuntime` from `createRoomRectSourceDeps()` and `createRoomRectFallbackConfig()`.
- Keep unified-grid/cell-visual record lookup in the source deps and tile/fallback room-size constants in the fallback config.
- Do not mix runtime room footprint sources and fallback sizing constants back into one inline constructor call.


## 2026-06-19 - Item world camera dependency bundles
- `ItemWorldScene.wireItemWorldCameraRuntime()` should only compose grouped dependency bundles for `ItemWorldCameraRuntime`.
- Keep game/camera core access in `createItemWorldCameraCoreDeps()`, player target access in `createItemWorldCameraTargetDeps()`, and full-map pixel bounds in `createItemWorldCameraBoundsDeps()`.
- Do not mix camera core ownership, player target lookup, and generated map bounds calculation back into one flat constructor object.


## 2026-06-19 - Ego dialogue dependency bundles
- `ItemWorldScene.wireEgoDialogueRuntime()` should only compose grouped dependency bundles for `ItemWorldEgoDialogueRuntime`.
- Keep lore display access in `createEgoDialogueDisplayDeps()` and durable Ego unlocked-event state in `createEgoDialogueEventStateDeps()`.
- Do not mix dialogue display surface ownership and persistent Ego event-state ownership back into one flat constructor object.

## 2026-06-19 - Final runtime dependency bundle cleanup
- `ItemWorldScene` should keep `wire*Runtime()` methods as constructor composition points; direct callback/property closures belong in `create*Deps()` helpers.
- The final cleanup split debug render/dev overlay, room transition/fade, boss clear, unavailable input, memory room placement, room type, container destruction, camera zone, and entity cleanup runtimes into grouped dependency bundles.
- Keep debug actor/world/camera, dev overlay graph/item/config, entity cleanup registry/runtime/interactive, and small overlay/query/core deps separated instead of re-inlining callbacks in `wire*Runtime()` methods.

## 2026-06-19 - Runtime wire residual cleanup
- `BossHpRuntime`, `ItemWorldEntryCorridorRuntime`, and `ItemWorldMovementVfxRuntime` also follow the same dependency bundle rule.
- Keep boss HP HUD/enemy/engagement deps, entry-corridor core deps, and movement-VFX manager deps outside `wire*Runtime()` constructor bodies.
- Structural audits should flag direct callbacks or inline constructor properties in `wire*Runtime()` before considering the Item World scene refactor complete.
