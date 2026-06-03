# WorldSecretWallRuntime

`game/src/scenes/world/WorldSecretWallRuntime.ts` owns LDtk world `SecretWall` spawn replay and attack handling.

Responsibilities:

- Spawn active `SecretWall` entities from LDtk and attach them through `WorldSecretWallRegistry`.
- Replay already-unlocked secret walls by clearing their collision-grid cells and rendered tiles before player placement.
- Handle player attack AABB checks, wall breaking, analytics, toasts, and item/passsage rewards.
- Spawn fixed ItemId rewards through `WorldFixedItemSpawnRuntime` callback and random rare+ weapon rewards through `WorldItemDropRuntime`.

Boundaries:

- `WorldSecretWallRegistry` still owns active wall list, layer attachment, and remove-at cleanup.
- `WorldFixedItemSpawnRuntime` owns fixed item master lookup shared by hand-placed items, secret-wall rewards, and builder-mounted item entities.
- Keep secret-wall replay before player placement in `loadLevel()` so return spawns through opened passages do not collide with stale wall cells.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
