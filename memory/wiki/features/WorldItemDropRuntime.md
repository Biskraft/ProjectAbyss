# WorldItemDropRuntime

`game/src/scenes/world/WorldItemDropRuntime.ts` owns LDtk world `ItemDropEntity` lifetime.

Current state:

- The runtime owns item-drop arrays, entity-layer attachment, level cleanup, per-frame bob/update, player overlap checks, collection removal, and destroy/splice order.
- The runtime owns item-drop collection side effects: inventory add, item-collected stat increment, localized acquisition toast, persistent item key marking, pickup glow, and sacred-pickup handoff.
- `WorldFixedItemSpawnRuntime` owns fixed item creation decisions and registers weapon drops through `WorldItemDropRuntime.add()`.
- `LdtkWorldScene` still owns the backing inventory/progress/save objects and passes them through callbacks.
- Secret walls, fixed item spawns, and builder-mounted item entities must route weapon creation through `WorldFixedItemSpawnRuntime` or add already-created drops through `WorldItemDropRuntime.add()`.
- Builder-mounted fixed items use `count` / `latest()` / `includes()` to attach newly-created drops to the active builder.

Prevention rules:

- Do not add a scene-owned `drops` array back to `LdtkWorldScene`.
- Do not reintroduce fixed item master lookup here; fixed item creation belongs in `WorldFixedItemSpawnRuntime`.
- Do not add a scene-level item-drop collection callback back to `LdtkWorldScene`; collection policy belongs here while backing inventory/progress state remains callback-owned.
- Keep gold/healing pickups in `WorldPickupRuntime`; this runtime is only for `ItemDropEntity` weapon/item drops.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
