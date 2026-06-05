# WorldPickupRuntime

`game/src/scenes/world/WorldPickupRuntime.ts` owns LDtk world gold and healing pickup arrays.

Current state:

- The runtime owns `GoldPickup` and `HealingPickup` lifetime, entity-layer attachment, level cleanup, per-frame pickup update, collection overlap checks, gold gain, HP gain feedback, and LDtk `_key` collection marking.
- Pickup array attachment, clear/destroy loops, default player proximity checks, and collection iteration are shared through `game/src/scenes/shared/PickupCollectionHelpers.ts`; world-specific LDtk parsing, persisted-key marking, gold gain, and HP feedback remain in this runtime.
- `loadLevel(level, collisionGrid, collectedItems)` owns LDtk `GoldPickup` and `HealingPickup` parsing, persistent key skipping, terrain-physics enabling for gold, and initial entity-layer attachment.
- `WorldRelicPickupRuntime` owns `HealthShard` and `AbilityRelic` pickup lifetime and reward side effects. `LdtkWorldScene` still owns sacred weapon pickup flow, persistent `collectedItems`/`collectedRelics`, and the save payload.
- Drop creation decisions outside room load remain in enemy kills, breakables, and `WorldFixedItemSpawnRuntime`, but callers must add gold/healing pickups through `WorldPickupRuntime.addGoldPickup()` / `addHealingPickup()`.
- Builder-mounted fixed items use `goldCount` / `healingCount` plus `latest*Pickup()` / `includes*Pickup()` to attach newly-created pickups to the active builder.

Prevention rules:

- Do not add scene-owned `goldPickups` or `healingPickups` arrays back to `LdtkWorldScene`.
- Do not parse LDtk `GoldPickup` or `HealingPickup` entities in `LdtkWorldScene`; call `WorldPickupRuntime.loadLevel()`.
- Keep HealthShard/AbilityRelic out of this runtime; their pickup lifetime and reward side effects belong to `WorldRelicPickupRuntime`, while progression storage remains scene-owned.
- Keep LDtk `_key` collection marking in the runtime via callback so hand-placed gold/heal pickups stay persistent across reloads.
- Do not move LDtk persisted-key handling into `PickupCollectionHelpers`; it should stay a mode-neutral array/attachment/proximity helper.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
