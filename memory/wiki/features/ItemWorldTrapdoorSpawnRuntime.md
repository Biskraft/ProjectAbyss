# ItemWorldTrapdoorSpawnRuntime

- `game/src/scenes/itemworld/ItemWorldTrapdoorSpawnRuntime.ts` owns boss-clear trapdoor spawn positioning and final-layer decisioning for Item World.
- It receives a minimal readonly collision-grid dependency set:
  - unified collision grid
  - presence check for existing trapdoor
  - final-depth room predicate
- It resolves a `TrapdoorSpawnSnapshot` from a boss death position by:
  - finding the boss cell column/row in the active unified map
  - probing downward within the same room for the first wall tile as floor candidate
  - clamping X inside the room bounds
  - deciding whether boss clear should route to `FloatingItemDrop` (`descentToWorld=true`) or normal `Trapdoor`.
- Scene now consumes the snapshot in `ItemWorldScene.spawnTrapdoorAfterBossClear(...)` and keeps concrete spawn side-effects (entity construction, HUD toast, dialogue prompts) in scene scope.

## Why

- This removes hardcoded room/tile math from the scene update loop and aligns Item World boss-clear flow to `ItemWorldBossClearRuntime` + `ItemWorldTrapdoorFlowRuntime` ownership boundaries.
