# WorldCollapsingPlatformRegistry

`game/src/scenes/world/WorldCollapsingPlatformRegistry.ts` owns LDtk world `CollapsingPlatform` entity lifetime and collision-grid mapping.

Current state:
- The registry owns the active `CollapsingPlatform[]` list, entity-layer attachment, room-clear cleanup, remove-at cleanup, membership checks for builder attachments, per-platform collision-grid lookup, and per-platform key/respawn metadata.
- `WorldCollapsingPlatformRuntime` owns LDtk spawn decisions, non-respawn persistence keys, player-on-top update policy, collapse state transition handling, and builder stamp refresh.
- `CollapsingPlatform.injectCollision()` runs before registration; the registry records which grid each platform mutates so builder-grid refresh can use the correct grid.

Prevention rules:
- Do not add scene-owned `collapsingPlatforms` or `collapsingPlatformCollisionGrids` back to `LdtkWorldScene`.
- Register host and builder platforms through `WorldCollapsingPlatformRegistry.add(platform, collisionGrid, entityLayer, meta)` after injecting collision into the same grid.
- Keep permanent-collapse unlock/event policy in `WorldCollapsingPlatformRuntime`; do not move it back to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
