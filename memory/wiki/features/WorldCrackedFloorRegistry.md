# WorldCrackedFloorRegistry

`game/src/scenes/world/WorldCrackedFloorRegistry.ts` owns LDtk world `CrackedFloor` entity lifetime.

Current state:
- The registry owns the active `CrackedFloor[]` list, entity-layer attachment, room-clear cleanup, and remove-at cleanup after floor shatter.
- `WorldCrackedFloorRuntime` owns LDtk spawn decisions, persistent unlock keys, `CrackedFloor.injectCollision()`, surge/dive/sword hit policy, collision-grid shatter calls, feedback, and toasts.
- `CrackedFloor.shatter()` still mutates the active collision grid; the runtime calls registry removal after shatter side effects complete.

Prevention rules:
- Do not add a scene-owned `crackedFloors` array back to `LdtkWorldScene`.
- Inject collision before registering with `WorldCrackedFloorRegistry.add(floor, entityLayer)`.
- Keep surge/dive/sword destruction policy in `WorldCrackedFloorRuntime`; `LdtkWorldScene` should delegate cracked-floor interactions to it.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
