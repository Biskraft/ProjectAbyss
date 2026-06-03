# WorldBuilderDoorSwitchRuntime

`game/src/scenes/world/WorldBuilderDoorSwitchRuntime.ts` owns LDtk world Giant Builder-mounted `LockedDoor` and `Switch` creation and attachment.

Current state:

- `spawnIfDoorSwitch(builder, entity)` handles builder-level `LockedDoor` and `Switch` entities and returns whether the entity was consumed.
- Builder doors preserve the same field parsing as host doors: `UnlockCondition`, `unlockEvent`, `StatType`, and `StatThreshold`.
- Builder doors inject collision into `builder.collisionGrid`, unlock immediately when their persisted event/IID key is already present, register through `WorldDoorSwitchRegistry`, and attach through `WorldBuilderAttachmentRuntime.attachWorldPositioned()`.
- Builder switches preserve `TargetDoor` / `targetDoor` parsing, activate immediately when the target IID is already unlocked, otherwise inject collision into `builder.collisionGrid`, register through `WorldDoorSwitchRegistry`, and attach to the builder.
- Interaction policy, attacks, unlock side effects, collision maintenance, player body resolution, analytics, toasts, and builder stamp refresh remain in `WorldDoorSwitchInteractionRuntime`.
- `WorldBuilderEntranceRuntime` owns builder entrance glow attachment; `WorldAnvilSpawnRuntime` owns builder `Anvil` construction and attachment.

Prevention rules:

- Do not reintroduce builder `LockedDoor` or `Switch` construction in `LdtkWorldScene.spawnBuilderEntities()`.
- Keep host-level `LockedDoor` / `Switch` spawning in `WorldDoorSwitchSpawnRuntime`; this runtime is only for builder-local grid placement and attachment.
- Inject or activate collision against `builder.collisionGrid`, and pass that same grid to `WorldDoorSwitchRegistry`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
