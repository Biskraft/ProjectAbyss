# WorldBuilderStaticEntityRuntime

`game/src/scenes/world/WorldBuilderStaticEntityRuntime.ts` owns LDtk world Giant Builder-mounted static gameplay entity creation and attachment.

Current state:

- `spawnIfStaticEntity(builderLevelId, builder, entity)` handles builder-level `Spike`, `Breakable`, and `CollapsingPlatform` entities and returns whether the entity was consumed.
- Builder spikes are added to `WorldSpikeRegistry` and attached with `WorldBuilderAttachmentRuntime.attachWorldPositioned()`, so `WorldSpikeRuntime.checkContact()` continues to handle contact policy.
- Builder breakables preserve authored `Sprite` parsing with `SignBoard_Save` fallback, register through `WorldBreakableRegistry`, and use `attachSizedWorldPositioned()` so the centered visual and bottom-left gameplay AABB stay aligned.
- Builder collapsing platforms preserve the `cplat_${builderLevelId}_${localX}_${localY}` persistence key, inject collision into `builder.collisionGrid`, register through `WorldCollapsingPlatformRegistry`, and use the existing runtime update/collapse policy.
- `WorldBuilderDoorSwitchRuntime` owns builder `LockedDoor` and `Switch` cases; `WorldBuilderEntranceRuntime` owns builder entrance glow attachment; `WorldAnvilSpawnRuntime` owns builder `Anvil` construction and attachment.

Prevention rules:

- Do not reintroduce builder `Spike`, `Breakable`, or `CollapsingPlatform` construction in `LdtkWorldScene.spawnBuilderEntities()`.
- Keep contact, attack, and collapse behavior in `WorldSpikeRuntime`, `WorldBreakableRuntime`, and `WorldCollapsingPlatformRuntime`; this runtime only creates builder-mounted instances and wires attachment/liveness.
- Register each created entity with its owning registry before attaching so liveness checks match the actual gameplay collection.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
