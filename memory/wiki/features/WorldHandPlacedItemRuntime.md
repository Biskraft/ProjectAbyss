# WorldHandPlacedItemRuntime

`game/src/scenes/world/WorldHandPlacedItemRuntime.ts` owns LDtk world hand-placed `Item` entity parsing during level load.

Current state:

- `loadLevel(level)` scans LDtk `Item` entities, builds the persistent item key from level id and pixel position, skips already-collected keys, preserves the special `sword_broken` skip/mark behavior, calls `WorldFixedItemSpawnRuntime` through a callback, and emits `trackItemDrop()` telemetry.
- `WorldFixedItemSpawnRuntime` owns the actual fixed item creation policy because it needs collision-grid spawn resolution, `WorldItemDropRuntime`, `WorldPickupRuntime`, toast behavior, and Content_Item_Master fallback behavior.
- Giant Builder child `Item` parsing remains in builder entity processing because it needs builder-local attachment snapshots.

Prevention rules:

- Do not reintroduce host-level LDtk `Item` parsing or hand-placed item telemetry in `LdtkWorldScene`.
- Keep `sword_broken` marked collected without spawning; this prevents the starter-only Broken Sword from reappearing as a normal world drop.
- Keep fixed item creation policy in `WorldFixedItemSpawnRuntime`; this runtime should only parse host-level `Item` entities and emit hand-placed telemetry.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
