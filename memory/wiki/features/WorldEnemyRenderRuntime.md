# WorldEnemyRenderRuntime

`game/src/scenes/world/WorldEnemyRenderRuntime.ts` owns the LDtk World enemy render iteration loop.

Responsibilities:

- Iterate the registry-owned `Enemy<string>[]` list.
- Call each enemy's `render(alpha)` with the render alpha resolved by `LdtkWorldScene`.

Boundaries:

- `LdtkWorldScene` still resolves render alpha and decides render order relative to player, portals, debug overlays, and UI.
- `WorldEnemyRegistry` still owns the active enemy array and list lifecycle.
- Do not move enemy update, combat, contact damage, kill processing, or spawn policy into this runtime.

Verification: 2026-06-05 `npx tsc --noEmit` and `npm run build` from `game/` passed. Build retains the existing LDtk `atlas/prologue_01.png` CSV warning only.
