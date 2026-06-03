# WorldFixedItemSpawnRuntime

`game/src/scenes/world/WorldFixedItemSpawnRuntime.ts` owns LDtk world fixed item creation policy.

Current state:

- `spawn(x, y, itemId, itemKey?)` resolves `Content_Item_Master.csv` entries, preserves direct weapon fallback for legacy item ids, creates weapon `ItemDropEntity` instances, creates currency `GoldPickup` instances, and shows consumable acquisition toasts.
- The runtime attaches new entities through `WorldItemDropRuntime.add()` / `WorldPickupRuntime.addGoldPickup()` callbacks and uses the active collision grid for item-drop spawn resolution and gold pickup terrain physics.
- `WorldHandPlacedItemRuntime`, `WorldSecretWallRuntime`, and `WorldBuilderItemRuntime` call this runtime instead of duplicating fixed item creation logic.

Prevention rules:

- Do not reintroduce `LdtkWorldScene.spawnFixedItemAt()` or duplicate master item lookup in scene-level entity parsing.
- Keep fixed item creation centralized here so hand-placed items, secret-wall rewards, and builder-mounted items resolve weapons/currency/consumables the same way.
- Keep inventory mutation and actual `ItemDropEntity` collection in `WorldItemDropRuntime` / scene callbacks; this runtime only creates and registers world entities.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
