
## 2026-06-09 - ItemWorld Entry Push Transition Contract Normalization

- Updated `ItemWorldEntryPushTransition.push()` to make post-push dialogue callback optional and to keep the runtime call signature as `(scene, preparePush, options, onBeginEntryDialogueAfterTransition?)`.
- Updated `WorldItemWorldSceneFlowRuntime` / `WorldScenePortalItemWorldFlowRuntime` to pass callback-less `preparePush/options` form.
- Removed the obsolete no-op `startReturnFade` dependency from `WorldScene` item-world transition preparation wiring.
- Verified compatibility through code-path scan: `ItemWorldEntryPushTransition.push` callsites now match the updated contract and only the intended transition callback sites remain in the implementation.

## 2026-06-05 - Legacy WorldScene Enemy Death Drop Extraction

- Extracted `WorldScene.processEnemyJustDied(enemy)` from the legacy enemy update loop.
- This keeps drop behavior unchanged while shrinking the mixed update/death/drop loop and preparing the item-drop path for a future helper/runtime extraction.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - Legacy WorldScene Enemy Update Loop Extraction

- Extracted the legacy `WorldScene` enemy update/death/removal loop into `updateEnemies(dt)`.
- The main `update()` path now delegates enemy lifecycle work before player attack feedback and projectile handling, preserving prior ordering.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - Legacy WorldScene Player Attack Feedback Extraction

- Extracted `WorldScene.updatePlayerAttackHitFeedback()` from the legacy `update()` method.
- This keeps `HitManager.checkHits(...)` and `applyPlayerAttackHitFeedback(...)` behavior unchanged while removing another combat side-effect block from the main loop.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - Legacy WorldScene Projectile Update Extraction

- Extracted `WorldScene.updateProjectiles(dt)` from the legacy `update()` method.
- The method owns ghost projectile draining and `updateProjectileCollection(...)` while preserving the original post-player-attack ordering.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - Legacy WorldScene Enemy Movement VFX Extraction

- Extracted `WorldScene.updateEnemyMovementVfx(dt)` from the legacy movement VFX method.
- The enemy water/bubble/ice/landing/jump VFX sequence remains scene-owned; it was not moved into `MovementVfxHelpers`, matching the existing movement VFX boundary notes.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - Proximity Interaction Helper Extraction

- Added `ProximityInteractionHelpers` to share portal/altar proximity, hint, and interact loop mechanics across legacy `WorldScene`, `PortalRuntime`, and `WorldAltarController`.
- Kept side-effect ownership local: portal detach/destroy and item-world transition setup remain portal owners; altar UI/item validation remains altar owners.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - Legacy WorldScene Altar Localization Cleanup

- Replaced hardcoded legacy altar item-row text in `WorldScene.drawAltarUI()` with existing localization keys and `getDisplayName(item)`.
- This was found while comparing legacy altar UI with `WorldAltarController`; it preserves the localization SSoT invariant.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - Item Selection Input Helper Extraction

- Added `ItemSelectionInputHelpers.updateItemSelectionInput()` to share altar item selection input handling across legacy `WorldScene` and `WorldAltarController`.
- The helper owns only input/index/redraw/confirm/cancel dispatch; caller-specific validation, toasts, altar state, portal spawning, and UI rendering remain local.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - Altar Item Selection UI Helper Extraction

- Added `AltarItemSelectionUiHelpers.addAltarItemRows(...)` to share localized altar item-row rendering across legacy `WorldScene` and `WorldAltarController`.
- The helper owns only row labels/placement; panel styling, title text, UI container lifecycle, validation, and gameplay side effects remain caller-owned.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - ItemWorld AABB Grid Clear Helper Extraction

- Promoted Item World's scene-local AABB solid-grid clearance check to `core/Physics.isAabbClearOfSolidTiles(...)`.
- `ItemWorldScene` no longer owns the tile iteration loop for entry-corridor placement; the helper reuses core `getTile`/`isSolid` semantics, including out-of-bounds-as-solid.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - ItemWorld Full Map Population Helper Extraction

- Extracted Item World full-map unified-grid room iteration into `populateItemWorldFullMapRooms(...)`.
- The helper owns traversal/seed/offset/count mechanics; runtime-owned side effects remain in `ItemWorldScene.buildFullMap()` callbacks for now.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - Container Target Helper Extraction

- Added `ContainerTargetHelpers.compactContainers(...)` to remove repeated nullable Pixi container type guards from world runtime wiring.
- The helper preserves caller-owned target selection/order and owns only nullish compaction.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - LDtk World Tileset Path Collection Cleanup

- Replaced `LdtkWorldScene` scene-local LDtk tile flattening/path collection loop with existing `collectLdtkTilesetPaths(...)`.
- Scene still owns combining main world and builder loader levels before asset preloading.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - World LDtk Tile Filtering Helper Extraction

- Extracted `filterWorldWallTilesForCollision(...)` for LDtk world wall tile filtering against the live collision grid.
- Initial render still excludes water cells for FluidSystem ownership; rerender keeps the prior destroyed-tile/slope behavior.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - LDtk Area Retag Helper Extraction

- Extracted default world LDtk area retagging into `LdtkAreaRetagHelpers.applyDefaultWorldAreaRetags(...)`.
- `LdtkWorldScene` retags BG/WALL; `GiantBuilder` retags BG/WALL/shadow while keeping caller-specific area ids and override-tileset preservation.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - LDtk Authored Tileset Preload Helper Extraction

- Added `LdtkTilesetPaths.preloadMissingLdtkTilesets(...)` to share authored LDtk tileset collection and missing atlas loading.
- `ItemWorldEntryPreloader` now owns only entry prestream orchestration and warning policy; the load loop lives in the level utility.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.

## 2026-06-05 - World Builder Entity Dispatch Helper Extraction

- Added `WorldBuilderEntitySpawnHelpers.dispatchBuilderEntities(...)` to remove the builder entity loop from `WorldBuilderFlowRuntime`.
- Handler order remains caller-owned and behavior-significant; the first handler returning true claims the entity.
- Verified with `npx tsc --noEmit` and `npm run build`; build still only reports the known LDtk/CSV `atlas/prologue_01.png` warning.
