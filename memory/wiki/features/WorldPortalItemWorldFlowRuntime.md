# WorldPortalItemWorldFlowRuntime

`game/src/scenes/world/WorldPortalItemWorldFlowRuntime.ts` owns LDtk world portal/altar Item World completion policy after the peeling transition finishes.

Current state:

- Consumes pending portal data from `PortalEntryRuntime` and destroys the pending portal entity.
- Routes fixed Item World portals back through `WorldFixedItemWorldFlowRuntime.exit()`.
- Creates random dungeon items for non-altar portals by rarity, or reuses the source altar item.
- Uses `WorldItemWorldSceneFlowRuntime` for prestreaming, `ItemWorldScene` construction, prepared push, and common return handling.
- Applies portal/altar path-specific return side effects after common return: world-return dialogue, anvil retirement policy, weapon level-up toast, item acquisition toast/pickup flow, and attack-change toast.

Boundaries:

- `PortalEntryRuntime` owns pending data/entity storage and cleanup primitives.
- `WorldItemWorldSceneFlowRuntime` owns common procedural Item World scene push/return mechanics.
- `WorldFixedItemWorldFlowRuntime` owns fixed handcrafted Item World return policy.
- `LdtkWorldScene` still owns portal transition start, dialogue dispatch callback, anvil retirement callback, and anvil/tunnel entry policy. Sacred pickup visuals/policy are delegated to `WorldSacredPickupRuntime` through the `sacredPickupFlow` callback.

Prevention rules:

- Do not add scene-local `completePendingPortalEntry()` helpers back to `LdtkWorldScene`.
- Keep portal/altar rewards path-specific in this runtime; keep common scene push/return behavior in `WorldItemWorldSceneFlowRuntime`.
- Keep pending portal fields out of `LdtkWorldScene`; use `PortalEntryRuntime`.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed; diff check only printed existing line-ending warnings.
