# WorldBuilderSpawnerRuntime

`game/src/scenes/world/WorldBuilderSpawnerRuntime.ts` owns LDtk `BuilderSpawner` field parsing and route config calculation.

Invariants:

- The runtime owns `BuilderLevelId`, `Anchor`, offset, route Y positions, route timing, loop/autostart, camera-shake, run-once, replay, and decorator insertion parsing.
- `LdtkWorldScene` still owns `GiantBuilder` construction, active-builder assignment, builder entity dispatch, grass registration, and persistence runtime wiring. `WorldBuilderItemRuntime` owns builder-mounted `Item` spawning; `WorldBuilderStaticEntityRuntime` owns builder-mounted `Spike`, `Breakable`, and `CollapsingPlatform` spawning; `WorldBuilderDoorSwitchRuntime` owns builder-mounted `LockedDoor` and `Switch` spawning; `WorldBuilderEntranceRuntime` owns builder entrance glow attachment; `WorldAnvilSpawnRuntime` owns builder-mounted `Anvil` spawning; `WorldBuilderSpriteRuntime` owns visual-only `BuilderSprite` rendering.
- `readLevelId()` is called before loading the builder level; `resolveConfig()` needs both host and builder levels so `RightWall` anchoring can use the builder width.
- `shouldBuildRoute()` preserves the old priority: autostart plus either saved state or first unplayed/no-saved-position spawn.
- Route points are created as start/end Y positions with their authored wait times.
- Do not reintroduce generic `readStringField()`, `readNumberField()`, or `readBoolField()` helpers to `LdtkWorldScene` for BuilderSpawner parsing.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
