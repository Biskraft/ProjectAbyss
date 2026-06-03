# WorldSecretWallRegistry

`game/src/scenes/world/WorldSecretWallRegistry.ts` owns LDtk world `SecretWall` entity lifetime.

Current state:
- The registry owns the active `SecretWall[]` list, wall-layer attachment, room-clear cleanup, and remove-at cleanup after a wall breaks.
- `WorldSecretWallRuntime` owns LDtk `SecretWall` spawn decisions, already-unlocked collision/tile clearing, attack hit checks, item drop creation, analytics, toasts, and persistence keys.
- `SecretWall.break()` still mutates the active collision grid; the runtime calls registry removal only after break side effects and reward handling are complete.

Prevention rules:
- Do not add a scene-owned `secretWalls` array back to `LdtkWorldScene`.
- Add active walls through `WorldSecretWallRegistry.add(wall, renderer.wallLayer)` so palette-filtered hint cracks remain on the wall layer.
- Keep already-unlocked grid/tile clearing in `WorldSecretWallRuntime.spawn()` before player placement so opened passages stay open after room reloads.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
