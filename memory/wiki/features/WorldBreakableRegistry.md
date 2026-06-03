# WorldBreakableRegistry

`game/src/scenes/world/WorldBreakableRegistry.ts` owns LDtk world `Breakable` entity lifetime.

Current state:

- The registry owns the active `Breakable[]` list, entity-layer attachment, room-clear cleanup, per-frame `update()`, remove-at cleanup, and membership checks for builder attachments.
- `WorldBreakableRuntime` owns LDtk `Breakable` spawn decisions, update delegation, sword-hit detection, shatter VFX, SFX, drop rewards, hit sparks, and item/gold pickup side effects.
- This registry is only for LDtk Entity `Breakable`; procedural `BreakableProp` remains scene-owned for now.

Prevention rules:

- Do not add a scene-owned `breakables` array back to `LdtkWorldScene`.
- Add world `Breakable` entities through `WorldBreakableRegistry.add()` so visual attachment and list ownership stay together.
- Keep `BreakableProp` out of this registry until procedural prop creation/destruction is intentionally extracted together.
- Keep builder-spawned `Breakable` creation in the scene until builder attachment wiring is extracted; `WorldBreakableRuntime.checkAttack()` still handles those registry entries.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
