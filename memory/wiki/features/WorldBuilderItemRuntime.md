# WorldBuilderItemRuntime

`game/src/scenes/world/WorldBuilderItemRuntime.ts` owns LDtk world Giant Builder-mounted `Item` entity parsing and attachment.

Current state:

- `spawnIfItem(builderLevelId, builder, entity)` handles only builder-level `Item` entities and returns whether the entity was consumed.
- It preserves the builder item key format `${builderLevelId}:${localX},${localY}` and uses the shared collected-item set callbacks for skip/mark behavior.
- `sword_broken` remains a special consumed-only builder item; it is marked collected and does not spawn an `ItemDropEntity`.
- Actual fixed item creation is delegated to `WorldFixedItemSpawnRuntime.spawn()` so builder-mounted, hand-placed, and secret-wall item rewards share the same master-item lookup and fallback policy.
- The runtime compares item drop / gold / healing pickup counts before and after spawning, then attaches the newest spawned entity to the active `GiantBuilder` through `WorldBuilderAttachmentRuntime`.
- Item drops keep the old 8px lifted local Y correction so their bottom-center pivot does not appear buried after builder reparenting.

Prevention rules:

- Do not reintroduce builder `Item` parsing, `Content_Item_Master` lookup, or builder item attachment snapshots in `LdtkWorldScene.spawnBuilderEntities()`.
- Keep builder `Item` attachment liveness tied to the owning item-drop / pickup runtime membership checks.
- `WorldBuilderStaticEntityRuntime` owns builder `Spike`, `Breakable`, and `CollapsingPlatform` construction; `WorldBuilderDoorSwitchRuntime` owns builder `LockedDoor` and `Switch` construction; `WorldBuilderEntranceRuntime` owns builder entrance glow attachment; `WorldAnvilSpawnRuntime` owns builder `Anvil` construction and attachment.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
