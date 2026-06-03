# WorldGrowingWallRegistry

`game/src/scenes/world/WorldGrowingWallRegistry.ts` owns LDtk world `GrowingWall` entity lifetime.

Current state:
- The registry owns the active `GrowingWall[]` list, entity-layer attachment, room-clear cleanup, and remove-at cleanup after wall shatter.
- `WorldGrowingWallRuntime` owns LDtk spawn decisions, persistent unlock keys, `GrowingWall.injectCollision()`, per-frame update, pending slime collection handoff, surge/dive destruction policy, feedback, and toasts.
- `GrowingWall.shatter()` still mutates the active collision grid; the runtime calls registry removal after shatter side effects complete.

Prevention rules:
- Do not add a scene-owned `growingWalls` array back to `LdtkWorldScene`.
- Inject collision before registering with `WorldGrowingWallRegistry.add(wall, entityLayer)`.
- Keep pending slime collection in `WorldGrowingWallRuntime.update()` and route enemy registration through its explicit `addSpawnedSlime` callback.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
