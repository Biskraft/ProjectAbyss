# DEC-042: Official Runtime Collision Scope

- **Date:** 2026-06-02
- **Status:** Accepted / In progress
- **Branch:** `official/stage-1`
- **Context:** Official-release refactor after `vertical-slice` / `vslice-1.0` was preserved.

## Decision

Temporary collision changes for official Item World entry must be owned by a scoped runtime transaction instead of ad hoc scene fields.

`game/src/level/RuntimeCollisionScope.ts` is the first official boundary:

- It snapshots the existing `number[][]` grid.
- It mutates the same grid object in place so `Player`, enemies, fluids, and debug overlays keep their references.
- It can clear the existing world to air, extend rows/columns, stamp streamed Level 36 cells, and restore the exact previous grid.

`game/src/scenes/world/ItemWorldEntryStreamRuntime.ts` owns official Level 36 stream geometry:

- ghost room placement from the anvil/item origin,
- LDtk `Player` entity start resolution,
- fallback air-over-support start resolution,
- projected player start during the growth zoom.

`game/src/effects/ItemWorldEntrySequence.ts` owns the official growth-entry state machine:

- anticipation,
- captured-world growth,
- Level 36 stream preparation/loading callbacks,
- immediate movement unlock after stream activation,
- final fade into `ItemWorldScene`.

`game/src/scenes/world/ItemWorldGrowthSnapshotController.ts` owns the captured-world growth visual:

- background/world RenderTexture capture,
- placed-item sprite overlay,
- temporary source-visual hiding/restoration,
- 1x -> 64x growth scale and growth projection data for player movement.

`game/src/scenes/world/ItemWorldGhostStreamOverlay.ts` and `ItemWorldGhostCollisionRuntime.ts` own Level 36 stream overlay construction and stream collision lifetime:

- item/LDtk-grid overlay creation, placement, shard source, and entrance AABB,
- streamed grid row/column extension,
- camera bounds extension/restoration,
- ghost collision stamping and restore for non-scoped legacy paths.

`game/src/scenes/world/ItemWorldEntryPreloader.ts` and `ItemWorldEntryPushTransition.ts` own the non-gameplay entry support path:

- item-world bundle/theme/template/authored-tileset prestreaming,
- duplicate prestream task coalescing by item theme,
- black overlay fade around `ItemWorldScene` push and reveal.

`game/src/scenes/world/WorldItemWorldSceneFlowRuntime.ts` owns the common scene-flow layer above those helpers:

- prestream delegation,
- `ItemWorldScene` construction and tutorial/Ego event hydration,
- prepared-scene push closure,
- common procedural Item World return handling.

`game/src/scenes/world/WorldCollisionGridRuntime.ts` owns the LDtk world runtime grid clone boundary:

- room load / room-state restore clone LDtk `level.collisionGrid` through this runtime,
- active gameplay systems still receive the same `number[][]` grid contract through `LdtkWorldScene`,
- broad grid replacement APIs are intentionally not exposed.

`game/src/scenes/world/WorldItemDeploymentCollisionRuntime.ts` owns the active Item World deployment `RuntimeCollisionScope`:

- `WorldItemDeploymentTunnelFlowRuntime` decides when the anvil deployment tunnel flow clears and restores the scope,
- the runtime owns direct scope construction/storage and exact snapshot restoration,
- `LdtkWorldScene` should not keep its own `itemDeploymentCollisionScope` field.

`game/src/scenes/world/WorldItemDeploymentTunnelFlowRuntime.ts` owns the Item World deployment tunnel flow:

- tunnel opening orchestration,
- ghost overlay teardown and collision restore,
- world deployment collision clear/restore timing,
- player `roomData` reassignment after clear/restore,
- tile rerender timing after restore,
- deployment tunnel visual restoration.

`game/src/effects/ItemDeploymentController.ts` is now a compatibility facade. It re-exports `ItemWorldEntrySequence` as `ItemDeploymentController`, exports deployment option types, and re-exports the preserved `LegacyLaserItemDeploymentController` from its own legacy file. New official call sites should import/use `ItemWorldEntrySequence` directly.

## Why

The vertical-slice Item World entry repeatedly regressed because `LdtkWorldScene` directly mixed:

- authored overworld collision,
- temporary tunnel clears,
- full-world air masking,
- streamed `ItemStratum_Level_36` collision,
- ghost extension row growth,
- visual tile reveal timing.

Official release code should not make each effect remember how to undo its own collision edits. The scene may still orchestrate the sequence, but collision lifetime belongs to a runtime collision scope.

## Rules

- Do not replace the scene grid object while gameplay systems are running.
- Do not delay Level 36 collision behind visual reveal.
- Do not add hidden fallback platforms or backstop walls to the official anvil entry path.
- Future refactors should move more direct `collisionGrid` mutations behind named scopes or level-local adapters.
- Keep Level 36 placement/player-start math out of `LdtkWorldScene`; the scene may supply data and render, but runtime geometry belongs to `ItemWorldEntryStreamRuntime`.
- Keep the official anvil growth flow in `ItemWorldEntrySequence`; `ItemDeploymentController.ts` is no longer the owner of the official sequence.
- Keep captured-world RenderTexture lifecycle and source-visual hiding out of `LdtkWorldScene`; use `ItemWorldGrowthSnapshotController`.
- Keep Level 36 ghost overlay construction and stream collision/camera restore logic in the world helper modules instead of adding new row-length or restore-cell state to `LdtkWorldScene`.
- Keep Item World entry asset warming in `ItemWorldEntryPreloader` and scene-push overlay fading in `ItemWorldEntryPushTransition`; `LdtkWorldScene` should only call those boundaries.
- Keep common ItemWorldScene creation/push/return handling in `WorldItemWorldSceneFlowRuntime`; do not add scene-local `createItemWorldScene()`, `completeItemWorldSceneReturn()`, or `pushPreparedItemWorldScene()` helpers back to `LdtkWorldScene`.
- Keep preserved laser behavior in `LegacyLaserItemDeploymentController.ts`; do not grow `ItemDeploymentController.ts` back into an implementation file.
- Keep Item World deployment scope construction/storage in `WorldItemDeploymentCollisionRuntime`; scene code may orchestrate timing but should not store `RuntimeCollisionScope` directly.
- Keep anvil deployment tunnel clear/restore ordering in `WorldItemDeploymentTunnelFlowRuntime`; do not add scene-local tunnel/ghost/collision restore helpers back to `LdtkWorldScene`.

## Verification

- `npx tsc --noEmit` from `game/` passed.
- `npm run build` from `game/` passed with only existing asset/chunk warnings.
- Dev-server browser smoke at `http://127.0.0.1:5178/play/?debug=1` returned HTTP 200, one 640x360 canvas, and no hard browser errors. The only 404 was `favicon.ico`.
