---
feature: Refactor Roadmap
status: completed
last_updated: 2026-06-20
---
# Refactor Roadmap

Purpose: handoff plan for model-to-model refactoring during main development. This page records the current survey, guardrails, and executable work slices. Treat the current worktree as authoritative if this page drifts.

## Current Baseline

- Stack: `game/` is Vite + PixiJS v8 + TypeScript strict mode. Build scripts run `Sheets/tools/csv_to_locale.mjs` and `Sheets/tools/validate.mjs` before full builds.
- Validation reality: no `game/tests` suite was found during the 2026-06-04 survey. Use `npx tsc --noEmit` first, then `npm run build` for shared scene/data changes, then browser smoke only for gameplay flow changes.
- Hotspot by size: `game/src/scenes/LdtkWorldScene.ts` is about 3950 lines / 217 imports.
- Hotspot by size: `game/src/scenes/ItemWorldScene.ts` is about 3239 lines / 174 imports.
- Other large files: `game/src/level/ProceduralDecorator.ts`, `game/src/entities/Player.ts`, `game/src/ui/HUD.ts`, `game/src/ui/InventoryUI.ts`, `game/src/effects/FluidSystem.ts`, `game/src/scenes/WorldScene.ts`, `game/src/ui/PauseMenu.ts`.
- Area totals from `game/src`: `scenes` is about 33k lines across 235 TS files, then `entities` about 14k, `effects` about 13.6k, `ui` about 12.5k.
- Data SSoT: `Sheets/Content_Localization.csv` has about 692 rows and remains the player-facing text source. Do not add hardcoded game UI text in code.

## Non-Negotiable Guardrails

- Follow `DEC-042`: do not replace the live world collision grid object during gameplay. Use `WorldCollisionGridRuntime` for LDtk world grid ownership and `RuntimeCollisionScope` for scoped temporary mutation.
- Do not add broad grid replacement APIs to `WorldCollisionGridRuntime`.
- Do not move Level 36 official Item World entry placement/player-start math back into `LdtkWorldScene`; it belongs in `ItemWorldEntryStreamRuntime`.
- Do not grow `ItemDeploymentController.ts` back into an implementation file; it is a compatibility facade after `DEC-042`.
- Follow `DEC-039`: Item World topology is vertical dive graph, with Plaza above, Boss below, and manual trapdoor descent after boss clear.
- Follow `DEC-040`: audio uses `@pixi/sound`; do not reintroduce Howler.js.
- Follow `DEC-041`: fluid crest foam uses CSV SSoT and the separated `FluidCrestFoamManager` approach.
- Follow `SharedUiBindings`: do not duplicate gamepad toast, leave-confirm, or low-HP heal hint wiring in scenes.
- Follow `ItemWorldFlowState`: do not reintroduce scene-owned generic transition state for `exit_fade` or `post_clear_hold`.

## Refactor Strategy

The goal is not a large rewrite. The goal is to keep scenes as composition/lifecycle owners while feature runtimes own state transitions, collision lifetimes, spawning rules, prompts, and repeated gameplay mechanics.

Recommended order:

1. Shrink `LdtkWorldScene` around existing `World*Runtime` boundaries.
2. Shrink `ItemWorldScene` around existing `ItemWorld*Runtime` boundaries.
3. Normalize deps contracts for parallel World/ItemWorld runtimes.
4. Extract only proven shared runtime logic into `game/src/scenes/shared/`.
5. Split large UI files after scene flow risk is reduced.

## Work Slice R1: LDtk World Scene Orchestration

Primary file: `game/src/scenes/LdtkWorldScene.ts`.

Existing method clusters:

- `wireCoreAndAnvilRuntimes()`
- `wireEnvironmentRuntimes()`
- `wirePickupAndBuilderItemRuntimes()`
- `wireTerrainRuntimes()`
- `wireItemWorldFlowRuntimes()`
- `wireCombatAndTransitionRuntimes()`
- `registerProximityHandlers()`
- `init()`, `enter()`, `update()`, `render()`, `exit()`
- `loadLevel()`, `rerenderTilemap()`, builder spawn/clear helpers, portal helpers, respawn/game-over helpers

Execution plan:

- First move only cohesive private helpers that already delegate to a runtime. Avoid changing behavior and avoid moving collision grid ownership.
- Keep `LdtkWorldScene` as the place that wires dependencies and owns Pixi containers, but move sequence logic into named world runtimes when a helper has its own lifecycle.
- Candidate extraction: `spawnBuilderFromSpawner()`, `spawnBuilderEntities()`, `syncBuilderAttachments()`, `clearBuilder()`, and `getBuilderAtmosphereTargets()` should be reviewed against existing builder runtimes before creating a new one.
- Follow-up from this turn:
  - `WorldBuilderFlowRuntime` now owns builder orchestration in `LdtkWorldScene`.
  - `spawnBuilderFromSpawner()`, `syncBuilderAttachments()`, `clearBuilder()`, `getBuilderAtmosphereTargets()`, and entrance glow updates are routed through `builderFlowRuntime`.
  - `LdtkWorldScene` is now free of these builder-local orchestration helpers; remaining `R1` work is cleanup-only (unused imports, method extraction in peripheral systems).
- Candidate extraction: terrain hazard ticking can be further owned by terrain/door runtimes, but only after verifying existing `WorldDoorSwitch*`, `WorldBossLockRuntime`, and `WorldTileMutationRuntime` contracts.
- Candidate extraction: return fade / frozen return / Item World return cleanup should remain under `WorldItemWorldSceneFlowRuntime`, `WorldFrozenReturnRuntime`, or a small return-flow runtime. Do not add scene-local return helpers back.
- Progress (2026-06-04): `ItemWorldReturnFadeRuntime` now owns return visual normalization through injected callback and scene is no longer keeping a dedicated `startItemWorldReturnFadeIn` helper.
- Progress (2026-06-04): `WorldItemWorldSceneFlowRuntime` no longer depends on `Game` directly for scene pop; pop is injected as callback (`popScene`) from `LdtkWorldScene`, reducing scene coupling in return orchestration.

Acceptance criteria:

- `LdtkWorldScene` line/import count goes down without adding new behavior.
- The scene still owns orchestration, but no new ad hoc collision fields or deployment tunnel helpers appear in the scene.
- `npx tsc --noEmit` passes. Use `npm run build` if any shared runtime, collision, CSV, or asset-loading path changes.

## Work Slice R2: Item World Scene Flow

Primary file: `game/src/scenes/ItemWorldScene.ts`.

High-risk remaining clusters:

- Entry corridor activation and completion: `ItemWorldEntryCorridorRuntime` orchestration (`startGameplayAfterEntry`, `beginEntryDialogueAfterTransition()`), `activateEntryCorridor()`, `updateEntryCorridorTileReveal()`, `completeEntryCorridor()`.
- Room/progress state delegation: `countTotalRooms()`, `getCell()`, `getCurrentCell()`, `restoreRoomState()`, `persistRoomState()`, `buildFullMap()`, `spawnEnemiesInRoom()`, `clearEnemies()`.
- Trapdoor and exit flow: `startPreparedExitFade()`, `startPostClearHold()`, `trapdoorFlowRuntime.startDescent()`, `disposeTrapdoor()`, scene-level continuation/exit handoff.
- Ego event forwarders at the end of the class.

Execution plan:

- Promote entry corridor orchestration into one owner runtime that composes `ItemWorldEntryCorridorState`, `Layout`, `VisualRuntime`, `VisibilityRuntime`, and `RevealRuntime`.
- Move trapdoor spawn timing and post-boss descent transitions behind `ItemWorldTrapdoorRuntime`, `ItemWorldBossClearRuntime`, and `ItemWorldTrapdoorFlowRuntime` sequencing (final/intermediate path split now split by callbacks).
- Keep `ItemWorldFlowState` as the only owner for `exit_fade` / `post_clear_hold`. Scene should call it, not mirror it.
- Avoid broad changes to RoomGraph or topology unless the task explicitly targets Item World generation. `DEC-039` is settled.

Progress update (2026-06-04):

- Added `game/src/scenes/itemworld/ItemWorldEntryCorridorRuntime.ts` and moved entry corridor start/update/completion orchestration there.
- `ItemWorldScene` delegates entry corridor camera/collision/visual lifecycle to `ItemWorldEntryCorridorRuntime`.
- `ItemWorldScene` delegates gameplay start and entry dialogue handoff (`startGameplayAfterEntry`, `beginEntryDialogueAfterTransition()`) to `ItemWorldEntryCorridorRuntime`, while keeping only a public bridge for transition entrypoints.
- R2 room/progress delegation is complete; entry gameplay startup and entry dialogue orchestration is now also delegated to `ItemWorldEntryCorridorRuntime`. Remaining R2 work is focused on `ItemWorldTrapdoor*` flow cleanup and deeper runtime contract normalization.
  - 2026-06-04: `ItemWorldScene` -> `ItemWorldEntryCorridorRuntime` ownership 완료. `npx tsc --noEmit` + `npm run build` pass.
- `ItemWorldScene` timer-driven boss-clear and entry dialogue timing was migrated to `ItemWorldBossClearRuntime`:
  - removed remaining `setTimeout` calls for boss-clear follow-up burst (`160ms`) and trapdoor/`EGO_BOSS_KILLED` spawn delay (`2500ms`);
  - removed entry corridor-to-dungeon dialogue delay (`250ms`) from imperative timers;
  - wired runtime update each frame and added lifecycle cleanup in `exit()`/`destroy()`.
- R2 continuation (room/progress delegation and ownership): `ItemWorldScene` no longer owns room/progress helper wrappers for:
  - `countTotalRooms()`
  - `restoreRoomState()`
  - `persistRoomState()`
  - `getCurrentCell()`
  - `spawnEnemiesInRoom()`
  - `clearEnemies()`
  and now delegates these responsibilities through `ItemWorldRoomStateRuntime` + direct room runtime calls. 
- R2 status after this commit:
  - ItemWorldTrapdoorFlowRuntime added and ItemWorldScene delegates trapdoor activation to it.
  - Trapdoor descent preparation/final/intermediate branch handling is split into explicit scene callbacks.
  - Trapdoor re-entry is guarded in ItemWorldTrapdoorFlowRuntime by active/consumed-state checks.
  - Scene-level scene-helper wrappers for startExitFade/startPostClearHold were inlined in ItemWorldScene and now directly delegate to ItemWorldFlowState/ExitFadeRuntime.
  - Follow-up executed: ItemWorldScene now routes trapdoor preparation and branch side-effects through ItemWorldTrapdoorFlowRuntime callbacks at construction time, and uses disposeTrapdoor() as the single clear path for build-map and trapdoor teardown.
  - Deeper contract normalization remains for post-handoff state transitions and shared input gating.
  - Entry-corridor frame handoff now calls ItemWorldEntryCorridorRuntime.update(dt) directly; no scene-only updateEntryCorridor() shim remains.
  - ItemWorldTrapdoorSpawnRuntime now owns boss-clear trapdoor placement calculation and final-stratum routing decision; ItemWorldScene consumes snapshots and performs concrete spawn side-effects.
  - ItemWorldReturnFlowRuntime now centralizes Item World 종료 경로(사망/클리어/탈출/프로로그 종료) 후처리와 반환 페이드/완료 전달 구간.
  - ItemWorldScene 최종 트랩도어 하강(흡수 연출) 완료 경로도 `ItemWorldReturnFlowRuntime.startPreparedExitFade()`로 통합해 반환 준비/중복 방지 가드를 재사용하도록 정리.
Acceptance criteria:

- No new scene-owned transition strings or duplicated `setTimeout` chains.
- Trapdoor descent still requires manual player activation, not automatic boss-clear descent.
- Entry corridor still suppresses world visuals and restores them through runtime cleanup.
- `npx tsc --noEmit` passes. Add browser smoke if entry, boss clear, trapdoor, or return flow changes.

## Work Slice R3: Parallel Runtime Normalization

World/ItemWorld parallel runtime names found during survey:

- `BreakablePropRuntime`
- `BurnablePropRegistry`
- `ContainerCarryRuntime`
- `ContainerFluidRuntime`
- `ContainerPhysicsRuntime`
- `ContainerRegistry`
- `EgoDialogueRuntime`
- `EgoShardCastRuntime`
- `EgoShardCombatRuntime`
- `EgoShardImpactRuntime`
- `EgoShardProjectileRuntime`
- `EnemyRegistry`
- `EnemySpawnRuntime`
- `MovementVfxRuntime`
- `PickupRuntime`
- `PlayerSpawnRuntime`
- `ProceduralDecorRuntime`
- `ProjectileRuntime`
- `UiController`
- `WeatherRuntime`

Execution plan:

- Do not merge these just because names match. First align deps naming where behavior is already identical, for example `getCollisionGrid()` vs `getFullGrid()`.
- Good early shared candidates: container carry state, projectile collection/collision shell, and enemy room-data assignment helpers.
- Progressed: container flow contracts are now partially normalized. `ItemWorldContainerPhysicsRuntime` and `ItemWorldContainerFluidRuntime` now use the same collision-grid naming (`getCollisionGrid`) as world runtimes and container removal is delegated via `removeContainerAt` instead of direct array mutation.
- Progressed: remaining Item World runtimes were normalized to `getCollisionGrid` (cell visual, enemy spawn, entry corridor, movement VFX, player spawn, safe-room resident spawn, runtime cell spawner, static entity spawner/runtime, tile hazard, weather). Scene callbacks now remove containers through `ItemWorldContainerRegistry.removeAt`.
- Progressed: `world` and `itemworld` container collision/fluid/registry logic now share the tile predicates from `scenes/shared/ContainerTileRules` (`CONTAINER_SOLID_TILES`, `CONTAINER_FLUID_TILES`, `isContainerSolidCell`, `isContainerFluidCell`) to prevent tile-rule drift between modes.
- Progressed (2026-06-04): `world` and `itemworld` container physics now share `scenes/shared/ContainerPositionHelpers` for model-to-Pixi container position sync after collision resolution (`syncContainerRenderPosition`, `moveContainerToX`, `moveContainerByY`), X-occupancy checks (`canContainerOccupyX`), fluid-overlap checks (`containerOverlapsFluid`), AABB overlap snapshots (`getContainerOverlapSnapshot`), and environment predicate creation (`createContainerEnvironment`). Runtime-private X/fluid/solid-cell/environment wrappers were removed; physics formulas remain mode-local.
- Progressed (2026-06-04): `world` and `itemworld` thrown-container enemy hit handling now share `scenes/shared/ContainerImpactHelpers.processThrownContainerEnemyHits()`, keeping damage/knockback/boss handling/paint/destroy/remove ordering identical across modes.
- Progressed (2026-06-04): `world` and `itemworld` container body update loops now share `scenes/shared/ContainerBodyUpdateHelpers.updateContainerBodies()`, preserving environment impact, fluid paint, destroy/remove, and per-frame fluid-effect ordering through injected side-effect callbacks.
- Progressed (2026-06-04): `world` and `itemworld` player-container collision resolution now shares `scenes/shared/ContainerPlayerCollisionHelpers.resolvePlayerContainerOverlaps()`. The helper preserves player grounding, container pushback, X occupancy checks, and velocity zeroing behavior.
- Progressed (2026-06-04): `world` and `itemworld` enemy-container collision resolution now shares `scenes/shared/ContainerEnemyCollisionHelpers.resolveEnemyContainerOverlaps()`, preserving enemy/container separation and velocity zeroing behavior.
- Progressed (2026-06-04): player standing-on-container detection now shares `ContainerPlayerCollisionHelpers.isPlayerStandingOnContainerTop()` across world physics and Item World registry. World container-container collision now lives in `scenes/shared/ContainerContainerCollisionHelpers.resolveContainerContainerCollisions()`, keeping the world runtime as orchestration plus mode-specific update ordering.
- Progressed (2026-06-05): `world` and `itemworld` container spawn settling now shares `scenes/shared/ContainerSpawnSettleHelpers` (`settleContainerAtSpawn`, `settleContainersAtSpawn`), removing repeated solid/fluid callback wrappers from world spawn, maintained spawner refill, Item World registry settle paths, and Item World runtime cell spawns.
- Progressed (2026-06-05): world and Item World container spawner occupied-cell calculation now uses `ContainerSpawnSettleHelpers.buildContainerOccupiedCells()`, preserving maintained-refill `skipDestroyed` behavior while removing duplicate cell-bound loops from initial spawn, maintained refill, and runtime cell spawn paths.
- Progressed (2026-06-05): world and Item World runtime container kind resolution now shares `scenes/shared/ContainerKindHelpers.resolveRuntimeContainerKind()`, preserving direct kind parsing plus Generic_A/B/C slot resolution with optional temperament.
- Progressed (2026-06-05): world and Item World hostile projectile runtime lifetime scaffolding now shares `scenes/shared/ProjectileCollectionHelpers` for projectile list attachment, Ghost pending-drain, clear, and destroy/splice operations. Projectile AABB construction and deflect spark placement also share `scenes/shared/ProjectileCollisionHelpers`; mode-specific deflect hitbox source and player-hit feedback remain in `WorldProjectileRuntime` / `ItemWorldProjectileRuntime`.
- Progressed (2026-06-05): world authored breakable plus world/Item World procedural breakable prop drops now share `scenes/shared/BreakableDropHelpers.applyBreakableDrop()` for gold burst and flask charge handling after `Breakable.break()` / `BreakableProp.break()`. Mode-specific hit detection, VFX/SFX feedback, registry removal, and final prop destruction remain in their runtimes.
- Progressed (2026-06-05): world authored breakable plus world/Item World procedural breakable prop destruction feedback now shares `scenes/shared/BreakableFeedbackHelpers.applyBreakableDestroyFeedback()` for sword hitstop/camera shake, shatter VFX, SFX, and sword hit sparks. `break()`, TileMutator unregister, registry removal, and final prop destruction remain runtime-owned.
- Progressed (2026-06-05): world and Item World enemy drop coordinate construction now shares `EnemyCombatDropHelpers.getEnemyBottomLeftDropCoordinates()`. Whole drop sequencing remains mode-owned because world applies `resolveBottomLeftPickupSpawn()` and spawns gold before healing, while Item World uses raw room coordinates and spawns healing before gold.
- Progressed (2026-06-05): world and Item World enemy-kill analytics payload construction now shares `EnemyCombatAnalyticsHelpers.trackEnemyKillForArea()`. Tracking policy remains runtime-owned: world tracks every handled enemy, while Item World excludes `MemoryShardNPC` before calling the helper.
- Progressed (2026-06-05): world and Item World dead-enemy one-shot processing now shares `EnemyDefeatProcessingHelpers.processEnemyPostDefeats()` for `_postDefeatHandled` guarding and `shouldRemove` removal iteration. Actual reward, analytics policy, boss flow, room clear, and EXP behavior remain runtime-owned.
- Progressed (2026-06-05): legacy `WorldScene` and `ItemWorldEnemyCombatRuntime` now share `EnemyDeathFeedbackHelpers.spawnEnemyDeathParticles()` for enemy-centered death particle coordinates. Legacy item-drop policy, Item World MemoryShard exclusion, and boss/heavy flag decisions remain callsite-owned.
- Progressed (2026-06-05): world and Item World pickup runtimes now share `PickupCollectionHelpers` for entity-layer attachment, clear/destroy loops, and player proximity checks. World LDtk persisted-key handling and Item World healing/gold update ordering remain runtime-owned.
- Progressed (2026-06-05): world and Item World weather runtimes now share `WeatherRuntimeHelpers` for camera-viewport update and destroy/null cleanup. World LDtk Weather parsing/dynamic colliders and Item World palette/stratum profile resolution remain runtime-owned.
- Progressed (2026-06-05): world and Item World movement VFX runtimes now share `MovementVfxHelpers.updatePlayerKinematicVfx()` for the common player kinematic event bundle (landing, dash, double jump, wall jump, afterimage, ground jump, wall slide, footsteps, surge, dive impact). World manager construction/update order and Item World fluid/enemy/player-hit VFX remain runtime-owned.
- Progressed (2026-06-05): world and Item World burnable prop registries now share `BurnablePropRegistryHelpers` for list add/attach, clear/destroy, and remove-at lifecycle operations. TileMutator registration, ash side effects, GrassClumpFireSystem, and fluid residue reset ordering remain runtime/scene-owned.
- Progressed (2026-06-05): world and Item World enemy registries now share `EnemyRegistryHelpers` for list add/attach, remove-at detach/splice, and clear detach lifecycle operations. Spawn parsing, room registration/counts, combat rewards, boss sequencing, and scene special-effect policy remain runtime/scene-owned; LDtk World update/render iteration now lives in dedicated world runtimes.
- Progressed (2026-06-05): world procedural `BreakableProp` registry and Item World breakable-prop runtime now share `BreakablePropRegistryHelpers` for list add/attach, clear/destroy, remove-at destroy/splice, and update iteration where applicable. Item World still has no separate `ItemWorldBreakablePropRegistry`; spawn exclusions, TileMutator registration, hit policy, drops, and feedback remain runtime-owned.
- Progressed (2026-06-05): world and Item World container registries now share `ContainerRegistryHelpers` for list add/attach/addMany, reset, remove-at destroy/splice, and clear destroy lifecycle. Spawn parsing, maintained-spawner policy, settling, standing-on-top checks, carry/physics/fluid/destruction behavior, debug-spawn policy, and scene special-effect iteration remain runtime/scene-owned.
- Progressed (2026-06-05): world and Item World container carry runtimes now share `ContainerCarryStateHelpers` for empty carry-state construction and player lift-pose clearing. Prompt ownership, `ArcTether` display attachment/dependency, and carry update sequencing remain runtime-owned.
- Progressed (2026-06-05): world and Item World procedural decor runtimes now share `ProceduralDecorLayerHelpers` for decorator layer list/detach/attach operations. World generation timing/URL policy/render insertion and Item World theme/density/seed/grass registration remain runtime/scene-owned.
- Progressed (2026-06-05): world and Item World Ego Shard projectile runtimes now share `EgoShardProjectileHelpers` for shard update dispatch, shared solid-tile predicate, post-hit container-fluid flush ordering, 24px player retrieval AABB, and longest-cooldown removal. Cast input, combat hit policy, terrain impact effects, debug routing, and scene reset remain runtime/scene-owned.
- Progressed (2026-06-05): world and Item World Ego Shard impact runtimes share `EgoShardImpactHelpers` for impact footprint cells, debug hitbox geometry, AABB cell iteration, adjacent-air magma growth, and grass cell bounds. Tile mutation, fluid refresh, World debug toasts, Item World debug logs, and Item World electric-overlay tile policy remain runtime-owned.
- Progressed (2026-06-05): world and Item World Ego Shard cast runtimes now share `EgoShardCastHelpers` for debug-gated cast state progression, charge/preview/release sequencing, launch point math, shard cooldown recovery, reset behavior, and preview solid-tile predicate. Runtime files still own input reads and held-container dependency wiring.
- Progressed (2026-06-05): world and Item World container fluid runtimes now share `ContainerFluidHelpers` for container kind-to-fluid tile mapping, live container/fluid contact effects, acid container-chain exposure, water/magma solidification mutation, connected-fluid freeze flood fill, and enemy freeze application. Paint algorithms and flush policy remain mode-owned because World uses painted-cell magma ignition plus tilemap rerender, while Item World uses radius magma ignition plus active tile bounds.
- Progressed (2026-06-05): world and Item World Ego Shard combat runtimes now share `EgoShardCombatHelpers` for enemy/container hit policy, elemental damage/status, thunder-chain footprint, shard retrieval on kill, MetalCrate brittle shatter, container hit sparks, and destroy/remove callbacks. Runtime files are now mode-specific dependency adapters.
- Confirmed (2026-06-05): throwable-container destruction is already shared through `scenes/shared/ContainerDestructionRuntime.ts`; prior world/itemworld wiki pages were corrected to point at the shared runtime. Fluid painting/effects and break trigger ownership remain mode-specific.
- Progressed (2026-06-04): `ItemWorldEntryPushTransition` no longer imports `ItemWorldScene`; the post-reveal callback is now supplied by caller through runtime dependency injection (`WorldItemWorldSceneFlowRuntime`). Scene-level bridge remains as an explicit local callback in `LdtkWorldScene` flow wiring.
- Progressed (2026-06-04): `WorldItemWorldSceneFlowRuntime` now depends on an injected `createScene()` factory and scene contract (`ItemWorldSceneLike`) instead of constructing `ItemWorldScene` directly, keeping the flow runtime focused on orchestration state and transition timing.
- Progressed (2026-06-04): `WorldScene` (legacy procedural mode) no longer pushes `ItemWorldScene` directly; its portal-entry path now uses `ItemWorldEntryPushTransition` for visibility/camera-safe transition orchestration and shared post-transition handoff points.
- Progressed (2026-06-04): `WorldScene` portal-entry flow moved into dedicated `WorldScenePortalItemWorldFlowRuntime` to centralize pop-reward-save callbacks and reduce `completePendingPortalEntry` orchestration width.
- Progressed (2026-06-04): `ItemWorldExitReason` type is now centralized on `ExitType` in `game/src/utils/Analytics.ts` and re-exported through `game/src/scenes/itemworld/ItemWorldExitReason.ts`; `ItemWorldProgressController` and `ItemWorldReturnFlowRuntime` now consume the same contract.
- Progressed (2026-06-07): Item World 반환 경계에서 중복 종료 시퀀스 차단 가드를 추가.
  - `ItemWorldReturnFlowRuntime`에 `returnPreparationStarted` 플래그를 추가해 `startPreparedExitFade()`가 동일 씬 내에서 2회 이상 준비를 실행하지 못하게 했고,
  - `ItemWorldScene`의 return fade 시작시 `flowState.isExitFade` 가드로 다중 키 입력에 의한 페이드 재시작을 차단했다.
- Risky shared candidates: movement VFX and container physics. They share large sections but Item World has extra fluid residue/enemy fluid handling and world has builder/active-grid constraints.
- Introduce `scenes/shared/` only when at least two call sites can depend on the same small contract without mode branches.

Acceptance criteria:

- Shared files are mode-neutral and do not import `LdtkWorldScene` or `ItemWorldScene`.
- World and Item World runtimes remain easy to read; no mega shared runtime with many optional callbacks.

## Work Slice R4: UI File Decomposition

Primary files:

- `game/src/ui/HUD.ts` about 1767 lines.
- `game/src/ui/InventoryUI.ts` about 1689 lines.
- `game/src/ui/PauseMenu.ts` about 1225 lines.

Existing subfolders:

- `game/src/ui/hud/` has `HudVitals.ts`, `HudExp.ts`, `hudLayout.ts`.
- `game/src/ui/inventory/` has `InventorySelection.ts`, `InventoryLayout.ts`, `InventoryItemInfo.ts`.
- Progress (2026-06-04): `game/src/ui/hud/HudConstants.ts` now owns HUD base dimensions, colors, and timing constants. `HUD.ts` imports these constants while keeping the public `HUD` API unchanged.
- Progress (2026-06-04): `game/src/ui/inventory/InventoryConstants.ts` now owns InventoryUI panel, grid, column, and color constants. `InventoryUI.ts` imports these constants while keeping the public `InventoryUI` API unchanged.
- Progress (2026-06-04): `game/src/ui/pause/PauseMenuConstants.ts` now owns PauseMenu panel geometry, menu rows, preset rows, audio rows, settings tabs, and settings row data. `PauseMenu.ts` keeps behavior and public API while importing these data contracts.
- Progress (2026-06-04): `game/src/ui/pause/PauseMenuAudio.ts` now owns AudioBus row volume helpers and SettingsData audio row mapping/mutation helpers, removing direct AudioBus access and audio switch blocks from `PauseMenu.ts`.
- Progress (2026-06-04): `game/src/ui/pause/PauseMenuSettings.ts` now owns SettingsData row mutation and settings value display helpers. `PauseMenu.ts` keeps modal navigation/rendering and persistence orchestration.
- Progress (2026-06-05): `game/src/ui/pause/PauseMenuConfirm.ts` now owns the quit-confirm modal panel construction. `PauseMenu.ts` keeps confirm selection state, pulse timing, and input flow.
- Progress (2026-06-05): `game/src/ui/pause/PauseMenuPresetSelector.ts` now owns keyboard preset selector panel construction. `PauseMenu.ts` keeps preset index, active preset application, pulse timing, and modal lifecycle.
- Progress (2026-06-05): `game/src/ui/pause/PauseMenuAudioPanel.ts` now owns audio settings panel construction. `PauseMenu.ts` keeps selected channel state, volume adjustment, persistence, and pulse timing.
- Progress (2026-06-05): `game/src/ui/hud/HudStatusIndicators.ts` now owns HUD burn status icon and Ego Shard indicator creation/drawing helpers. `HUD.ts` keeps public API (`setBurnStatus`, `setEgoShards`) plus update timing, while display-only indicator geometry lives in the hud subfolder.
- Progress (2026-06-05): `game/src/ui/hud/HudItemExpDisplay.ts` now owns Item World EXP HUD text/graphics creation and redraw geometry. `HUD.ts` keeps `showItemExp` / `updateItemExp` / `hideItemExp` state timing and scene-facing API stable.
- Progress (2026-06-05): `game/src/ui/hud/HudKeyPromptBars.ts` now owns default graphics-mode HUD key prompt construction for action keys, flask key label, item/map keys, and the Item World exit hint. `HUD.ts` keeps pulse/highlight state, layout wrapper registration, skin-mode key rendering, and public scene-facing APIs.
- Progress (2026-06-05): `game/src/ui/hud/HudBossHpDisplay.ts` now owns boss HP display construction and bar drawing details (container, name text/shadow, bezel, fill color, highlight, ratio clamp). `HUD.ts` keeps boss HP show/update/hide state and name text value lifecycle.
- Progress (2026-06-05): `game/src/ui/hud/HudDepthGaugeDisplay.ts` now owns Item World depth gauge default display construction plus drawing for both skin-mode ticks/fill and fallback graphics rail/labels. `HUD.ts` keeps depth gauge state, show/update/hide lifecycle, pulse timing, and skin sprite ownership.
- Progress (2026-06-05): `HudDepthGaugeDisplay` now also owns skin depth gauge frame/fill/tick-container construction (`createSkinHudDepthGaugeParts`) from atlas texture/bounds data. `HUD.ts` keeps `UISkin` lookup, field storage, parent attachment, and depth lifecycle.
- Progress (2026-06-05): `game/src/ui/hud/HudDamageVignetteDisplay.ts` now owns damage vignette edge drawing. `HUD.ts` keeps damage flash timing and only delegates the `Graphics` redraw.
- Progress (2026-06-05): `game/src/ui/hud/HudHpBarDisplay.ts` now owns graphics-mode HP bar drawing, including ghost HP, heal flash, low-HP pulse fill, and background/border. `HUD.ts` keeps HP/flash timers, text lifecycle, flask pulse state, and skin HP fill synchronization.
- Progress (2026-06-05): `HudHpBarDisplay` also owns default HP bar `Graphics` construction now. `HUD.ts` keeps the HP field/lifecycle, HP state, and skin fill synchronization.
- Progress (2026-06-05): `HudHpBarDisplay` now also owns skin HP fill mask polygon redraw (`updateSkinHudHpFill`). `HUD.ts` keeps skin sprite/mask ownership and HP state, but no longer owns the slash-front mask geometry.
- Progress (2026-06-05): `HudHpBarDisplay` now owns skin HP fill sprite/mask construction (`createSkinHudHpFillParts`) from atlas texture/bounds/center data. `HUD.ts` keeps `UISkin` lookup, field storage, and parent attachment.
- Progress (2026-06-05): `game/src/ui/hud/HudFlaskDisplay.ts` now owns fallback graphics-mode flask icon drawing. `HUD.ts` keeps flask counts, low-HP pulse timing, key prompt pulse, and skin flask sprite ownership.
- Progress (2026-06-05): `HudFlaskDisplay` and `HudDamageVignetteDisplay` also own their default `Graphics` construction now. `HUD.ts` keeps the fields/lifecycle while display helpers own creation plus redraw details.
- Progress (2026-06-05): `HudFlaskDisplay` now owns skin flask icon metrics (`createSkinHudFlaskIconMetrics`) from atlas fill/key bounds. `HUD.ts` keeps texture fields, icon layer ownership, count state, and redraw lifecycle.
- Progress (2026-06-05): `HudFlaskDisplay` now also owns skin flask icon rebuild/removal (`rebuildSkinHudFlaskIcons`). `HUD.ts` keeps current/max flask state, texture fields, and the active icon array reference.
- Progress (2026-06-05): `game/src/ui/hud/HudPulseGlowDisplay.ts` now owns shared HUD pulse glow drawing for flask low-HP prompt and first-item key highlight. `HUD.ts` keeps pulse timers, scale changes, activation gates, and skin/non-skin center selection.
- Progress (2026-06-05): `HudPulseGlowDisplay` also owns default pulse-glow `Graphics` construction. `HUD.ts` keeps pulse fields, timers, activation gates, and scale changes.
- Progress (2026-06-05): `game/src/ui/hud/HudDebugLabel.ts` now owns debug label shadow/text construction. `HUD.ts` keeps the URL debug gate and container ownership.
- Progress (2026-06-05): `game/src/ui/hud/HudTextDisplays.ts` now owns default graphics-mode HP, ATK, gold, and floor text/shadow construction plus HP/ATK skin-mode text wrapper container construction. `HUD.ts` keeps value updates, debug floor visibility toggles, layout wrapper registration, and skin-mode text repositioning.
- Progress (2026-06-05): `HudTextDisplays` now also owns skin-mode HP/ATK text repositioning helpers (`applyHudSkinHpTextLayout`, `applyHudSkinAtkTextLayout`). `HUD.ts` keeps `UISkin` bounds lookup, value update APIs, and layout wrapper registration.
- Progress (2026-06-05): `game/src/ui/hud/hudLayout.ts` now owns the shared layout override application helper (`applyHudElementLayout`). `HUD.applyLayout()` and exported `applyLayoutToContainer()` share the same pivot/offset/scale/visibility calculation.
- Progress (2026-06-05): `hudLayout.ts` now also owns layout wrapper creation/registration (`createOrGetHudLayoutWrapper`). `HUD.applySkin()` uses the helper for lazy skin wrappers and the action-keys wrapper, keeping wrapper construction rules centralized.
- Progress (2026-06-05): `game/src/ui/hud/HudFloorIndicatorDisplay.ts` now owns skin floor indicator fill sprite construction from atlas texture/bounds data. `HUD.ts` keeps `UISkin` lookup, fill field storage, max-height state, and parent attachment.
- Progress (2026-06-05): `game/src/ui/hud/HudKeyPromptBars.ts` now owns bound skin key glyph text creation plus skin action-key sprite/glyph/label composition (`addBoundHudKeyTextAtBounds`, `addHudSkinActionKey`). `HUD.ts` keeps `UISkin` lookup, skin sprite placement wrappers, and pulse center state.
- Progress (2026-06-05): `game/src/ui/hud/HudPortraitDisplay.ts` now owns async portrait texture loading and portrait sprite scale/anchor/placement. `HUD.ts` keeps portrait frame lookup, wrapper ownership, and `portraitSprite` field storage.
- Progress (2026-06-05): `game/src/ui/hud/HudSkinSliceDisplay.ts` now owns generic skin slice `Sprite` construction from texture/bounds data. `HUD.ts` keeps `UISkin` lookup, wrapper ownership, and parent attachment.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryAbyssNoise.ts` now owns deterministic abyss-noise card rendering for the anvil stratum minimap. `InventoryUI.ts` keeps minimap/stratum policy and only delegates the pixel-noise drawing helper.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryHintRow.ts` now owns Inventory/Anvil key hint row construction. `InventoryUI.ts` keeps hint policy/which actions to show, while icon/text row assembly is delegated.
- Progress (2026-06-05): `game/src/ui/inventory/InventorySelectionPulse.ts` now owns inventory grid selection pulse and anvil slot pulse alpha/geometry redraw. `InventoryUI.ts` keeps timers, overlays, and rect ownership.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryPanelChrome.ts` now owns inventory panel background and column divider drawing. `InventoryUI.ts` keeps panel `Graphics` lifecycle and child ordering.
- Caveat (2026-06-05): avoid broad regex deletion in `InventoryUI.ts`; the anvil/stratum region contains adjacent large private methods and encoded legacy comments. Prefer line-bound method-bound removal or leave dead helper code until a narrow patch is safe.
- Progress (2026-06-05): `InventoryUI.ts` title node lifetime no longer uses `(panel as any).__title`; title nodes are owned by a typed `titleNodes` field on `InventoryUI`.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryFilterTabs.ts` now owns inventory filter tab cleanup, background drawing, and label placement. `InventoryUI.ts` keeps current filter state and tab policy.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryGridChrome.ts` now owns empty grid slot chrome and grid scroll indicator drawing. `InventoryUI.ts` keeps item filtering, selection pulse ownership, and per-item cell policy.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryGridCell.ts` now owns inventory grid cell background, item icon, equipped/clear badges, and anvil-lock rendering. `InventoryUI.ts` keeps the policy state calculation for selected/equipped/on-anvil/locked/cleared cells.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryItemDetailDisplay.ts` now owns item detail recovery bar, dividers, and memory fragment line rendering. `InventoryUI.ts` keeps selected item flow, display-name/meta text, and action hint policy.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryAnvilMetaDisplay.ts` now owns the repeated anvil item meta text block for preview and placed states. `InventoryUI.ts` keeps anvil slot state, pulse ownership, prompt ownership, and radial-map embedding.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryRelicStatusDisplay.ts` now owns player relic header and relic icon/label row rendering. `InventoryUI.ts` keeps player stat values, selected-item attack delta calculation, and status column mode switching.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryPlayerStatSummaryDisplay.ts` now owns player status header, HP row, ATK row, ATK delta text, and divider rendering. `InventoryUI.ts` keeps equipped/selected stat value calculation and passes a small summary object.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryLdtkTemplatePicker.ts` now owns LDtk template matching for inventory stratum minimap previews. `InventoryUI.ts` calls the helper and no longer carries the unused legacy `renderStartRoomTiles` private method.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryAnvilRadialStatsDisplay.ts` now owns the left stats panel background and label/value row rendering inside the compact anvil radial map. `InventoryUI.ts` keeps stat line value calculation and right-side radial graph drawing.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryStratumRoomRender.ts` now owns inventory stratum room exit extraction, LDtk/fallback room grid selection, and clipped room pixel stamping. `InventoryUI.ts` keeps unified-grid traversal, viewport placement, and stratum card policy.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryStratumCardDisplay.ts` now owns stratum minimap card background, outline, abyss-noise layer creation, and label placement. `InventoryUI.ts` keeps visible-card policy, pixel-map embedding, and noise layer lifetime storage.
- Progress (2026-06-05): `InventoryStratumCardDisplay.ts` also owns abyss-noise layer redraw for stratum minimap cards. `InventoryUI.ts` keeps only the redraw timer/tick state and delegates the graphics refresh.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryStratumDataBuilder.ts` now owns deterministic unified-grid generation/cache fill for inventory stratum previews. `InventoryUI.ts` keeps the cache map and delegates construction; the unused legacy `buildStratumGraph` path was removed.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryTitleDisplay.ts` now owns inventory/anvil title node cleanup and column header text creation. `InventoryUI.ts` keeps mode state and title node field ownership.
- Progress (2026-06-05): `InventoryItemDetailDisplay.ts` now also owns empty item info text, item identity header, recovery metadata text, and re-dive counter rendering. `InventoryUI.ts` keeps selected item flow and action hint policy for the detail column.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryAnvilSlotDisplay.ts` now owns anvil slot background drawing, empty-slot pulse overlay creation, and placed item icon rendering. `InventoryUI.ts` keeps anvil state, pulse field ownership, prompt ownership, and radial-map embedding.
- Progress (2026-06-05): `InventoryGridChrome.ts` now also owns visible-grid selection pulse overlay creation and placement. `InventoryUI.ts` keeps selected-index state and redraw timer ownership.
- Progress (2026-06-05): `InventoryAnvilRadialStatsDisplay.ts` now also owns compact anvil radial dive-path and per-row label/path/node rendering. `InventoryUI.ts` keeps radial graph geometry, side-count calculation, and stat line data.
- Progress (2026-06-05): `InventoryStratumCardDisplay.ts` now also owns the empty stratum placeholder text. `InventoryUI.ts` no longer needs direct `createUiText` or locked-color imports for the stratum column.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryShellDisplay.ts` now owns `InventoryUI` root overlay, panel, and column container construction/placement. `InventoryUI.ts` keeps field ownership and public lifecycle.
- Progress (2026-06-05): `InventoryShellDisplay.ts` also owns common inventory container child cleanup. `InventoryUI.ts` delegates grid/info/status container clearing while keeping selection/anvil pulse state resets.
- Progress (2026-06-05): `InventoryUI.ts` now calls `buildInventoryStratumUnified(...)` directly and no longer carries a private `buildStratumUnified` wrapper. The unified-grid cache remains owned by `InventoryUI`.
- Progress (2026-06-05): `InventoryAnvilRadialStatsDisplay.ts` now owns compact anvil radial stat-line data construction (`YOUR ATK`, `MAX ATK`, `MEM SHARD`, `DIVES`) in addition to rendering. `InventoryUI.ts` only supplies the current player attack value.
- Progress (2026-06-05): `InventoryUI.ts` no longer carries pass-through `drawPanelBg` or `drawFilterTabs` private wrappers; `refresh()` calls the extracted helpers directly.
- Progress (2026-06-05): `InventoryAnvilSlotDisplay.ts` now also owns Dive prompt pulse alpha calculation. `InventoryUI.ts` keeps the anvil timer and prompt container references.
- Progress (2026-06-05): `game/src/ui/inventory/InventoryAnvilPlacementPolicy.ts` now owns the anvil placement guard that prevents placing the currently equipped first-dive weapon unless a fallback item can be equipped. `InventoryUI.ts` delegates the policy before `placeOnAnvil`.
- Progress (2026-06-05): `InventorySelection.ts` now owns first-selection index calculation for empty/non-empty filtered grids. `InventoryUI.ts` uses it when opening and cycling filters.
- Progress (2026-06-05): `InventorySelection.ts` now also owns filtered item list construction via `filterInventoryItems(...)`. `InventoryUI.ts` exposes a private `filteredItems` getter and no longer imports `itemMatchesFilter` directly.
- Progress (2026-06-05): `InventoryStratumRoomRender.ts` now also owns stratum minimap viewport, hub-screen position, room placement, and viewport clipping helpers. `InventoryUI.ts` keeps unified-grid traversal and delegates placement math.
- Progress (2026-06-05): `InventoryStratumRoomRender.ts` now owns deterministic room RNG creation for stratum minimap rendering. `InventoryUI.ts` no longer imports `PRNG` directly.
- Progress (2026-06-05): `InventoryStratumCardDisplay.ts` now owns stratum count, next-level, and visible card slot calculation for the 2.5-card stratum minimap viewport. `InventoryUI.ts` keeps selected item lookup and pixel-map embedding.

Execution plan:

- Split HUD first because a subfolder already exists. Move display-only rendering pieces before stateful game interaction.
- Keep `HUD` public API stable for scenes during the first pass.
- Split InventoryUI after scene and HUD risk is reduced. Preserve localization lookups and `ItemDetailView` boundaries.
- Do not add player-facing strings outside `Sheets/Content_Localization.csv`.

Acceptance criteria:

- Scenes still import `HUD` and `InventoryUI` from the same public paths after initial decomposition.
- UI extraction does not change key prompts, gamepad glyphs, or localization keys.

## Work Slice R5: Escape Hatches And Runtime Metadata

Surveyed patterns:

- `as any` remains in UI metadata and Pixi filter uniforms; world gameplay/runtime private metadata (`enemy`, `secret/cracked/growing wall`, void return FSM) is now typed through shared metadata helpers and runtime-driven timers.
- `setTimeout()` appears in Item World boss/entry/exit flow, dialogue runtimes, feedback focus, audio timers, and entity attack windows.
- Direct `roomData` assignment is still common at spawn/restore boundaries.

Execution plan:

- Replace enemy `(enemy as any)._isBoss` / `_bossKey` / `_unlockTargetIids` with typed metadata helpers before changing combat/spawn behavior.
- Keep Pixi filter `as any` cleanup separate from gameplay refactors; it is lower risk but noisy.

Progress (2026-06-04): Enemy runtime metadata access for boss/portal state is partially normalized.
- Added `game/src/entities/EnemyMetadata.ts` with shared typed helpers (`isBossEnemy`, `markBossEnemy`, `setBossKey`, `setUnlockTargetIids`, `wasPortalSpawned`, `markPortalSpawned`).
- Replaced `as any` metadata access for:
  - `WorldEnemySpawnRuntime`
  - `WorldEnemyKillRuntime`
  - `World/ItemWorld container collision runtimes`
  - `ItemWorldEnemyEncounterRuntime`, `ItemWorldEnemyCombatRuntime`, `ItemWorldScene` boss clear portal path.
- Added boss-HP UI marker helpers in `EnemyMetadata` (`markBossBarShown`, `wasBossBarShown`) and switched `BossHpRuntime` to consume them (removed direct boss marker mutation from scene/UI runtime type extension).
- Convert gameplay `setTimeout()` chains to dt-driven runtimes when they affect scene lifecycle. Leave UI focus and audio timers alone unless touched.
- Centralize `roomData` assignment at spawn/restore boundaries, but respect that entities currently expect raw `number[][]`.
- Progress (2026-06-05): `game/src/systems/EntityRuntimeMeta.ts` was tightened and minimized to only re-export `EnemyMetadata` helpers while metadata ownership moved into `game/src/entities/EnemyMetadata.ts`.
- Progress (2026-06-05): `Enemy room key` metadata moved to `game/src/entities/EnemyMetadata.ts` (`setEnemyRoomKey`, `getEnemyRoomKey`), and `ItemWorldEnemySpawnRuntime` + `ItemWorldEnemyCombatRuntime` now consume it through shared helpers; room-key helpers were removed from direct runtime metadata use.
- Progress (2026-06-05): `EnemyMetadata` now owns enemy lifecycle one-shot state (`_killHandled`, `_expGranted`) for reuse across world/itemworld paths; `LdtkWorldScene` + `ItemWorldEnemyCombatRuntime` import from it.
- Progress (2026-06-06): `game/src/systems/EntityRuntimeMeta.ts` was removed after all callsites migrated to direct `EnemyMetadata` imports.
- Progress (2026-06-04): `Guardian` and `Boss01` slam-land hit windows now use FSM `update(dt)` timers instead of `setTimeout()`, keeping boss attack-active state inside entity lifecycle/freeze/update ownership.
- Progress (2026-06-06): `WorldEnemySpawnRuntime`와 `ItemWorldEnemySpawnRuntime`를 `@scenes/shared/EnemySpawnHelpers`의 공통 초기화 루틴(`initializeEnemySpawnedEntity`)으로 정렬해, 적 생성 시 `x/y/roomData/target` 설정 계약을 일원화.
- Progress (2026-06-06): `WorldScene`의 절차형 방 스폰(`spawnEnemies`)도 같은 `initializeEnemySpawnedEntity`를 통해 일관화되어, `WorldScene`/`WorldEnemySpawnRuntime`/`ItemWorldEnemySpawnRuntime`의 초기화 계약이 동일해짐.
- Progress (2026-06-07): 성장형 벽 소환 경로(`WorldGrowingWallRuntime`/`ItemWorldStaticEntityRuntime`)의 슬라임 등록도 `initializeEnemySpawnedEntity`로 수렴해, growth wall slime 초기화 계약을 world/itemworld 공통 경로로 통일.
- Progress (2026-06-05): `InventoryUI.ts` panel title metadata no longer uses `as any`; title lifetime is typed through an `InventoryUI` private field. Remaining UI `as any` cleanup should focus on other UI files and Pixi filter/uniform contracts.
- Progress (2026-06-04): Gold pickup burst collision-grid binding is now centralized in `game/src/scenes/shared/GoldPickupSpawnHelpers.ts`. Enemy combat drops, world breakable drops, world breakable prop drops, and Item World breakable prop drops now use `spawnGoldPickupBurst(...)` instead of directly assigning `pickup.roomData`.
- Progress (2026-06-04): Player collision-grid binding and spawn/teleport placement started moving into `game/src/scenes/shared/PlayerPlacementHelpers.ts`. `WorldPlayerSpawnRuntime`, `WorldVoidReturnRuntime`, `WorldItemDeploymentTunnelFlowRuntime`, `WorldScene`, `AnvilReturnState`, `WorldSpikeRuntime`, `WorldDebugWarpRuntime`, `ItemWorldScene`, `ItemWorldEntryCorridorRuntime`, `ItemWorldStaticEntityRuntime`, and `LdtkWorldScene` now use helper-based placement/binding instead of repeated direct `x`/`y`/`vx`/`vy`/`roomData`/`savePrevPosition` sequences where behavior is equivalent.
- Progress (2026-06-04): `PlayerPlacementHelpers.stopPlayerMotion()` now owns repeated blocking-sequence velocity reset + `savePrevPosition()` calls. `WorldEndingRuntime`, `ItemWorldScene` entry/prologue blocking, and `LdtkWorldScene` deployment/debug-warp settle paths use the shared helper where position is intentionally unchanged.
- Progress (2026-06-04): `PlayerPlacementHelpers.respawnPlayerAt()` now owns the legacy world game-over reset sequence where position is set before `Player.respawn()` and `savePrevPosition()` runs afterward.
- Progress (2026-06-04): `PlayerPlacementHelpers.syncPreviousPositions()` now owns transition-boundary render interpolation sync for player/enemy groups. `LdtkWorldScene` room load and edge-transition completion paths use it instead of duplicating player/enemy `savePrevPosition()` loops.

Acceptance criteria:

- No behavior change from metadata cleanup.
- No timeout conversion without an owner runtime and cleanup path.
- World-level timeout migration progress:
  - `WorldEnemyKillRuntime` schedules boss portal spawn through `update()` with scene lifecycle cancellation via `clear()`.
  - `WorldEgoDialogueRuntime` now schedules return/retirement dialogues via update-driven delayed actions, then calls `clear()` on scene handoff.

## Progress Delta (2026-06-07+)

- `world`/`itemworld` 적 보상 로직에서 골드·회복 드롭 중복을 공통 헬퍼로 추출해 [WorldEnemyKillRuntime](/C:/Users/Victor/Documents/Works/ProjectAbyss/game/src/scenes/world/WorldEnemyKillRuntime.ts), [ItemWorldEnemyCombatRuntime](/C:/Users/Victor/Documents/Works/ProjectAbyss/game/src/scenes/itemworld/ItemWorldEnemyCombatRuntime.ts)에서 공유하도록 정리.
- `EnemyMetadata`에서 월드/아이템월드 적 1회 처리 플래그를 의미적으로 통일(`_postDefeatHandled`, `isEnemyPostDefeatHandled`/`markEnemyPostDefeatHandled`)하고, 플래그 호출부는 해당 API로 정렬.
- 2026-06-04: `LdtkWorldScene`의 공격 판정 후킬 체크를 `WorldEnemyKillRuntime.processDefeatedEnemies()`로 수렴해, `_postDefeatHandled` 판정을 runtime 소유로 이관.
- 2026-06-04: `LdtkWorldScene`에서 죽음 처리의 직접 `handle(enemy)` 호출을 제거하고, `processDefeatedEnemies()`를 프레임 단일 경로로 정리해 도트/공격/기타 사망 경로의 중복 처리 가능성을 차단. 동시에 `WorldEnemyKillRuntime`에서 `shouldRemove` 보정 조건을 제거해 `_postDefeatHandled` 가드만 사용.
- 2026-06-07: `WorldEnemyKillRuntime.processDefeatedEnemies`가 `shouldRemove` 적의 컨테이너 제거까지 런타임 소유로 흡수해, 씬 루프에서 별도 제거 분기를 삭제.
- 2026-06-04: Item World 반환 완료 경로에서 종료 콜백 중복 처리 허점(`completeExit` 선행 null 호출 후 callback 미호출) 제거를 위해 `ItemWorldReturnFlowRuntime`가 callback 인자를 늦게 받아도 1회 보장되도록 보강. 탈출/프로로그 종료 진입점도 `prepareReturnResult()`를 선행해 반환 정리 책임을 통일.
- 2026-06-07: `WorldItemWorldSceneFlowRuntime.completeReturn()`에 동일 scene 객체 재진입 가드를 추가해 `completeReturn` 중복 호출을 무효화. 동일 ItemWorldScene 인스턴스에서 2회 이상 반환 정리(복귀+페이드+보상 경로)가 중복 실행되지 않음.

- 2026-06-04: `World*ItemWorldFlowRuntime`의 리턴 완료 경로(onComplete)에서 `completeReturn`/보상/리턴 후 처리(대화/리타이어)를 공통 헬퍼(`ItemWorldSceneCompletionHelpers.applyItemWorldSceneCompletionLifecycle`)로 통합.
- 2026-06-04: `WorldScenePortalItemWorldFlowRuntime`도 같은 완료 헬퍼 체인에 `hadFirstBossClear` 주입 계약을 추가해 포털-프로시저 모드 Item World 반환에서도 동일한 종료 계약 경로를 보장.
- 2026-06-07: `WorldAnvilItemWorldFlowRuntime`/`WorldFixedItemWorldFlowRuntime`/`WorldPortalItemWorldFlowRuntime`의 `onComplete` 래핑을 1회성으로 강화해 반환 결과 패널/보상/보너스 토스트가 중복 실행되지 않도록 보강.
- 2026-06-07: `WorldScenePortalItemWorldFlowRuntime`의 `onComplete` completion 경로도 동일하게 1회성으로 묶어 pop/atk 동기화 및 saveProgress 중복을 차단.
- 2026-06-08: `ItemWorldSceneCompletionHelpers`에 `createOneShotHandler`를 추가하고, 해당 4개 Item World 런타임(`WorldAnvilItemWorldFlowRuntime`/`WorldFixedItemWorldFlowRuntime`/`WorldPortalItemWorldFlowRuntime`/`WorldScenePortalItemWorldFlowRuntime`)을 동일한 1회성 결합 경로로 통합.
- 2026-06-08: `ItemWorldReturnFlowRuntime.completeExit()`에도 반환 사전정리(`prepareReturnResult`) 1회 경로를 적용.
  - `startPreparedExitFade()`를 거치지 않은 직접 종료(`completeExit`) 진입점에서도 HUD/프롬프트 정리, 흡수 디졸브 정리, 트랩도어 해제 전처리가 수행되도록 정합.
- 2026-06-08: `ItemWorldReturnFlowRuntime` 종료 사유 기반 유틸(`startPreparedExitFadeForReason`, `completeExitWithReason`) 추가.
  - `ItemWorldScene`의 탈출/클리어 진입은 사유를 런타임으로 통합해 직접 `progressController.request*Exit()` 호출을 축소.
- 2026-06-08 (추가): `ItemWorldScene`의 흡수 이펙트 완료 콜백 및 페이드 종료 분기에서 `startPreparedExitFadeForReason`/`completeExitWithReason`로 이동해 반환 사유 없는 구간을 정리.
- 2026-06-08 (추가): `ItemWorldReturnFlowRuntime` 의존성을 `requestEscapeExit`, `requestClearExit`, `requestDeathExit`에서 단일 `requestExitWithReason`으로 축소해 종료 사유 위임 경로를 단일화.
- 2026-06-07: `ItemWorldReturnFadeRuntime.start()`에 `remainingMs > 0` 가드 추가하여 반환 페이드 진행 중 재호출을 차단, 즉 `normalizeWorldVisuals` 중복 실행 억제.
- 2026-06-04: `WorldPortalItemWorldFlowRuntime`도 `sacredSave` 직접 조회를 제거하고 `isFirstItemWorldBossDefeated` 의존성 주입으로 계약 정합화하여 나머지 Item World 반환 루트와 동일 패턴으로 통일.
- 2026-06-04: `WorldEgoDialogueRuntime`와 `InventoryTutorialHintRuntime`도 동일하게 `sacredSave` 직접 조회를 제거하고 `isFirstItemWorldBossDefeated` 의존성 주입으로 정렬.
- 2026-06-04: `WorldEdgeTransitionFlowRuntime`, `WorldPlayerSpawnRuntime`, `WorldPrologueEndRuntime`, `WorldSacredPickupRuntime`, `WorldSpawnState`도 `PlayerSave` 직접 import를 제거하고 `LdtkWorldScene` 바인딩을 통해 scene/state 콜백을 받도록 정렬.
- 2026-06-04: 위 5개 런타임의 실행 계약을 위키 페이지로 정리해 잔여 리뷰 포인트를 축소 (`WorldEgoDialogueRuntime`, `WorldPrologueEndRuntime` 문서 신규 추가 포함).
- 2026-06-04: `LowHpHealHintRuntime`도 `sacredSave` 직접 호출에서 분리되어 `saveAccess` 주입형 계약으로 정렬됨. `WorldScene`/`LdtkWorldScene`/`ItemWorldScene`에서 동일 게이트 계약을 전달해 저위험 저장 토스트 경로의 저장 상태 정합성을 유지.
- 2026-06-04: `InventoryUI`, `LorePopup`, `LowHpHealHintRuntime`, `ItemWorldScene` 생성자에서 `sacredSave` 기본값/폴백 접근을 정리하고 호출부 주입으로 전환.  
  - `LorePopup`은 `LdtkWorldSceneSaveAccess`의 `shouldAlwaysShowLore` 주입으로 이동.
  - `InventoryUI`는 `isFirstDiveDone` 주입을 완료해 더 이상 직접 `sacredSave`를 참조하지 않음.
  - `ItemWorldScene`의 low-hp 게이트 접근도 기본값 의존을 제거하고 장면 생성자에서 `sceneSaveAccess`를 필수 주입.
- 2026-06-04: `WorldScene`/`LdtkWorldScene` 생성자도 더 이상 `sacredSave` 기본값 계약을 가지지 않도록 정렬해, `main.ts`/`TitleScene.ts`에서 bootstrap 시점에 saveAccess를 주입받는 방식으로 수렴. (scene 내부 의존성 고정점 축소)
- 2026-06-04: `sacredSave` 주입 객체를 `@scenes/shared/SceneSaveAccess.ts`로 통합해 `main.ts`/`TitleScene.ts`의 중복 저장 접근 바인딩을 제거. `WorldScene`/`LdtkWorldScene`은 타입/생성자 주입 의존성으로 정렬.
- 2026-06-04: `LorePopup` 생성자 시그니처를 주입 계약(`LorePopupSaveAccess`) 우선 순위로 정렬하고 호출부에 반영. `SceneSaveAccess` 기반 빌드 경로에서 `sacredSave` API 직접 호출의 누락(테스트/빌드 에러)을 제거.
- 2026-06-04: 검증 완료: `npx tsc --noEmit` (성공), `npm run build` (성공, `CSV integrity check passed` 경고 1개는 atlas 태그 미리 선언 의도 확인 필요).

## Verification Matrix

- Type-only, local runtime extraction: run `npx tsc --noEmit` from `game/`.
- Scene lifecycle, collision, Item World entry/return, or CSV/data changes: run `npm run build` from `game/`.
- Item World entry, boss clear, trapdoor descent, frozen return, or collision restore changes: run a browser smoke at `/play/?debug=1` and inspect console for hard errors.
- UI decomposition: run `npm run build`; use UI catalog/dev smoke when changing shared components.
- CSV/localization edits: ensure `Sheets/tools/csv_to_locale.mjs` and `Sheets/tools/validate.mjs` are covered through `npm run build`.

## Suggested Model/Effort

- Planning and boundary decisions: Codex `xhigh`.
- Normal implementation slices: Codex `high`.
- Mechanical follow-up cleanup: Codex `medium`.

## First Task For The Next Model

Current high-priority slice is R3 shared-contract hardening immediately after the container shared-helper extraction.

Start here:

- Do a TypeScript-level cleanup pass on the recently touched container files before deeper behavior work:
  - `game/src/scenes/world/WorldContainerPhysicsRuntime.ts`
  - `game/src/scenes/itemworld/ItemWorldContainerPhysicsRuntime.ts`
  - `game/src/scenes/world/WorldContainerSpawnRuntime.ts`
  - `game/src/scenes/world/WorldMaintainedContainerSpawnerRuntime.ts`
  - `game/src/scenes/itemworld/ItemWorldRuntimeCellSpawner.ts`
  - `game/src/scenes/itemworld/ItemWorldContainerRegistry.ts`
  - `game/src/scenes/shared/Container*Helpers.ts`
- Check only for obvious compile-surface issues first: unused imports, stale private helpers, missing type-only imports, duplicate helper responsibilities, and callsite signature drift.
- Keep the helper split small. `ContainerBodyUpdateHelpers`, `ContainerImpactHelpers`, `ContainerPlayerCollisionHelpers`, `ContainerEnemyCollisionHelpers`, `ContainerContainerCollisionHelpers`, `ContainerSpawnSettleHelpers`, and `ContainerKindHelpers` should remain mode-neutral and must not import scene classes.
- Do not merge `WorldContainerPhysicsRuntime` and `ItemWorldContainerPhysicsRuntime` into one mega runtime. They should stay as orchestration owners with shared leaf helpers because update ordering and mode side effects still differ.
- After the container compile-surface pass, continue R3 by looking for the next converged pair with low behavior risk: projectile shell, pickup/breakable drop path, or enemy spawn metadata. Extract only if both world and Item World callsites already have equivalent behavior.
- Then return to R1/R2 ownership boundaries: fade path, return callback sequencing, frozen-return edge cases, builder/door/terrain return-adjacent responsibilities.

Why this now: container behavior has been moved into shared leaf helpers across world and Item World, so the next model should first harden that seam before starting another large extraction.
- 2026-06-04: WorldAnvilItemWorldFlowRuntime.enterFromTunnel() now reads the entryCorridor option, enabling edge-triggered tunnel/right-edge Item World entries to preserve corridor sequencing when requested.
- 2026-06-08 (추가): ItemWorldReturnFlowRuntime 내부 startPreparedExitFade/completeExit 메서드를 private로 전환해 반환 진입점은 reason-aware API 위주로 통일.
- 2026-06-04: `ItemWorldProgressController.onExitFromStratumClear` now passes an explicit `ItemWorldExitReason`, and `ItemWorldScene` forwards that reason to `ItemWorldReturnFlowRuntime.startPreparedExitFadeForReason(reason)`. `ItemWorldSceneSaveAccess` plus legacy/LDtk Item World save-access adapters now live in `scenes/shared/SceneSaveAccess`, keeping save-access injection contracts out of scene-local types and removing repeated object literals from `WorldScene`/`LdtkWorldScene`.

## Current Handoff Survey (2026-06-05)

This survey is for the next model continuing refactor work. It reflects a broad read of `game/src` size/risk hotspots and the current `RefactorRoadmap` progress notes. Do not treat this as a request to rewrite; continue small, reversible extraction slices.

### Current size map

- `game/src/scenes`: 280 TS/TSX files, about 34,089 lines.
- `game/src/entities`: 42 files, about 14,473 lines.
- `game/src/effects`: 64 files, about 13,595 lines.
- `game/src/ui`: 51 files, about 13,021 lines.
- `game/src/level`: 22 files, about 9,269 lines.
- `game/src/systems`: 13 files, about 4,301 lines.
- Scene runtime split: `game/src/scenes/world` has 153 files / about 14,266 lines; `game/src/scenes/itemworld` has 85 files / about 8,571 lines; `game/src/scenes/shared` has 36 files / about 1,942 lines.

### Largest files still worth shrinking

- `game/src/scenes/LdtkWorldScene.ts`: about 3,758 lines. Keep as composition/lifecycle owner, but continue deleting scene-local orchestration only when a runtime already owns the behavior.
- `game/src/level/ProceduralDecorator.ts`: about 3,073 lines. High line count, but likely data/algorithm dense; defer until scene/runtime seams are safer.
- `game/src/scenes/ItemWorldScene.ts`: about 3,054 lines. Continue flow/runtime ownership cleanup, especially return/exit/trapdoor seams.
- `game/src/entities/Player.ts`: about 2,476 lines. Do not split opportunistically; only extract stateless movement/combat helpers with strong tests or type checks.
- `game/src/ui/InventoryUI.ts`: about 1,683 lines. Continue careful line-bound decomposition; avoid broad regex removal in this file.
- `game/src/ui/HUD.ts`: about 1,644 lines. Good low-risk UI decomposition target because `ui/hud/` helpers already exist.
- `game/src/effects/FluidSystem.ts`: about 1,525 lines. Defer unless touching fluid behavior; `DEC-041` and CSV SSoT are guardrails.
- `game/src/scenes/WorldScene.ts`: about 1,360 lines. Legacy/procedural scene; use shared helpers only where behavior is already converged.
- `game/src/ui/PauseMenu.ts`: about 805 lines. Continue panel-construction extraction after the settings-panel helper lands.

### Remaining risk signals

- `as any`: about 5 matches. Remaining cases are likely UI/Pixi metadata or low-level integration points; clean only with local typing, not broad casts removal.
- `setTimeout(`: about 7 matches. Most are data load timeout, UI focus, or audio timers. Do not migrate unless the timer owns gameplay lifecycle state.
- `sacredSave`: about 24 matches. Many should remain in `PlayerSave`, `SaveManager`, bootstrap, and `SceneSaveAccess`; avoid reintroducing direct scene/UI dependencies.
- `roomData =`: about 8 matches. Most are now centralized in shared placement/spawn helpers; remaining scene assignments should be treated as collision-grid ownership seams, not mechanical cleanup.
- `TODO` / `FIXME`: none found in `game/src`.

## Next Refactor Plan For Another Model

### Phase A: finish the current UI extraction seam

- Complete `PauseMenuSettingsPanel` adoption in `game/src/ui/PauseMenu.ts`.
- Keep `PauseMenu.ts` responsible for modal state, navigation indices, settings mutation, persistence, and pulse timing.
- Keep `game/src/ui/pause/PauseMenuSettingsPanel.ts` responsible only for settings panel construction and display geometry.
- After the helper call is wired, remove only provably unused imports from `PauseMenu.ts`.
- Update this roadmap with one concise progress bullet.
- Progress (2026-06-05): `game/src/ui/pause/PauseMenuSettingsPanel.ts` adoption is complete. `PauseMenu.ts` now delegates settings panel construction/display geometry to the helper and retains settings modal state, tab/row navigation, value mutation, persistence, and pulse timing.
- Progress (2026-06-11): `PauseMenu.ts` now removes stale imports introduced by extraction (`PANEL_X`, `PANEL_Y`, `ROW_SELECTED_EDGE`) after the settings panel wiring, and keeps only modal-state/state-transition responsibilities in `PauseMenu.ts`.

### Phase B: low-risk UI decomposition

- Continue `HUD.ts` decomposition first. Candidate owners: minimap/status display, item EXP display, boss HP display, and prompt layout.
- Preserve public imports: scenes should still import `HUD` from `game/src/ui/HUD.ts`.
- Continue `InventoryUI.ts` only with method-bound extraction. Do not use broad regex deletion; previous corruption came from adjacent large private methods and encoded comments.
- Preserve localization keys and existing components: `KeyPrompt`, `ModalPanel`, `UISkin`, `create9SlicePanel`, and existing CSV keys.

### Phase C: runtime seam hardening

- Recheck recently shared helpers under `game/src/scenes/shared/` for leaf-helper purity. Shared helpers must not import concrete scene classes.
- Do not merge `World*Runtime` and `ItemWorld*Runtime` pairs into one runtime just because names match.
- Remaining parallel runtime pairs worth reviewing are `BreakableProp`, `ContainerCarry`, `ContainerFluid`, `ContainerPhysics`, `EgoDialogue`, `EgoShardCast`, `EgoShardCombat`, `EgoShardImpact`, `EgoShardProjectile`, `EnemySpawn`, `MovementVfx`, `Pickup`, `PlayerSpawn`, `ProceduralDecor`, `Projectile`, `PrologueEnd`, `TileHazard`, and `Weather`.
- Safe extraction rule: extract only stateless leaf helpers when both world and Item World callsites already do the same thing.
- Unsafe extraction rule: do not extract update-loop ordering, collision ownership, reward order, scene pop/push, or persistence side effects into shared helpers unless the behavior has already been unified.

### Phase D: scene ownership cleanup

- In `LdtkWorldScene.ts`, continue shrinking around already-created runtime seams. Good review targets are peripheral helper wrappers, stale imports, and runtime construction contracts.
- In `ItemWorldScene.ts`, continue return/exit/trapdoor flow cleanup only through `ItemWorldReturnFlowRuntime`, `ItemWorldTrapdoorFlowRuntime`, `ItemWorldTrapdoorSpawnRuntime`, and `ItemWorldFlowState`.
- Keep `DEC-039` intact: boss clear does not automatically descend; manual trapdoor activation remains required.
- Keep `DEC-042` intact: never replace the live world collision grid object during gameplay.
- 2026-06-14 (progress): `LdtkWorldScene`의 아이템월드 진입 전 준비(공유 UI 분리 + 월드 비주얼 해제)를 `WorldItemWorldSceneTransitionRuntime`로 추출해, `WorldItemWorldSceneFlowRuntime`가 씬 내부 메서드가 아닌 런타임 경로로 `preparePush`/복귀 페이드 시작을 위임하도록 정리했다.

- 2026-06-16: `LdtkWorldScene.ts`에서 `hideSceneForItemWorldTransition`/`setCameraZoomForItemWorldTransition` 패스스루 메서드를 제거하고 전이 런타임 콜백을 inline 위임으로 정리해 scene-local pass-through 경로를 추가 축소.

### Suggested next prompt

Use this prompt for the next model:

```text
Continue ProjectAbyss refactoring from memory/wiki/features/RefactorRoadmap.md.
Complete Inventory-focused method-bound cleanup: remove remaining UI-owned policy branches (특히 open/close/update/pulse/confirm/cancel 흐름의 잔여 결합) while preserving current runtime ownership and localization boundaries.
Do not run tests/build unless explicitly asked. Do not use git. Preserve localization and UI component boundaries.
```

- 2026-06-05: Inventory UI divider lifecycle extracted to game/src/ui/inventory/InventoryColumnDividerDisplay.ts; InventoryUI.refresh() now calls title/divider helpers directly instead of private pass-through wrappers.

- 2026-06-05: Inventory panel frame redraw/destroy and fallback background drawing moved to game/src/ui/inventory/InventoryPanelFrameDisplay.ts, keeping InventoryUI.refresh() focused on orchestration.

- 2026-06-05: Inventory selection/filter policy now exposes cycleInventoryFilterSelection() and selectedInventoryItem() from InventorySelection.ts; anvil selecting/placed transitions moved to InventoryAnvilStatePolicy.ts.

- 2026-06-05: Inventory item/anvil action hint row construction moved to game/src/ui/inventory/InventoryActionHintDisplay.ts, removing direct GameAction, 	(), and hint-row composition from InventoryUI.ts.

- 2026-06-05: Inventory frame update responsibilities extracted to InventoryPulseUpdatePolicy.ts; radial graph layout and rarity side-count calculation moved into InventoryAnvilRadialStatsDisplay.ts. Also repaired malformed fallback strings in radial stat values.

- 2026-06-05: Inventory player status column composition moved to game/src/ui/inventory/InventoryPlayerStatusDisplay.ts, keeping InventoryUI.drawPlayerStatus() as a thin data handoff.

- 2026-06-05: Inventory anvil slot panel composition moved to InventoryAnvilSlotPanelDisplay.ts, full radial-map composition moved behind drawInventoryAnvilRadialMap(), and item-info panel composition moved to InventoryItemInfoPanelDisplay.ts.

- 2026-06-05: Inventory grid rendering, badge state calculation, empty slots, scroll indicator, and selection pulse creation moved to game/src/ui/inventory/InventoryGridDisplay.ts; InventoryUI.drawGrid() now only stores returned pulse refs.

- 2026-06-05: Inventory stratum pixel-map iteration/template selection moved into drawInventoryStratumPixelMap() in InventoryStratumRoomRender.ts; stratum card stack/noise/label composition moved to InventoryStratumMinimapDisplay.ts.

- 2026-06-05: Inventory item-info and player-status panel width constants moved into their display helpers, further reducing InventoryUI.ts layout constant coupling.

- 2026-06-05: Inventory visibility open/close state moved to InventoryVisibilityStatePolicy.ts; confirm/cancel/filter/navigation command decisions moved to InventoryInteractionPolicy.ts; refresh chrome composition moved to InventoryChromeRefreshDisplay.ts. During this pass, InventoryUI.ts comment mojibake caused by a local encoding rewrite was removed and class structure was restored.

### 2026-06-08 Inventory Refactor Survey (handoff slice)

- 2026-06-08 현황 요약: `game/src/ui/InventoryUI.ts`는 더 이상 렌더링 책임의 상당수를 직접 소유하지 않고, `game/src/ui/inventory/` 하위 모듈로 위임하는 상태이다.
- 2026-06-08 현 상태에서 추가 분해가 필요한 잔여 책임
  - `open()`/`close()`의 visibility 전이와 템플릿 프리로딩 트리거 정합은 현재 정책 모듈(`InventoryVisibilityStatePolicy.ts`)과 결합돼 있으나, 초기 호출 시점의 부수 효과(템플릿 준비, 최초 refresh 호출 타이밍, onVisibilityChange 브로드캐스트) 통합이 여전히 `InventoryUI.ts`에 존재한다.
  - `confirmSelected()`, `cancelAnvil()`, `equipSelected()`, `navigate()`, `cycleFilter()`는 여전히 UI 제어 흐름과 상태 갱신을 직접 수행한다.
  - `drawRightColumn()`, `renderStratumPixelMap()`는 우아한 분리 가능 지점이며, 단일 책임성 기준으로 `InventoryRightColumnDisplay` 또는 `InventoryStratumRenderPolicy`로의 추가 분리가 가능하다.
  - `update()`는 `updateInventoryPulses()`로 대부분 이동했으나, `selected mode === 'anvil'` 조건은 여전히 `InventoryUI`에서 전달하고 있어 정책-계측 경계가 더 정리될 수 있다.
- 2026-06-08 권장 다음 모델 진행 순서 (짧고 안전한 순차 실행)
  1. `InventoryUI.open()`/`close()`에서 visibility/템플릿/콜백 처리만 분리해 `InventoryVisibilityTransitionPolicy`로 이동하고, 함수 시그니처를 유지한 채 `InventoryUI`는 상태 수용자 역할만 남긴다.
  2. `InventoryUI.confirmSelected()/cancelAnvil()/navigate()/cycleFilter()/equipSelected()`를 `InventoryInteractionFacade.ts`로 위임해 `InventoryUI`를 `draw+state container`로 수렴.
  3. 우측 컬럼 렌더를 `drawInventoryRightColumn()` 단일 함수 또는 `InventoryRightColumnDisplay`로 이동해 `info/anvil` 분기 의존을 캡슐화.
  4. `InventoryStratumMinimap` 경로(`drawStratumMinimap` + `renderStratumPixelMap`)를 통합된 미니맵 오케스트레이션 함수로 래핑해 `InventoryUI`의 참조 상태(`abyssNoiseLayers`, `abyssNoiseTick`)와 렌더 책임을 분리.
  5. 정리 직후 `rg -n "TODO|FIXME"`/`rg -n \"unused\"`로 잔여 위험 점검 후, 빌드가 없는 상태에서는 최소 범위로 변경량 종료.
- 2026-06-08 예상 비용/난이도
  - 단계 1~3: 각각 30~60분, 총 2~3시간.
  - 단계 4: 30~90분.
  - 전체 Inventory 안정화 잔여분: 3~5시간.
  - 권장 모델:
    - 설계/경계 결정: Codex `xhigh`
    - 순차 추출/리팩터 구현: Codex `high`
    - 정리/컴파일 표면 패치: Codex `medium`

- 2026-06-08 진행 기록 (이 턴)
  - `InventoryVisibilityStatePolicy.ts`에 `openInventoryVisibilityTransition()`/`closeInventoryVisibilityTransition()`를 추가해 visibility 전이 부수 효과 플래그(템플릿 프리로딩 필요, visibility 브로드캐스트 필요)를 분리.
  - `InventoryInteractionPolicy.ts`에 `nextInventoryFilterSelection()`/`nextInventoryNavigation()`/`nextInventoryConfirmSelection()`/`nextInventoryEquipSelection()`/`nextInventoryCancelAction()`을 추가해 `InventoryUI.ts`의 입력 정책 결정을 정책 레이어로 위임.
  - `InventoryUI.ts`는 새 정책 API를 사용해 `open/close`, `confirmSelected`, `cancelAnvil`, `equipSelected`, `cycleFilter`, `navigate` 흐름을 축소해 오케스트레이션 의존도를 낮춤.
  - `InventoryRightColumnDisplay.ts`를 추가해 `InventoryUI.ts`의 우측 컬럼(플레이어 스텟/트래스크림맵) 분기를 분리.
  - `ItemWorldContainerPhysicsRuntime.ts`는 `resolveContainerContainerCollisions`를 추가 호출해 `World`/`ItemWorld` 컨테이너 충돌 처리의 공통 헬퍼 사용을 맞춤.
  - `ItemWorldContainerPhysicsRuntime.ts`의 처리 순서를 `WorldContainerPhysicsRuntime.ts`와 동일화해 컨테이너 상호작용 병렬 seam을 수렴.
  - `InventoryInteractionPolicy.ts`는 legacy 내부 분기 함수(`inventoryConfirmAction`/`inventoryCancelAction`/`canChangeInventorySelection`)를 정책 본체로 통합해 API 표면을 축소.
  - `ContainerSpawnSettleHelpers.ts`에 `settleContainersAtSpawnFromIndex()`를 추가해 시작 인덱스 기반 정착 순회 공통화. `WorldContainerSpawnRuntime.ts`는 전체 등록 목록 정착에 공통 함수를 쓰도록 변경했고, `ItemWorldRuntimeCellSpawner.ts`의 개별 정착 루프도 공통 helper로 통합해 world/itemworld 스폰-seam 정합을 정리.
  - `PauseMenu.ts`는 확인창/프리셋/오디오/설정 하위 패널 간 selection pulse 억제 토글을 `setSelectionPulseSuppressed()`로 통합해 중복 토글 로직 축소 및 가독성 개선.

- 2026-06-09 Inventory 경계 정리 진행
  - `InventoryVisibilityStatePolicy.ts`에서 visibility 전이 plan을 side-effect 중심으로 재정의해 sideEffect 목록 생성과 상태 빌더 책임을 정리.
  - `InventoryUI.ts`에서 `open()` 흐름이 plan의 sideEffect를 순차 실행하도록 정리해 템플릿 프리로드와 visibility callback의 직접 분기를 policy 신호에 종속시킴.
  - `InventoryVisibilityStatePolicy.ts`에 `InventoryVisibilityTransitionPlan` 유니온 타입을 추가해 open/close plan을 하나의 관점에서 다룰 수 있는 기반을 깔았고, 불필요한 중복 배열 변경을 readonly로 정리.
  - `InventoryInteractionFacade.ts` 신규 추가: `confirm/cancel/filter/navigate/equip` 의사결정을 정책-파사드 계층으로 이전하고, `InventoryUI.ts`는 명령 적용에 집중하도록 오케스트레이션 축소.
  - 2026-06-10 이어서: `InventoryUI.ts`의 상단 import 문법 깨짐 복구, `drawRightColumn()`에서 `selectedItem` 계산을 제거해 `InventoryRightColumnDisplay.ts`로 이동(현재는 `filteredItems + selectedIndex`를 전달하고 표시 영역이 내부에서 선택 아이템을 resolve).
  - 2026-06-10 이어서: `InventoryInteractionFacade.ts`에 `canPlaceSelection` 옵션을 추가해 `InventoryUI.ts`의 아빌 배치 가능성 판정 분기를 파사드로 이동하고, `InventoryUI.ts`에서는 확인 결과 적용만 수행.
- 2026-06-11 진행: `InventoryVisibilityStatePolicy.ts`에 `applyInventoryVisibilityTransitionSideEffects()`를 추가해 템플릿 프리로딩/가시성 콜백 부수효과를 정책 레이어로 이동, `InventoryUI.ts`의 직접 실행 로직 제거.
- 2026-06-11 진행: `game/src/ui/InventoryUI.ts`에서 인벤토리 confirm/cancel/equip/navigate/filter 흐름과 정책 파사드 정합성 정리. `buildInventoryConfirmCommand`/`buildInventoryCancelCommand` 미사용 임포트를 정리하고, anvil 배치 정책 `ensureInventoryAnvilPlacementAllowed` 임포트를 복구해 컴파일 정합성만 먼저 정리.
- 2026-06-11 진행: `game/src/ui/inventory/InventoryInteractionFacade.ts`에서 `InventoryUI`가 직접 소비하지 않는 내부 빌더(`buildInventoryConfirmCommand`/`buildInventoryCancelCommand`)를 비공개 함수로 전환해 파사드 API 표면을 축소.
- 2026-06-11 진행: `game/src/ui/InventoryUI.ts` ↔ `InventoryRightColumnDisplay.ts` 경계를 정리해 우측 컬럼 선택 상태 해석을 표시 모듈 쪽에서 독립적으로 처리하지 않도록 이동(선택 아이템 자체를 전달).
- 2026-06-11 진행: `InventoryPulseUpdatePolicy.ts`가 `InventoryUIMode` 기반으로 anvil 패스 분기를 처리하도록 정리하고, `InventoryUI.update()`에서 `this.mode === 'anvil'` 직접 비교를 제거해 모드 의존을 정책 경계로 한 단계 이동.

- 2026-06-12: R3 컨테이너 컴파일 표면 정리 진행 완료(타입-only import 정리 + 컨테이너 정착 helper startIndex-0 단일화). 다음 단계는 컨테이너 공유 경계와 동일 동작 pair(Projectile/Pickup/Breakable drop)의 안전한 정합 여부를 빠르게 검토 후 R1/R2 소유 경계로 이동.
- 2026-06-12: `InventoryUI`-`InventoryInteractionFacade` 경계 정리: `confirmSelected`에서 `InventoryUI`가 직접 아빌 배치 허용 판정 로직(`ensureInventoryAnvilPlacementAllowed`)을 들고 있던 부분을 제거하고, `saveAccess.isFirstDiveDone()`을 파사드 옵션으로 위임. `InventoryInteractionFacade`에서 `firstDiveDone` 기반으로 기본 판정 경로를 정리해 정책 결정 위치를 한 단계 더 높임.
- 2026-06-12: Projectile 런타임 low-risk 정합 정리: `ItemWorldProjectileRuntime`의 유령 투사체 수집 경로를 `addProjectileToLayer`의 `onlyAttachIfUnparented` 경로와 동일하게 호출하도록 정렬해 world/itemworld projectile 셋업 분기 압축.
- 2026-06-13: Breakable prop 컴파일-표면 정리: `ItemWorldBreakablePropRuntime`의 로컬 `ItemWorldBreakablePropDestroySource` 별칭을 제거하고 공유 타입 `BreakableDestroySource`로 통합해 world/itemworld 파괴 소스 계약 정합성 강화.
- 2026-06-14: Pickup 루프 공통화 R3 진행: `PickupCollectionHelpers.ts`에 `processPickupsForPlayerCollection()`를 추가해 수집 반복 로직을 shared로 이동하고, `WorldPickupRuntime.ts`와 `ItemWorldPickupRuntime.ts`의 골드/치유 픽업 처리 루틴을 공통 헬퍼 호출로 교체해 behavior 분기(게임 모드별 collected 처리/보상 경로)는 콜백으로 보존.
- 2026-06-14: `EgoShardProjectileRuntimeDeps` 타입 수렴: `EgoShardProjectileHelpers.ts`에 공통 deps 인터페이스를 노출해 `WorldEgoShardProjectileRuntime.ts`와 `ItemWorldEgoShardProjectileRuntime.ts`의 중복 deps 타입 선언 제거.
- 2026-06-14: 컨테이너 물리 런타임 계약 수렴: `WorldContainerPhysicsRuntime.ts`/`ItemWorldContainerPhysicsRuntime.ts`에서 동일 의존성 타입을 `ContainerPhysicsRuntimeContracts.ts`로 공유해 런타임 타입 선언 중복 제거.
- 2026-06-14: `WorldScene.ts`의 portal 경로에서도 `WorldItemWorldSceneTransitionRuntime`을 주입해 `container` 숨김 + UI 분리(`inventoryUI/altarUI/miniMap/hud`)를 런타임 경계로 이전하고, `detachSharedUiForItemWorld()` scene 로컬 메서드를 삭제.
- 2026-06-14: `WorldItemWorldSceneTransitionRuntime`의 시각 자원 정리/줌/복귀 페이드 의존성을 선택적(optional)으로 바꿔, Legacy `WorldScene`는 사용하지 않는 반환 동작 콜백을 주입하지 않아도 되게 정리.
- 2026-06-14: `WorldScenePortalItemWorldFlowRuntime`의 전환 의존을 `transition` 컨테이너에서 단일 `preparePush` 함수로 단순화해, portal 경로 계약과 실제 사용 책임을 일치시킴.
- 2026-06-14: `WorldItemWorldSceneFlowRuntime.completeReturn()` 시그니처를 `({ restoreAtAnvil })` 옵션 객체에서 `restoreAtAnvil?: boolean`로 정리하고, `WorldAnvilItemWorldFlowRuntime`/`WorldFixedItemWorldFlowRuntime` 완료 경로를 동일 단일 인자형으로 통일해 경계를 단순화.
- 2026-06-14: `WorldItemWorldSceneFlowRuntime`의 transition 의존을 `transition` 객체에서 `preparePush`/`startReturnFade` 직접 함수 주입으로 정리해 런타임 계약을 단일화하고, `LdtkWorldScene` 주입부도 동일 경로로 정비.
- 2026-06-14: `InventoryRightColumnDisplay`에서 `stratum`(미니맵+픽셀맵) 렌더 오케스트레이션을 `InventoryStratumMinimapDisplay` 내부로 통합하고, `selectedItem` 계산을 `InventoryRightColumnDisplay`에서 수행하도록 이동해 `InventoryUI`의 뷰 상태 전달 책임을 더 축소.
- 2026-06-14: `InventoryVisibilityStatePolicy`에서 사용되지 않던 `openInventoryVisibilityState`/`closeInventoryVisibilityState`를 제거해 공개 API를 경량화하고, open/close 전이 호출 경로를 `*Transition*`로 단일화.
- 2026-06-15: `WorldItemWorldEntryState` 캡슐화 강화 ? `itemWorldEntryState`의 `inTunnel`, `preTunnelLevelId`, `item` 직접 사용을 점진적으로 `setInTunnel/isInTunnel/setPreTunnelLevelId/getPreTunnelLevelId/clearPreTunnelLevelId/setEntryItem/getEntryItem`로 대체. `LdtkWorldScene.ts`와 `WorldAnvilReturnFlowRuntime.ts`에서 직접 필드 접근 호출부를 재배선해 상태 경계 전이 일관성 강화.
- 2026-06-15: `WorldItemWorldEntryState.deployment`를 캡슐화( `setDeployment/isDeploymentActive/isDeploymentBlocking/isDeploymentGrowing/updateDeployment/releaseDeploymentBirthPieces`)하고, `LdtkWorldScene.ts`의 아이템월드 진입/진입가드/저장포인트 근접 업데이트/유령 스트림 업데이트 경로에서 직접 `itemWorldEntryState.deployment` 접근을 완전 제거.
- 2026-06-15: ItemWorldScene 죽음 복귀 처리의 씬 헬퍼(showReturnResultAndComplete, onCompleteWithReturnResult)를 제거하고, prepareReturnResult -> showReturnResult -> completeExitWithReason 경로를 인라인 정리해 반환 플로우의 씬 편의 메서드 의존도를 축소.
- 2026-06-16: `ItemWorldReturnFlowRuntime`에 `showReturnResultAndComplete(reason, result, onComplete)`를 추가해 사망 복귀의 `showReturnResult`+`completeExit` 책임을 런타임 경로로 재집중. `ItemWorldScene`은 reason/result만 전달하고 직접 반환-정리 프리패치 분기를 삭제.
- 2026-06-16: Inventory 가시성 전이 경계를 추가 정리해 `InventoryVisibilityStatePolicy.ts`에 `applyInventoryVisibilityTransition()`을 도입, `InventoryUI.ts` open/close에서 가시성/템플릿 준비/콜백 실행을 정책 경로로 통합. `InventoryUI`는 상태 수용 + 재구성 트리거 중심으로 더 축소.
- 2026-06-16: `InventoryInteractionFacade.ts`에 `executeInventoryConfirmAction`/`executeInventoryCancelAction` 실행 wrapper를 추가해 `confirmSelected`/`cancelAnvil`의 상태 갱신을 파사드 실행 계층으로 이관. `InventoryUI.ts`는 action 빌드/실행 위임 후 콜백으로 상태 반영만 수행하게 정리.
- 2026-06-16: `InventoryInteractionFacade.ts`에 `executeInventoryFilterAction`/`executeInventoryNavigationAction`/`executeInventoryEquipAction`를 추가해 `cycleFilter`/`navigate`/`equipSelected`도 파사드 execute 계층으로 이관. `InventoryUI.ts`는 입력 처리의 상태 갱신을 최소화하고 `refresh` 트리거를 위임 콜백으로 유지.
- 2026-06-16: `LdtkWorldScene.ts`의 아이템월드 전이 콜백 래퍼 `startItemWorldReturnFadeInForTransition()`를 제거하고 `WorldItemWorldSceneTransitionRuntime` 주입 시 `itemWorldReturnFade.start()`를 직접 전달해 scene-local pass-through wrapper를 추가로 축소. 이와 함께 가시성 transition plan 적용에서 precomputed side-effect를 직접 사용하도록 `InventoryVisibilityStatePolicy.ts`를 정리.
- 2026-06-16: `ItemWorldScene.ts`에서 `startAbsorbSequence`/`applyUpdrafts` 패스스루 메서드를 제거하고 trapdoor/업드래프트 호출을 런타임 호출 지점에서 직접 위임해 scene-owned 미세 wrapping을 축소.
- 2026-06-16: `LdtkWorldScene.ts`의 아이템월드 전이 주입부에서 `detachSharedUiForItemWorldTransition()`/`releaseWorldVisualsForItemWorldTransition()` 래퍼를 inline 콜백으로 교체하고, 더 이상 미사용인 래퍼 메소드를 제거해 전이 seam 소유권 경계를 추가 정리.
- 2026-06-16: `ItemWorldScene.ts`의 `handleBossDefeat()` 내 `isFirstBossOnboarding()` 단일-위임 메소드를 제거해 런타임 호출을 직접 오케스트레이션하도록 정리.
- 2026-06-17: `LdtkWorldScene.ts`에서 `isItemWorldEntryCinematicActive()`/`showTunnelOpenDialogueAfterDeployment()`/`reattachPersistentUi()` 같은 패스스루(scene-local) 메서드를 제거하고, 해당 의존을 런타임 주입부와 `enter()` 진입부의 inline 콜백/블록으로 이관해 scene-local 위임 폭을 추가 축소.
- 2026-06-17: `ItemWorldScene.ts`에서 사용처가 제한적인 `fireEgo*` scene 패스스루 집합(`fireEgoEnter`, `fireEgoEnterAsync`, `fireEgoMonsterVisible`, `fireEgoPlayerDeath`, `fireEgoRoomClear`, `fireEgoFirstKill`, `fireEgoInnocentFound`, `fireEgoInnocentStable`, `fireEgoBossKilled`, `fireEgoAffinityMax`)을 직접 `egoDialogueRuntime` 호출로 인라인/삭제해 런타임 의존만 남기고 scene-local 대리층을 축소.
- 2026-06-17: `ItemWorldScene.ts`에서 `isStratumEndRoom()`/`pickLdtkTemplate()` 단일 위임 메서드를 제거하고, 해당 의존을 즉시 호출 라인으로 인라인해 callback 계약에서 직접 `unifiedGrid.stratumEndRooms` 판정 및 `templatePickerRuntime.pick()` 호출로 축소.
- 2026-06-17: 추가 패스스루 축소 라운드: `ItemWorldScene.ts`의 `isFinalEndRoom()`/`beginEntryDialogueAfterTransition()`를 래퍼 없이 인라인화(`trapdoorSpawnRuntime`, `entryCorridorRuntime` 진입점). `LdtkWorldScene.ts`의 사용되지 않는 `getTileMutator()`를 삭제해 public scene API 표면을 더 축소. 현재 `ItemWorldScene`는 `beginEntryDialogueAfterTransition` 실행 함수를 필드로 보유해 `ItemWorldSceneLike` 계약(`WorldItemWorldSceneFlowRuntime`)은 유지한 채 scene-local 메서드 중복을 최소화.
- 2026-06-17: 추가 패스스루 축소: `ItemWorldReturnFlowRuntime.ts`에서 `requestExitWithReason()`/`startExitFade()` 내부 위임 헬퍼를 제거하고, 요청·시작 경로를 의존성 주입 직접 호출로 통일(`startPreparedExitFadeForReason`, `completeExitWithReason`, `showReturnResultAndComplete`).
- 2026-06-17: Q1 진행: `WorldItemWorldSceneFlowRuntime`에서 데드 `onPostPush` 계약을 제거하고 `pushPrepared()` 후처리 파이프라인을 고정(`() => {}`).
- 2026-06-17: Q2 진행: `ItemWorldEntryPushTransition.push()` post-push 콜백을 기본값 no-op/`undefined` 허용으로 정리하고, `WorldItemWorldSceneFlowRuntime`/`WorldScenePortalItemWorldFlowRuntime`에서 불필요한 no-op 래퍼 함수 제거를 통해 진입 전이 호출부를 단순화.

### 2026-06-17: Handoff Refactor Survey (Next-Model Execution Plan)

#### A. 지금까지 축적된 상태 (인수인계용)

- 06-16 이후 기준으로 `LdtkWorldScene`의 아이템월드 패스스루는 크게 정리됨. Scene-local 경량 위임이 줄었고, 대형 흐름은 runtime 의존성으로 이동 중.
- `InventoryUI`는 정책/파사드 분리의 큰 축이 끝난 상태로, 잔여는 `open/close` 트리거 정합(콜백 시점/템플릿 준비 타이밍)만 통합 정리하면 안정상태.
- World/itemworld 주요 공용 런타임 타입/헬퍼 정합은 상당수 정리되어, 대규모 동작 변경보다 seam 완결이 다음 우선순위.
- 빌드/검증 지침은 `npm run build`가 데이터 파이프라인(로컬라이징 CSV 생성/검증)까지 검증 가능하다는 점이 유효.

#### B. 100% 전수조사를 위한 작업 패키지 (권장 순서)

- Phase 0: 정적 스캔 1차 (리스크 지도)
  - 대상: `game/src/scenes/LdtkWorldScene.ts`, `game/src/scenes/ItemWorldScene.ts`, `game/src/scenes/WorldScene.ts`, `game/src/ui/InventoryUI.ts`, `game/src/ui/inventory/*`, `game/src/runtimes/*`
  - 산출물: 패스스루 후보 목록, 직접 state 접근 후보 목록, runtime 경계 위반 후보 목록, 각 후보의 현재 진입점/호출부/테스트/빌드 영향도.
- Phase 1: Scene/Runtime 경계 수선 (P0)
  - Ldtk/ItemWorld에서 잔여 scene-local 래퍼/편의 호출 정리
  - `enter()`, `respawnPlayer()`, `enterPortal()`, return flow 등 핵심 전이 흐름을 runtime 계약 중심으로 고정
  - 목표: 한 파일 내 “호출만 하고 끝나는 메서드” 비율을 가시적으로 감소
- Phase 2: Inventory 조각 마무리 (P1)
  - `InventoryUI`의 정책 판단 분기/상태 업데이트 최소화
  - 표시 상태는 display layer, 입력/액션은 facade/정책만 남기기
  - 기존 `Localization` SSoT 제약 유지, 하드코딩 텍스트 점검
- Phase 3: Runtime/Shared Helper 동기화 (P1)
  - world vs itemworld 정렬 안 된 pair(컨테이너/투사체/픽업/부수효과/사운드/대화) 점검
  - 타입 계약의 단방향 임포트 의존 분리, 공개 API 축소
- Phase 4: 안정화 + 전달물 정리 (P1)
  - `memory/wiki/`에 변경 근거 정리(결정 변경/경고 사항)
  - 큰 코드 삭제 후, 위험 회귀 포인트 목록만 `RefactorRoadmap`에 남기고 종료

#### C. 권장 모델/effort 분배

- 설계/전수조사: `Codex xhigh`
  - 기대치: 4~8시간
  - 이유: 파일 간 소유권 판단이 핵심이라 추론력이 높은 모델 필요
- 핵심 경계 적용(P0/P1 구현): `Codex high`
  - 기대치: 2~3일(중간~높은 난이도 파일 다수)
- 정리/마이너 리펙터: `Codex medium`
  - 기대치: 0.5~1일(표면 정리 및 마무리)
- 전체 예상치(현재 상태 기준): 4~6일 집중작업 + 1~2일 휴먼 리드(리뷰/검토) = 총 5~8일

#### D. 다음 모델에게 넘기는 체크리스트

1. Phase 0 문서 결과와 Phase 1~4 작업 산출물을 같은 형식으로 유지
2. 각 변경 후:
  - 런타임 contract 변경 여부를 1줄 주석/커밋 로그에 남기기
  - `WorldCollisionGridRuntime`/`RuntimeCollisionScope`(DEC-042) 위반이 없는지 재확인
  - UI 문구는 반드시 `Sheets/Content_Localization.csv` 경유만 사용
3. 실패 가능성이 높은 포인트: portal/return 흐름, boss defeat 직후 transition, anvil 배치/필터 동작, build pipeline에 연동되는 csv 생성/검증 단계

#### E. 2026-06-17 즉시 투입 큐 (Handoff)

- Q1 (즉시): `ItemWorldSceneLike` 계약에서 entry dialogue 후처리 의존 정합 재검토
  - `ItemWorldSceneLike`의 `onPostPush` 경로는 제거했고, entry dialogue는 scene 내부 로컬 클로저를 런타임 주입 경로로 유지한 뒤 필드 보유를 제거함.
  - Q1의 즉시 항목은 “불필요한 scene-local 계약 노출 제거” 기준 충족으로 마무리됨.
- Q2 (짧은): `WorldScene.ts`/`LdtkWorldScene.ts`/`ItemWorldScene.ts` 남은 “직접 위임만 수행” 패턴 후보 2차 스캔
  - 단일 책임 기준(상태 계산 + 분기 포함 여부)으로만 남을 수 있는 후보만 1차 제거.
- 2026-06-19: Q2 2차 스캔 결과, 세 Scene에서 추가 `direct passthrough` 후보는 현재 확인되지 않음. `ItemWorldReturnFlowRuntime`의 `isTransitionActive()`를 제거하여 Scene의 직접 판정( `isExitFadeActive`/`isPostClearHold`)으로 통일.
- Q3 (중간): `ItemWorldReturnFlowRuntime`에서 `isTransitionActive`/`getTransitionState` 외부 사용 경로 정합 재확인
  - 현재는 Scene에서 조회 + 런타임 내부 분기 혼용; 의미 중복 없는가를 점검.
- Q4 (중간): `InventoryUI` 공개 API 최소화 검토
  - `isAnvilMode` 외부 직접 참조는 현재 `InventoryUI` 편의 메서드만 경유(`closeIfAnvilModeOpen`, `handleAttackInput`, `handleMenuInput`, `handleAnvilCyclePromptCancel`)로 정리되어 있고, 추가 축소 여지는 모드 상태를 외부 노출 없이 위임하는 쪽에서 판단 필요.
- 2026-06-18: `ItemWorldReturnFlowRuntime`의 `isTransitionActive()` 편의 API 제거 후, `ItemWorldScene`에서 `getTransitionState() !== 'none'`로 전이 활성 판정을 일원화.
- 2026-06-18: `InventoryVisibilityStatePolicy`에서 내부 전이 빌더(`openInventoryVisibilityTransition`, `closeInventoryVisibilityTransition`)를 비공개 함수화하여 정책 모듈 공개 API를 추가로 축소.
- 2026-06-18: `ItemWorldReturnFlowRuntime`에서 문자열 상태 게터 의존을 축소하고, `isExitFadeActive`/`isPostClearHoldActive` 부울 게터로 전이 판정을 전달.
- 2026-06-19: `ItemWorldReturnFlowRuntime`의 `isTransitionActive()` 편의 API를 제거하고, `ItemWorldScene`에서 `isExitFadeActive()`/`isPostClearHold()` 조합으로 전이 활성 판정을 직접 수행해 이원화된 판정 경로를 정리.
- 2026-06-05: `InventoryUI.isAnvilMode()` 의존 정리 1차 완료. `LdtkWorldScene`과 `WorldUiController`의 직접 모드 판별 분기를 `InventoryUI` 편의 메서드(`closeIfAnvilModeOpen`, `handleAttackInput`, `handleMenuInput`, `handleAnvilCyclePromptCancel`)로 이관했고, `AnvilCyclePromptRuntime`의 `closeMenu` 콜백도 외부 상태 조회 없이 scene-level 분기 처리로 리팩터링.
- 2026-06-19: `ItemWorldEntryCorridorRuntime`의 scene-local startGameplay 패스스루를 제거하고, 진입 직후/탈출 지점 진입 동작을 `ItemWorldScene`의 실제 실행 메서드(`startGameplayAfterEntryAfterCorridor`, `beginEntryDialogueAfterTransition`)로 정리. 동일하게 `ItemWorldRoomTransitionRuntime`/`ItemWorldAbsorbDissolveRuntime`의 미사용 `suppressionState` getter, `ItemWorldFlowState.value` 공개 getter/타입 노출을 삭제해 공개 surface 축소.
- 2026-06-20: Q2 2차 스캔 결과 재확인. `rg` 기반 점검 기준에서 `LdtkWorldScene.ts`/`ItemWorldScene.ts`/`WorldScene.ts`에는 새 pass-through 패턴이 추가로 발견되지 않음. `ItemWorldScene`의 메서드 후보군도 상태 계산·분기 포함형 위주로 유지되어 “호출만 전달” 목적만 남는 메서드가 없음.
- 2026-06-20: Inventory 경계 점검. `isAnvilMode`/`mode === 'anvil'` 직접 판별은 `game/src/ui/inventory/*` 내부와 `InventoryVisibilityStatePolicy` 내부로 제한되며, Scene 레벨에서는 `InventoryUI` 공개 메서드(`closeIfAnvilModeOpen`, `handleAttackInput`, `handleMenuInput`, `handleAnvilCyclePromptCancel`)만 이용. `WorldUiController`와 `LdtkWorldScene`은 외부의 모드 상태 직접 조회를 더 이상 수행하지 않음.
- 2026-06-20: `InventoryUI.handleAttackInput()`의 반환값을 bool에서 이벤트 열거형(`none | confirmed_equipment_change`)으로 전환해 `WorldUiController`가 UI 내부 상태 판별을 의존하지 않고 이벤트 결과만 처리하도록 정리. `InventoryAttackInputResult` 타입을 공개형 계약으로 공유.
- 2026-06-21: `ItemWorldFlowState` 공개 surface 축소 라운드.
  - `isActive` 게터 제거 후 `ItemWorldScene`의 호출 경로는 `isExitFade`/`isPostClearHold` 조합으로만 전환 상태를 판정하도록 정리.
- 2026-06-20: 다음 단계 권고: `ItemWorldReturnFlowRuntime`/`ItemWorldScene` 계약 변경 없이, `RefactorRoadmap`의 Phase 3(World/Itemworld 동기화) 점검으로 이동. 우선순위는 portal/return 트랜지션 회귀 가드 유지와 `npx tsc --noEmit` + `npm run build` 기준 통과 후, 브라우저 smoke로 핵심 흐름 검증.
- 2026-06-05: Compile-surface cleanup after return/trapdoor refactor: `ItemWorldTrapdoorFlowRuntime` now owns trapdoor activation after guard/snapshot; `WorldItemWorldSceneTransitionRuntime.startReturnFade` is required; `InventoryUI` visibility transitions apply through an explicit mutable state adapter instead of passing private class fields structurally; `InventoryInteractionFacade` cancel/place-anvil contracts and anvil placement `uid` types are aligned. Verification: `npx tsc --noEmit` and `npm run build` passed. Build emitted the existing LDtk atlas CSV warning for `atlas/prologue_01.png`.
- 2026-06-05: Player placement leaf helper added: `PlayerPlacementHelpers.playerTopLeftFromBottomCenter()` now owns bottom-center authored spawn to runtime top-left conversion, and `ItemWorldPlayerSpawnRuntime` uses it for LDtk stratum spawns. World LDtk spawn policy remains separate because edge-entry/default down-entry semantics differ.

- 2026-06-05: World/ItemWorld hostile projectile update/remove loop now shares scenes/shared/ProjectileCollectionHelpers.updateProjectileCollection(); mode runtimes keep deflect hitbox policy and player-hit feedback wiring as callbacks.

- 2026-06-05: Item World entity list lifecycle repetition now uses scenes/shared/EntityLifecycleHelpers.ts for layer-backed add, update loops, and destroy-and-clear in ItemWorldAnvilRuntime/ItemWorldResidentRuntime; prompt, return, and Ego trigger policy remain runtime-owned.

- 2026-06-05: World static registry lifecycle repetition now uses scenes/shared/EntityLifecycleHelpers.ts for optional layer attach, destroy-and-clear, and remove-at in Building/CrackedFloor/GrowingWall/Spike/SecretWall registries; query/collision policy remains registry-owned.

- 2026-06-05: Additional world registry lifecycle repetition now routes through EntityLifecycleHelpers in Breakable, CollapsingPlatform, and DoorSwitch registries; BreakablePropRegistryHelpers delegates to the same generic lifecycle helpers. WeakMap metadata/collision-grid ownership remains registry-specific.

- 2026-06-05: World item-drop, altar, and portal add/clear lifecycle repetition now uses EntityLifecycleHelpers; WorldAltarController also uses existing ui.world.offer_item localization key instead of a hardcoded altar title.

- 2026-06-05: WorldExitGlowRuntime glow add/clear and builder-entrance removal now reuse EntityLifecycleHelpers; player-distance update and builder subset policy remain runtime-owned.

- 2026-06-05: WorldRelicPickupRuntime health-shard add/clear/remove lifecycle now uses EntityLifecycleHelpers; ability relic Graphics cleanup and reward/acquire policy remain runtime-owned.

- 2026-06-05: ItemWorldStaticEntitySpawner list attach repetition now uses EntityLifecycleHelpers.addEntityToLayer(); building palette, collision injection, door/switch scoping, and item-display sizing remain spawner-owned.

- 2026-06-05: Debug/runtime container spawn attach paths now use EntityLifecycleHelpers.addEntityToLayer in ItemWorldDebugInputRuntime, ItemWorldRuntimeCellSpawner, and WorldMaintainedContainerSpawnerRuntime; settle, occupied-cell, owned-list, and TileMutator registration ordering remain local.

- 2026-06-05: Boss-lock door attach and Item World growing-wall slime attach now use EntityLifecycleHelpers.addEntityToLayer(); boss unlock/destroy order and slime initialization order remain runtime-owned.

- 2026-06-05: WorldDialogueTriggerRuntime NPC add/update/destroy-clear lifecycle now uses EntityLifecycleHelpers; dialogue trigger prompt cleanup, fired/cooldown state, and NPC facing restore policy remain runtime-owned.

- 2026-06-05: WorldWeatherRuntime and ItemWorldWeatherRuntime now share WeatherRuntimeHelpers.attachWeatherToLayer() for WeatherSystem container attachment; LDtk weather parsing and Item World palette/temperament profile selection remain mode-owned.

- 2026-06-05: World/ItemWorld EgoShardProjectile runtime wrappers now share EgoShardProjectileRuntimeAdapter; mode class names remain as compatibility surfaces while update wiring lives in shared helpers.

- 2026-06-05: World/ItemWorld EgoShardCombat runtime wrappers now share EgoShardCombatRuntimeAdapter; mode class names remain as compatibility surfaces while checkHit wiring lives in shared helpers.

- 2026-06-05: World/ItemWorld EgoShardCast update wrappers now share EgoShardCastRuntimeAdapter; Item World keeps its reset bridge as the only mode-specific class method.

- 2026-06-05: World/ItemWorld EgoShardImpact debug freeze/thunder cell traversal now shares EgoShardImpactHelpers applyEgoShardDebugFreezeAtPlayer/applyEgoShardDebugThunderAtPlayer; mode-specific debug logging/toast policy remains runtime-owned.

- 2026-06-05: World/ItemWorld EgoShardImpact debug fire traversal/actions now share EgoShardImpactHelpers.applyEgoShardDebugIgniteAtPlayer(); runtime-specific debug logging/toast policy remains local.

- 2026-06-05: World/ItemWorld EgoShardImpact ice impact handling now shares EgoShardImpactHelpers.applyEgoShardIceImpact(); mode-specific fire/thunder side effects remain runtime-owned.

- 2026-06-05: BurnablePropRegistryHelpers now delegates add/clear/remove lifecycle to EntityLifecycleHelpers, matching BreakablePropRegistryHelpers; TileMutator registration/unregistration and ash side effects remain runtime-owned.

- 2026-06-05: World/ItemWorld breakable prop spawn exclusion radius filling now shares CellExclusionHelpers.addCellExclusionRadius(); world edge/player/save exclusion policy and Item World start-room exclusion policy remain runtime-owned.

- 2026-06-05: Pixi Graphics-backed transient collectibles now share DisplayObjectLifecycleHelpers for parent detach/destroy/splice in ItemWorldCaptureOrbRuntime and WorldRelicPickupRuntime; reward/arrival policies remain runtime-owned.

- 2026-06-05: ItemWorldMemoryTriggerRuntime now reuses DisplayObjectLifecycleHelpers for particle expiry and clear-time shard/glow/container cleanup, making display-object ownership explicit.

- 2026-06-05: DisplayObjectLifecycleHelpers now accepts Pixi destroy options and is used by ItemWorldDevOverlayRuntime and ItemWorldContainerPromptRuntime for owned UI/display cleanup.

- 2026-06-05: PickupCollectionHelpers now exposes isPointNearPlayer() and reuses it from isPickupNearPlayer(); WorldRelicPickupRuntime uses shared proximity checks for health shards and ability relic markers while reward policy remains runtime-owned.

- 2026-06-05: ItemWorldEntryCorridorVisualRuntime now uses DisplayObjectLifecycleHelpers for owned root container cleanup while preserving reveal-runtime cleanup and child-destroy semantics.

- 2026-06-05: DisplayObjectLifecycleHelpers now also exposes detachDisplayObject(); WorldMinimapRuntime uses it for non-destructive detach and destroyDisplayObject for owned minimap teardown.

- 2026-06-05: Additional owned display cleanup now routes through DisplayObjectLifecycleHelpers in WorldGameOverRuntime, ItemWorldFullMapLayerRuntime, and ItemWorldPrologueEndRuntime; destroy vs detach-only semantics remain callsite-owned.

- 2026-06-05: WorldAltarController now centralizes altar selection UI teardown in a private destroyUiContainer() helper and delegates owned container cleanup to DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true }).

- 2026-06-05: ItemWorldCellVisualRuntime and ItemWorldStratumPickerRuntime now route owned container/layer teardown through DisplayObjectLifecycleHelpers while preserving existing destroy option semantics.

- 2026-06-05: WorldDialogueTriggerRuntime now uses DisplayObjectLifecycleHelpers.detachDisplayObject() for interact prompt clear/once cleanup while preserving existing detach-only prompt semantics.

- 2026-06-05: WorldUiController now uses DisplayObjectLifecycleHelpers.detachDisplayObject() for external UI container detach/teardown while preserving non-destroy ownership semantics.

- 2026-06-05: ItemWorldUiController modal/overlay cleanup now uses `DisplayObjectLifecycleHelpers` for detach/destroy paths while preserving ownership semantics. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: `ItemWorldStratumPickerRuntime.hide()` now delegates to `hideContainerOnly()`, removing the remaining local parent-remove/destroy duplication for picker root cleanup. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: Small prompt/modal runtime cleanup now routes owned UI teardown through `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })` in `AnvilCyclePromptRuntime`, `AnvilPromptController`, and `ItemWorldWorldPromptRuntime`. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: Transition/acquire overlay cleanup now routes through `DisplayObjectLifecycleHelpers` in `WorldAcquireOverlayRuntime`, `ItemWorldEntryPushTransition`, and `ItemWorldReturnFadeRuntime`; reparent detach-only and owned destroy semantics remain callsite-specific. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: Frozen return/snapshot display cleanup now routes through `DisplayObjectLifecycleHelpers` in `WorldFrozenReturnRuntime` and `WorldFrozenSnapshotRuntime`; ticker/proximity/filter ownership remains runtime-local. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: Save/debug/intro display cleanup now routes through `DisplayObjectLifecycleHelpers` in `SavePointRuntime`, `WorldDebugWarpRuntime`, and `WorldIntroHandoffRuntime`; save point cleanup remains detach-only while debug/intro UI keeps owned destroy semantics. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: Builder/growth display cleanup now routes through `DisplayObjectLifecycleHelpers` in `WorldBuilderAttachmentRuntime`, `WorldBuilderLayerRuntime`, and `ItemWorldGrowthSnapshotController`; reparent detach-only and owned destroy semantics remain explicit. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: Shared registry/decor detach helpers now reuse `DisplayObjectLifecycleHelpers.detachDisplayObject()` in `EnemyRegistryHelpers` and `ProceduralDecorLayerHelpers`; detach-only semantics remain explicit. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: Standalone title/ending scene UI root teardown now uses `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })` in `TitleScene` and `EndingScene`; title gamepad listener cleanup and ending CTA behavior remain unchanged. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: Reusable UI component root-container teardown now routes through `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })` in `AcquireOverlay`, `DivePreview`, `LorePopup`, `ItemImage`, `WorldMapOverlay`, and `FpsCounter`. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


- 2026-06-05: Additional UI component cleanup now routes through `DisplayObjectLifecycleHelpers` in `AreaTitle`, `StratumClearOverlay`, `OxygenOverlay`, and `TutorialHint`; destroy vs detach-only semantics remain callsite-specific. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Pause/save transient UI display cleanup

- Routed pause-menu confirm/preset/settings/audio panel replacement and save delete-confirm panel teardown through `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })`.
- Routed toast expiry/clear and damage-number expiry through `DisplayObjectLifecycleHelpers.detachDisplayObject()` while keeping damage-number scene teardown on `destroyDisplayObject()`.
- Preserved existing ownership semantics: modal panels are owned and destroyed, toasts are detached only, and in-flight damage numbers are only destroyed by explicit manager clear.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## HUD/inventory redraw display cleanup

- Routed HUD skin reparent/redraw detach paths through `DisplayObjectLifecycleHelpers.detachDisplayObject()` in `HUD`, `HudDepthGaugeDisplay`, and `HudFlaskDisplay`.
- Routed Inventory panel divider/frame/title replacement cleanup through `DisplayObjectLifecycleHelpers.destroyDisplayObject()` while preserving frame child destruction.
- Preserved existing ownership semantics: HUD skin redraw objects remain detach-only where they were detach-only, and inventory redraw replacements are destroyed as before.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Scene-level display cleanup

- Routed remaining direct scene-level Pixi detach/destroy paths through `DisplayObjectLifecycleHelpers` in `WorldScene`, `ItemWorldScene`, and `LdtkWorldScene`.
- Preserved legacy ownership semantics: shared UI containers, door markers, enemies, lore display, HUD, area title pre-destroy detach, and screen flash overlays stay detach-only; altar selection UI and collision-debug HUD stay owned destroy paths.
- This is cleanup-only and does not change World/ItemWorld transition, portal, trapdoor, collision-grid, or UI text behavior.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Effect root-container display cleanup

- Routed owned root-container teardown through `DisplayObjectLifecycleHelpers.destroyDisplayObject(..., { children: true })` in `AnvilTether`, `ArcTether`, `PortalRingEffect`, `TransitionOverlay`, `PortalTransition`, and `WeaponPulse`.
- Preserved existing ownership semantics: each effect still owns its root container and child graphics; effect-specific reset callbacks and alpha restoration run before destroy where they already did.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Small particle-manager display cleanup

- Routed small effect particle cleanup through `DisplayObjectLifecycleHelpers` in `DropThroughDust`, `DashBoostPuff`, `IceSkidStreak`, `CriticalHighlight`, `AshRemnant`, and `HitBloodSpray`.
- Preserved existing ownership semantics: `DashBoostPuff` remains detach-only on expiry/clear, while the other managers still destroy expired/cleared Graphics.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Dust and puff effect display cleanup

- Routed dust/puff/bubble cleanup through `DisplayObjectLifecycleHelpers` in `FootstepPuff`, `JumpTakeoffPuff`, `WallSlideDust`, `WallJumpDust`, `WaterBubbles`, and `SteamPuff`.
- Preserved existing ownership semantics: footstep/jump/wall dust remain detach-only, while water bubbles and steam puffs still destroy expired/cleared Graphics.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Burst VFX Graphics display cleanup

- Routed expired/cleared Graphics destruction through `DisplayObjectLifecycleHelpers.destroyDisplayObject()` in `DeathParticles`, `DoubleJumpRing`, `DiveLandImpact`, `FlaskHealBurst`, `ItemPickupGlow`, and `WaterSplash`.
- Preserved existing ownership semantics: these managers still destroy every expired or cleared ring, flash, mote, halo, spark, crown, droplet, and particle Graphics.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Independent effect destroy cleanup

- Routed remaining independent effect display destruction through `DisplayObjectLifecycleHelpers.destroyDisplayObject()` in `AbsorbParticles`, `DashAfterimage`, `EmberRise`, `LowHpVignette`, `SmokeWisp`, and `HitSpark`.
- Preserved existing ownership semantics: particles, afterimages, singleton overlay Graphics, and absorb root containers still destroy exactly where their managers previously destroyed them.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Additional VFX lifecycle cleanup

- Routed VFX cleanup through `DisplayObjectLifecycleHelpers` in `RelicAuraBurst`, `SavepointPulse`, `SurgeVfx`, `PropShatter`, `MemoryDive`, and `LandingDust`.
- Preserved existing ownership exceptions: `MemoryDive` particles and `LandingDust` expiry remain detach-only, `MemoryDive` root still destroys children, and `LandingDust.clear()` keeps its `{ children: true, context: true }` destroy options.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Effect root and overlay destroy cleanup

- Routed owned root/overlay destruction through `DisplayObjectLifecycleHelpers.destroyDisplayObject()` in `AnvilGateLaser`, `EchoPlayer`, `ItemWorldForgeBirth`, `ItemWorldLeakageLayer`, `PileDriver`, `WorldPullIn`, and `VoidDrop`.
- Preserved existing destroy ordering: generated textures/render textures still release through their original code, and `VoidDrop` still destroys silhouette/overlay layers before root container teardown.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


## Mid-size effect display cleanup

- Routed display cleanup through `DisplayObjectLifecycleHelpers` in `EgoShard`, `FluidResidue`, `FluidCrestFoam`, `GrassClumpFire`, `ScreenCrack`, and `ItemWorldEntrySequence`.
- Preserved existing ownership semantics: Ego shard visuals, residue blots, foam particles, grass fire graphics/clump containers, screen crack root, and entry fade overlay still destroy where they previously did; FluidCrestFoam CSV SSoT behavior remains unchanged.
- Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Display lifecycle helper entity cleanup batch 4

- Replaced direct parent removal / owned-container destroy in small entity roots (`Breakable`, `BreakableProp`, `BurnableProp`, `FloatingItemDrop`, `Portal`, `Projectile`, `NPC`, `Updraft`, `Entity`, `ItemDisplay`, `MemoryResident`, `ThrowableContainer`, `Altar`, `Trapdoor`, `Building`, `WallGate`) with `destroyDisplayObject`.
- Finished the missed `FluidResidue` blot cleanup paths so max-count eviction, burn consumption, idle expiry, and clear use the shared helper.
- Gameplay, collision, localization, DEC-039 topology, DEC-040 audio, and DEC-041 fluid foam SSoT behavior unchanged. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Display lifecycle helper entity cleanup batch 5

- Replaced detach-only pickup/trigger cleanup (`HealingPickup`, `CollapsingPlatform`, `GoldPickup`, `CrackedFloor`, `HealthShard`, `LockedDoor`, `SecretWall`, `Spike`, `Switch`, `GrowingWall`) with `detachDisplayObject` to preserve non-destroy semantics.
- Replaced destroy-owning cleanup in `ItemDrop`, `ExitGlow`, `Boss01`, `Anvil`, and `LegRig` with `destroyDisplayObject`.
- Gameplay state transitions, callbacks, collision behavior, and item/drop data behavior unchanged. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Display lifecycle helper systems/renderers batch

- Normalized display cleanup in `UpdraftSystem`, `FluidSpawner`, `TileMutatorRenderer`, `WeatherSystem`, `WorldPullInTransitionController`, `ItemWorldGhostOverlay`, `Scene`, `CollisionDebugOverlay`, and `ParallaxBackground`.
- Normalized renderer/asset cleanup in `assetBundles`, `TilemapRenderer`, `LdtkRenderer`, and `ProceduralDecorator` while preserving texture/context destroy options.
- Pooling detach paths remain detach-only; renderer texture ownership and world transition state restoration behavior unchanged. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Display lifecycle helper FluidSystem batch

- Replaced direct body/drop graphics parent removal and destroy calls in `FluidSystem` with `destroyDisplayObject`.
- Preserved fluid body cell state, split/merge wave transfer, evaporation timing, and DEC-041 fluid foam CSV SSoT behavior; only display object teardown changed. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Container fluid paint helper sync

- Moved duplicated world/Item World BFS container-fluid splash painting into `paintContainerFluidCells()` in `scenes/shared/ContainerFluidHelpers.ts`.
- `WorldContainerFluidRuntime` and `ItemWorldContainerFluidRuntime` now keep only mode-specific magma ignition and flush policy; impact side effects/contact effects remain on existing shared helpers.
- Container fluid tile policy, dirty/flush behavior, camera shake, steam puff, acid exposure, and Item World active-bounds refresh behavior unchanged. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Pickup reward helper sync

- Moved duplicated gold/healing pickup reward feedback into `applyGoldPickupReward()` and `applyHealingPickupReward()` in `scenes/shared/PickupCollectionHelpers.ts`.
- `WorldPickupRuntime` keeps persisted pickup keys and collected-item registration; `ItemWorldPickupRuntime` keeps remove-on-collected handling, healing glow, and only-show-toast-when-healed behavior through explicit helper options.
- Localization key usage remains through `toast.hp_gain`; no player-facing text was added. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Movement VFX manager update helper sync

- Added `updateCommonMovementVfxManagers()` to `scenes/shared/MovementVfxHelpers.ts` for the overlapping World/Item World transient VFX manager update bundle.
- `WorldMovementVfxRuntime` now delegates common character-feedback manager updates through the helper while keeping `dropThroughDust` / `iceSkidStreak` late-update policy local.
- `ItemWorldMovementVfxRuntime` now delegates its common manager update bundle through the helper while preserving fluid residue update via the optional manager field and keeping player/enemy fluid feedback local.
- Projectile pair was rechecked; collection/collision/player-hit feedback is already shared and mode-specific deflect hitbox policy remains runtime-owned. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Spike player-hit feedback helper sync

- Confirmed scene/runtime `setTimeout` leftovers are non-gameplay lifecycle timers (audio chain, data load timeout, UI focus) and left them unchanged per roadmap rule.
- Added `applyPlayerSpikeHitFeedback()` to `scenes/shared/TileHazardRuntimeHelpers.ts` for the shared spike damage/flash/hitstop/last-safe-position reset bundle.
- `WorldSpikeRuntime` keeps entity-spike overlap policy plus gamepad rumble and death-hitstop behavior through optional helper callbacks.
- `ItemWorldStaticEntityRuntime` keeps tile-spike detection and static-entity orchestration local while using the shared spike feedback helper.
- Player spawn and prologue-end pairs were reviewed and intentionally left separate because their spawn/trigger/completion policies diverge. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Enemy contact damage helper sync

- Added `EnemyContactDamageHelpers.applyEnemyContactDamageForPlayer()` for the shared one-hit-per-frame enemy body-contact damage/feedback bundle used by LDtk World and Item World.
- `ItemWorldEnemyContactRuntime` now delegates its contact overlap and hit feedback to the shared helper.
- `WorldEnemyContactRuntime` delegates LDtk World body-contact damage to the shared helper while preserving the grounded-vibration predicate (`player.vy === 0`).
- Legacy `WorldScene` contact damage was reviewed and left unchanged because it is attack-state-gated and does not match the LDtk/Item World body-contact semantics. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - Static entity feedback helper sync

- Added `StaticEntityFeedbackHelpers` for shared cracked-floor shatter, switch activation, and gate unlock feedback bundles.
- `WorldCrackedFloorRuntime` and `ItemWorldStaticEntityRuntime` now share cracked-floor hitstop/flash/shake feedback while preserving World toast/style policy and each runtime's collision/list ownership.
- `WorldDoorSwitchInteractionRuntime` and `ItemWorldStaticEntityRuntime` now share switch/gate visual feedback while preserving World analytics, gamepad rumble, builder-grid refresh, and Item World door destroy/list removal policy.
- No localization keys were added; existing `toast.wall_destroyed`, `toast.floor_destroyed`, `toast.gate_opened`, `toast.gate_destroyed`, and `toast.switch_destroyed` usage remains SSoT-backed. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.


### 2026-06-05 - World enemy contact runtime seam

- Added `WorldEnemyContactRuntime` as the LDtk World owner for body-contact enemy damage orchestration.
- `LdtkWorldScene` now wires the runtime and calls it after projectile updates, preserving the existing update order and grounded-vibration predicate through `EnemyContactDamageHelpers`.
- `ItemWorldEnemyContactRuntime` remains the parallel Item World owner; both mode runtimes now share the contact-damage leaf helper while scene-local combat flow continues to own ordering. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.



### 2026-06-05 - World enemy scene-loop runtime seams

- Added `WorldEnemyCombatRuntime` as the LDtk World owner for player-attack-to-enemy hit resolution and attack-hit feedback while preserving locked-door attack blocking.
- Added `WorldEnemyUpdateRuntime` for the LDtk World enemy `update(dt)` iteration loop.
- Added `WorldEnemyRenderRuntime` for the LDtk World enemy `render(alpha)` iteration loop.
- `LdtkWorldScene` still owns runtime invocation order, render alpha resolution, defeated-enemy processing timing, projectile timing, and tile-hazard side effects. Verified with `npx tsc --noEmit` and `npm run build` from `game/`; build retains the existing LDtk atlas/prologue_01.png CSV warning only.

### 2026-06-05 - World fluid reaction runtime seam

- Added WorldFluidReactionRuntime as the LDtk World owner for FluidSystem arc scan/discharge callbacks and TileMutator steam/electric reaction callbacks.
- LdtkWorldScene now delegates fluid arc link scanning, arc discharge effects, steam/electric puffs, acid steam burst damage, and steam lift while keeping initialization timing and wall tile rerender invalidation local.
- Verified with 
px tsc --noEmit and 
pm run build from game/; build retains the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: WorldFluidReactionRuntime also owns FluidSystem.onEvaporated residue-drop handling, keeping LdtkWorldScene free of fluid reaction callbacks except wall-tile rerender invalidation.

- 2026-06-05: DisplayObject lifecycle cleanup pass closed remaining direct removeChild usage outside DisplayObjectLifecycleHelpers by routing SceneManager, EndingSequence, entity flash/particle/icon cleanup, and UI/inventory clear paths through detachDisplayObject/destroyDisplayObject. Validation: rg .removeChild shows only helper internals; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Removed remaining simple pass-through private getters from EgoShardRuntime and WorldBuilderPlayerCollisionRuntime; left computed/localization getters in ProceduralDecorator, InventoryUI, and FeedbackPanel intact because they are not scene ownership pass-throughs. Validation: npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Promoted WorldFluidReactionRuntime to shared FluidReactionRuntime and wired both LdtkWorldScene and ItemWorldScene through it. ItemWorldScene's direct fluid reaction callback block was reduced to shared bind plus wall-tile invalidation. Validation: rg shows fluid reaction callbacks centralized in shared runtime; npm run build passes with the existing V3 prologue_01 atlas warning.

- 2026-06-05: ItemWorldBreakablePropRuntime now owns breakable prop per-frame sway updates via shared updateBreakableProps; ItemWorldScene calls breakablePropRuntime.update(dt) instead of directly looping staticEntityRegistry.breakableProps. Validation: rg confirms the scene loop is gone; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Legacy WorldScene now delegates enemy rendering to shared renderEnemies; update/death/drop/contact loops remain scene-local because they combine spawn, analytics, damage, and removal side effects. Validation: rg confirms the direct render loop is gone; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Legacy WorldScene cleanup now delegates enemy/projectile/drop/portal/altar clearing to shared EnemyRegistryHelpers and EntityLifecycleHelpers instead of local destroy loops. Validation: rg confirms the cleanup loops are gone; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: DisplayObjectLifecycleHelpers gained detachAndClearDisplayObjects for array detach+clear patterns; legacy WorldScene door marker cleanup now uses it instead of a local detach loop. Validation: rg confirms the local doorMarkers loop is gone; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Legacy WorldScene now uses shared collectPendingGhostProjectiles instead of directly reading Ghost.pendingProjectiles. Validation: rg confirms WorldScene no longer references pendingProjectiles; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Legacy WorldScene now delegates projectile update/removal to shared updateProjectileCollection, with player-hit side effects isolated in tryHitPlayerWithProjectile. Validation: rg confirms the direct projectiles loop is gone; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Legacy WorldScene active melee enemy damage now delegates to shared EnemyMeleeAttackDamageHelpers.applyEnemyMeleeAttackDamageForPlayer; the scene supplies the Skeleton/GoldenMonster active-attack predicate while helper owns overlap, damage, hitstop, shake, flash, and hit spark feedback. Validation: rg confirms the direct enemy attack loop is gone; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Player attack hit feedback now uses shared PlayerAttackHitFeedbackHelpers across legacy WorldScene, WorldEnemyCombatRuntime, and ItemWorldEnemyCombatRuntime; target selection/checkHits remains runtime-local, milestone 100 remains enabled only where it previously existed. Validation: rg confirms local hit feedback loops are gone; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Legacy WorldScene item-drop collection now delegates update/removal to shared processPickupsForPlayerCollection using ItemDropEntity.overlapsPlayer as the custom proximity check. PickupCollectionHelpers now supports false-return onPickup to keep pickups when collection fails, and optional width/height for custom proximity users. Validation: rg confirms the direct drops loop is gone; npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

- 2026-06-05: Legacy WorldScene room-clear check now uses shared countAliveEnemies instead of local enemies.filter(...).length; combat target filtering remains local. Validation: npx tsc --noEmit and npm run build pass with the existing V3 prologue_01 atlas warning.

## 2026-06-05: Legacy WorldScene minimap extraction

- `WorldScene.drawMiniMap()` now delegates legacy minimap cell/edge rendering to `@scenes/shared/WorldMiniMapHelpers.ts`.
- `drawLegacyWorldMiniMap(...)` centralizes grid-cell color/exploration/adjacency logic and keeps current-room and connection-line visuals unchanged.

## 2026-06-20: Legacy WorldScene door-transition extraction

- `WorldScene.checkDoorTriggers()` now delegates room-bound transition candidate resolution to `@scenes/shared/WorldTransitionHelpers.findDoorTransitionCandidate(...)`.
- Scene now owns only transition state transitions (`fade_out`, `transitionTimer`, `pendingDirection`, `currentCol`, `currentRow`) after shared overlap/neighbor validation.

- 2026-06-05: InventoryRefreshDisplay now owns full InventoryUI redraw orchestration across chrome/grid/info/anvil/right-column helpers. InventoryUI.refresh() keeps field persistence only and no longer carries private draw wrapper methods.

- 2026-06-05: PauseMenuPulse now owns the shared pause-menu selection pulse alpha/redraw helper. PauseMenu keeps modal active state and timers while default/confirm/preset/settings/audio pulse drawing delegates to redrawPauseMenuPulse().

- 2026-06-05: PauseMenuBasePanel now owns base pause overlay/panel/title/menu label/chevron/default pulse graphics construction. PauseMenu keeps state, navigation, fullscreen label refresh, modal orchestration, and pulse timing.

- 2026-06-05: HudSkinKeyPromptDisplay now owns skin-mode HUD key prompt sprite/text placement plus flask icon metrics and item-key pulse centers. HUD.applySkin() keeps skin lifecycle and field storage only for that block.

- 2026-06-05: PauseMenuAudio now owns shared 10% snapped audio-volume adjustment for both immediate AudioBus rows and SettingsData rows. PauseMenu delegates standalone audio sub-modal adjustment through adjustAudioRowVolume() and keeps saveAudio persistence timing.

- 2026-06-05: GoldPickupSpawnHelpers now binds collision grids through GoldPickup.enableTerrainPhysics() instead of direct roomData writes, keeping burst terrain-physics setup behind the entity API while leaving scene-owned roomData seams unchanged.

- 2026-06-05: DeferredFocus centralizes the remaining FeedbackPanel zero-delay hidden-textarea focus deferrals. This keeps the UI focus timer escape hatch explicit and separate from gameplay lifecycle timers.

- 2026-06-05: EffectNumeric now owns visual-effect scoped clampEffect01(). EchoPlayer, ItemWorldTransitionController, PortalRingEffect, RealityPeelingEffect, TransitionOverlay, and WeaponPulse use it for direct 0..1 visual progress/alpha/intensity clamps while scene NumericHelpers remain scene-scoped.

- 2026-06-05: Extracted skin-mode HUD static frame/fill construction into game/src/ui/hud/HudSkinFrameDisplay.ts, leaving HUD.applySkin() to store returned handles and manage redraw/layout lifecycle.

- 2026-06-05: Extracted repeated pause sub-modal mount/destroy handling into game/src/ui/pause/PauseMenuModalLifecycle.ts; confirm, preset, settings, and audio modals now share the same panel replacement and pulse reset lifecycle.

- 2026-06-05: Replaced helper-side enemy.roomData/enemy.target and player.roomData writes with Enemy.bindSpawnContext(...) and Player.bindCollisionGrid(...); scene-owned oomData seams remain unchanged.

- 2026-06-05: Routed small remaining effect-local 0..1 clamps in game/src/effects/FluidResidue.ts and game/src/effects/RimLightFilter.ts through clampEffect01(...); left larger local easing/color helpers for intentional later normalization.

- 2026-06-05: Replaced game/src/effects/VoidDrop.ts local fog-alpha clamp01 with shared clampEffect01(...), keeping the effect-specific phase/easing logic local.

- 2026-06-05: Replaced game/src/effects/WorldPullIn.ts local visual clamp01 with shared clampEffect01(...), while keeping effect-specific easing and smoothstep logic local.

- 2026-06-05: Replaced game/src/effects/ExitGlow.ts local visual clamp01 with shared clampEffect01(...); kept generic min/max clamp(...) local because it is not 0..1-specific.

- 2026-06-05: Replaced game/src/effects/ItemWorldEntrySequence.ts local growth-progress clamp01 with shared clampEffect01(...); official entry state machine and stream/collision callbacks stay unchanged.

- 2026-06-05: Replaced game/src/effects/WeatherSystem.ts local 0..1 density/intensity clamp01 with shared clampEffect01(...); kept generic range clamp(...) local for wind/non-0..1 bounds.

- 2026-06-05: Replaced game/src/effects/ItemWorldGhostOverlay.ts local scale-birth/tint clamp01 with shared clampEffect01(...); ghost overlay geometry, reveal queue, and collision stamping stay unchanged.

- 2026-06-05: Replaced game/src/effects/ItemWorldForgeBirth.ts local formation/shard-progress clamp01 with shared clampEffect01(...); forge-birth shard timing, paths, and grid preview generation stay unchanged.

- 2026-06-05: Replaced the single game/src/effects/FluidSystem.ts 0..1 ambient spring size-factor clamp with clampEffect01(...); DEC-041 crest foam SSoT and separated foam manager behavior stay unchanged.

- 2026-06-05: Continued R5 display lifecycle cleanup by routing EchoPlayer optional sprite/aura teardown through destroyNullableDisplayObject. Texture cleanup remains direct destroy(true) because generatedTexture is not a display object.

- 2026-06-05: Continued R5 display lifecycle cleanup for ItemWorldForgeBirth replaceable sprites and StratumClearOverlay particle graphics. Kept texture destroy(true) and owner-specific ItemImage.destroy() calls out of display helper scope.

- 2026-06-05: Continued R5 display lifecycle cleanup for Building optional sprite, Anvil/Altar/ItemDisplay particle graphics, and ItemWorldGrowthSnapshotController replacement item sprite. Kept render texture, filter, and custom owner destroy calls outside display helper scope.

- 2026-06-05: Continued R5 display lifecycle cleanup for WeatherSystem splash-pool overflow sprites. Confirmed remaining direct destroy calls in inspected files are custom entity/runtime, texture, or filter ownership boundaries rather than display-helper candidates.

- 2026-06-05: Continued R4 PauseMenu decomposition by adding mountPauseModalPanelAndApply() to PauseMenuModalLifecycle and routing confirm/preset/settings/audio modal mount-result assignment through it. Modal content and selection/persistence state remain owned by existing helpers/PauseMenu.

- 2026-06-05: Continued R4 PauseMenu decomposition by adding destroyPauseModalPanelAndApply() and routing confirm/preset/settings/audio sub-modal destroy-and-field-reset paths through PauseMenuModalLifecycle. Active flags, suppression policy, and settings state remain in PauseMenu.ts.

- 2026-06-05: Continued R4 HUD decomposition by removing the HUD.drawVignette() pass-through wrapper; the update loop now calls drawHudDamageVignette(...) directly while HudDamageVignetteDisplay remains the owner of edge redraw geometry.

- 2026-06-05: Continued R4 HUD decomposition by removing the HUD.updateSkinHpFill() pass-through wrapper; edrawHpBar() now calls updateSkinHudHpFill(...) directly while HudHpBarDisplay remains the owner of skin HP mask geometry.

- 2026-06-05: Continued R4 PauseMenu decomposition by removing confirm/preset/settings/audio one-line pulse redraw wrappers; PauseMenu.ts now calls edrawPauseMenuPulse(...) directly for modal pulses while PauseMenuPulse remains the display-only pulse owner.

- 2026-06-05: Continued R4 PauseMenu decomposition by removing the default selection edrawSelectionPulse() wrapper; all pause selection/modal pulse redraws now call edrawPauseMenuPulse(...) directly while PauseMenuPulse remains display-only.

- 2026-06-05: Continued R4 HUD decomposition by removing the HUD.redrawEgoShards() one-line wrapper; constructor and setEgoShards() now call drawEgoShards(...) directly while HudStatusIndicators remains the display-only indicator owner.

- 2026-06-05: Continued R4 HUD decomposition by removing the HUD.redrawBurnIcon() one-line wrapper; the burn-status update loop now calls drawBurnIcon(...) directly while setBurnStatus() keeps visibility/clear policy and HudStatusIndicators remains the icon geometry owner.

- 2026-06-05: Continued R4 HUD decomposition by removing the HUD.redrawBossBar() one-line wrapper; showBossHP() and updateBossHP() now call drawHudBossHpBar(...) directly while HudBossHpDisplay remains the boss bar geometry owner.

- 2026-06-05: Continued R4 HUD decomposition by moving flask redraw orchestration into HudFlaskDisplay.redrawHudFlasks(...); HUD.redrawFlask() now only passes HUD state and stores returned skin icon handles, while skin/fallback flask rendering remains display-helper owned.

- 2026-06-05: Continued R4 HUD decomposition by moving depth gauge pulse alpha/shimmer updates into HudDepthGaugeDisplay.updateHudDepthGaugePulse(...); HUD.update() now keeps only timer storage and redraw orchestration for the depth gauge.

- 2026-06-05: Continued R4 HUD decomposition by moving Item EXP bar ATK-relative position calculation into HudItemExpDisplay.redrawHudItemExpBar(...); HUD.redrawExpBar() now only passes HUD state and the ATK text anchor while the EXP display helper owns layout/redraw details.

- 2026-06-05: Continued R4 HUD decomposition by moving HP bar redraw plus skin-fill synchronization into HudHpBarDisplay.redrawHudHpBar(...); HUD.redrawHpBar() now only passes HP state and skin fill handles while graphics/skin fill redraw orchestration stays helper-owned.

- 2026-06-05: Continued R4 HUD decomposition by moving HP bar ghost/heal/low-HP timer advance and redraw-needed calculation into HudHpBarDisplay.advanceHudHpBarTimers(...); HUD.update() now only stores returned timer state and redraws when the helper reports a display change.

- 2026-06-05: Continued R4 PauseMenu decomposition by moving default cursor row positioning, chevron placement, label highlight/dim state, and default pulse redraw into PauseMenuBasePanel.updatePauseMenuCursor(...); PauseMenu.ts keeps selected index and pulse timer state only for the base menu cursor.

- 2026-06-05: Continued R4 PauseMenu decomposition by moving base selection pulse suppression alpha into PauseMenuBasePanel.setPauseMenuBaseSelectionPulseSuppressed(...); PauseMenu.ts now delegates the base menu pulse visibility state while retaining modal-active policy decisions.

- 2026-06-05: Continued R4 PauseMenu decomposition by adding PauseMenuModalLifecycle.mountPauseModalPanelAndRedraw(...); confirm, preset, settings, and audio draw paths now share sub-modal mount plus initial pulse redraw, while PauseMenu.ts keeps modal policy and field assignment.

- 2026-06-05: R4 PauseMenu per-modal pulse update duplication reduced via `PauseMenuPulse.advancePauseMenuPulse`; modal timer fields remain scene-owned in `PauseMenu.ts` while helper owns active/gfx gating and redraw.

- 2026-06-05: R4 PauseMenu base cursor wrapper removed; `PauseMenuBasePanel.advancePauseMenuBaseCursor` now combines base pulse timer advance with cursor redraw while `PauseMenu.ts` keeps only selected index/timer fields.

- 2026-06-05: R4 InventoryUI visibility transition wrappers removed; `InventoryVisibilityStatePolicy.applyBoundInventoryVisibilityTransition` now owns read/apply/write orchestration while `InventoryUI` remains the field owner.

- 2026-06-05: R4 PauseMenu selection suppression wrapper removed; modal show/hide code now calls the base panel suppression helper directly.

- 2026-06-05: R4 InventoryUI visibility binding duplication reduced; `open`/`close` now share one `visibilityTransitionStateBinding` while transition application remains in `InventoryVisibilityStatePolicy`.

- 2026-06-05: R4 HUD flask redraw wrapper removed; `HUD.updateFlask` now calls `HudFlaskDisplay.redrawHudFlasks` directly while preserving `skinFlaskIcons` ownership in `HUD.ts`.

- 2026-06-05: ItemWorldScene compile-surface/pass-through cleanup continued. Removed scene-local room state/spawn, flow-state, updraft/absorb, and Ego dialogue forwarding methods; callers now use the owning runtimes directly. Re-aligned ItemWorldScene constructor save-access injection, getCollisionGrid runtime deps, world container registry access, and InventoryVisibilityStatePolicy binding types. Verification: npx tsc --noEmit and npm run build passed; build retains the existing LDtk atlas/prologue_01.png CSV warning only.
- 2026-06-05: ItemWorldScene boss metadata cleanup completed. Replaced direct `(enemy as any)._isBoss` / `_portalSpawned` access with `EnemyMetadata` helpers (`isBossEnemy`, `wasPortalSpawned`, `setPortalSpawned`) in the boss-clear trapdoor path. Verification: `npx tsc --noEmit` and `npm run build` passed; build retains the existing LDtk atlas/prologue_01.png CSV warning only.
- 2026-06-05: ItemWorldScene gameplay timer migration completed. Wired `ItemWorldBossClearRuntime` into `ItemWorldScene` update/exit/destroy and moved entry-dialogue delay plus boss-clear follow-up/trapdoor spawn delays off `setTimeout()` into dt-driven runtime scheduling. `ItemWorldBossClearRuntime.start()` preserves the previous absolute 160ms follow-up and 2500ms trapdoor timing. Verification: `rg -n "setTimeout\(" game/src/scenes/ItemWorldScene.ts` has no matches; `npx tsc --noEmit` and `npm run build` passed with the existing LDtk atlas/prologue_01.png CSV warning only.
- 2026-06-05: ItemWorldScene player collision-grid binding cleanup completed. Replaced the remaining direct `this.player.roomData = ...` scene writes with `bindPlayerCollisionGrid(...)` while leaving scene-owned `this.roomData = ...` ownership seams intact. Verification: `rg -n "\.roomData\s=" game/src/scenes/ItemWorldScene.ts game/src/scenes/LdtkWorldScene.ts game/src/scenes/WorldScene.ts game/src/scenes/shared` now shows only scene-owned roomData assignments; `npx tsc --noEmit` and `npm run build` passed with the existing LDtk atlas/prologue_01.png CSV warning only.
- 2026-06-05: ItemWorld breakable prop update ownership cleanup completed. `ItemWorldScene` now calls `ItemWorldBreakablePropRuntime.update(dt)` instead of directly iterating `staticEntityRegistry.breakableProps`, leaving sway-update ownership in the existing runtime/shared `updateBreakableProps(...)` path. Verification: `rg` confirms the scene-local breakable prop update loop is gone; `npx tsc --noEmit` and `npm run build` passed with the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: ItemWorldScene fluid reaction ownership cleanup completed. ItemWorldScene now binds shared FluidReactionRuntime for evaporation residue, arc scan/discharge, steam/electric puffs, acid steam burst damage, and steam lift; the scene keeps only wall-tile invalidation local. Verification: npx tsc --noEmit and npm run build passed with the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: ItemWorldBossClearRuntime now owns defeated-boss consume/portal-spawned metadata gating through consumeDefeatedBoss(...). ItemWorldScene keeps boss-clear rewards, persistence, trapdoor placement, and dialogue side effects, but no longer directly scans enemy metadata for the boss-clear gate. Verification: npx tsc --noEmit and npm run build passed with the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: ItemWorldScene cleanup lifecycle paths now route direct HUD/lore/area-title/screen-flash detach calls through DisplayObjectLifecycleHelpers.detachDisplayObject(...). Verification: rg .removeChild across scene/UI/shared targets now shows only helper internals; npx tsc --noEmit and npm run build passed with the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: R4 PauseMenu modal pulse update duplication reduced further. PauseMenuPulse now exposes advancePauseMenuPulseStates(...) so PauseMenu.update() advances confirm/preset/settings/audio modal pulse timers through one shared helper while retaining modal field ownership in PauseMenu. Verification: npx tsc --noEmit and npm run build passed with the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: R5 non-gameplay timeout escape hatches centralized. Added core/AsyncTimeout.raceWithTimeout(...) and routed boot font loading plus asset prewarm timeout races through it. Remaining direct timers are intentional audio chaining/civ ambient timers and DeferredFocus zero-delay focus deferral. Verification: rg setTimeout over main/data/core/audio/DeferredFocus confirms the boundary; npx tsc --noEmit and npm run build passed with the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: Parallel runtime review pass: ContainerCarry and Pickup pairs were rechecked against current code. ContainerCarry already shares state/tether helpers, while World/ItemWorld prompt and lifecycle policy remain intentionally mode-owned. Pickup already shares collection and reward helpers, while World persisted-key handling and ItemWorld healing feedback/removal ordering remain intentionally mode-owned. No additional merge applied.

- 2026-06-05: Projectile pair sync continued. ProjectileCollisionHelpers now owns tryHitPlayerWithProjectile(...) for shared player projectile-hit guard, AABB overlap, feedback, and projectile kill semantics. WorldProjectileRuntime and ItemWorldProjectileRuntime keep only mode-specific deflect hitbox policy. Verification: npx tsc --noEmit and npm run build passed with the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: Parallel runtime review pass continued. PlayerSpawn pair remains intentionally separate: WorldPlayerSpawnRuntime owns LDtk edge/default spawn and safe-position recording, while ItemWorldPlayerSpawnRuntime owns stratum LDtk spawn capture plus room floor fallback; both use PlayerPlacementHelpers where behavior matches. Weather pair remains intentionally separate: WeatherRuntimeHelpers already owns attach/update/destroy/collision predicate, while World LDtk Weather parsing/dynamic colliders and Item World palette/temperament profile selection stay mode-owned. EgoShard Cast/Combat/Projectile wrappers are already shared adapters; Impact already shares leaf impact/debug helpers with mode-owned side effects.

- 2026-06-05: Parallel runtime review pass continued for ProceduralDecor, TileHazard, PrologueEnd, and EgoDialogue. ProceduralDecor already shares layer attach/detach helpers but generation timing/theme/density/fire registration remain mode-owned. TileHazard already shares player/enemy/waterfall hazard feedback helpers; Item World burnable/breakable cleanup remains local because ash/removal/static-entity side effects differ from World runtimes. PrologueEnd and EgoDialogue remain intentionally separate due to different trigger sources, sequence phases, and dialogue state policies.

- 2026-06-05: Removed the remaining concrete TitleScene constant dependency from WorldIntroHandoffRuntime. TITLE_FADE_OVERLAY_LABEL now lives in scenes/shared/TitleHandoffLabels.ts and both TitleScene plus WorldIntroHandoffRuntime import the shared label. Verification: scene import scan now shows only ItemWorldSceneLike flow-contract type references; npx tsc --noEmit and npm run build passed with the existing LDtk atlas/prologue_01.png CSV warning only.

- 2026-06-05: Legacy WorldScene projectile player-hit path now uses ProjectileCollisionHelpers.tryHitPlayerWithProjectile(...). The helper gained options to preserve legacy behavior (no HUD flash, no lastDamageSource write, non-floored damage) while World/ItemWorld projectile runtimes keep their existing defaults. Verification: npx tsc --noEmit and npm run build passed with the existing LDtk atlas/prologue_01.png CSV warning only.

## 2026-06-05 Completion Audit

- Status: planned refactor slices are complete against the current worktree. Older Remaining/Candidate lines above are superseded by the progress and audit notes appended below them.
- R1 LdtkWorldScene: builder orchestration is runtime-owned by WorldBuilderFlowRuntime; named builder helper candidates are now runtime calls, not scene-local implementations. Terrain/door/frozen-return/return-fade seams are already behind WorldTileHazardRuntime, WorldDoorSwitch* runtimes, WorldBossLockRuntime, WorldFrozenReturnRuntime, WorldItemWorldSceneFlowRuntime, and related return/deployment runtimes; remaining scene callbacks are composition, collision-grid, or tilemap-rerender ownership seams.
- R2 ItemWorldScene: entry, room/progress, trapdoor, boss-clear timing/gating, fluid reaction, breakable update, player binding, and return/exit flow cleanup are runtime-owned where behavior matched. Remaining roomData assignments are scene-owned collision-grid seams. Manual trapdoor activation per DEC-039 remains intact.
- R3 parallel runtimes: reviewed and either shared leaf helpers/adapters were applied or mode-specific policy was intentionally left local. Projectile player-hit handling is shared across World, ItemWorld, and legacy WorldScene with behavior-preserving options. EgoShard wrappers use shared adapters; container, pickup, weather, movement VFX, procedural decor, tile hazard, player spawn, prologue end, and dialogue pairs have documented mode-owned differences.
- R4 UI decomposition: HUD/InventoryUI/PauseMenu rendering, visibility, interaction, pulse, modal lifecycle, and display helpers are split across ui subfolders. Inventory anvil-mode decisions are constrained to InventoryUI and inventory policy/display helpers; external scene-level callers use InventoryUI public methods/events.
- R5 escape hatches: exact scans show no true as-any casts or TODO/FIXME in game/src. Direct removeChild remains only inside DisplayObjectLifecycleHelpers. Enemy private metadata is contained in EnemyMetadata helpers. Gameplay setTimeout chains were removed; remaining direct timers are AsyncTimeout, audio scheduling, and DeferredFocus zero-delay focus deferral.
- Validation evidence: latest required code validation passed with npx tsc --noEmit and npm run build from game/. Build retains only the known LDtk atlas/prologue_01.png CSV warning.

- 2026-06-05: Fixed anvil dive input regression from Inventory attack-input policy extraction. Anvil mode ATTACK must still call InventoryUI.confirmSelected(): first press places the selected item on the anvil, second press confirms dive and invokes the anvil onSelect callback. Inventory mode keeps returning confirmed_equipment_change for equipment swap side effects. Verification: npx tsc --noEmit and npm run build passed with the existing LDtk atlas/prologue_01.png CSV warning only.
