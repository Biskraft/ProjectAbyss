# CameraZoneRuntime

`game/src/core/CameraZoneRuntime.ts` owns LDtk-authored camera-zone activation for both `LdtkWorldScene` and `ItemWorldScene`.

Invariants:

- Scenes still parse LDtk `Camera` entities and call `addZone()`; the runtime is data-source agnostic.
- `CameraZoneRuntime.loadLevel(level, { resetToDefaults })` owns LDtk `Camera` entity parsing for the LDtk world path. `addZone()` remains public for Item World static-entity spawning, which still supplies already-parsed camera zones.
- `LdtkWorldScene` uses `preferSpecificZones: true`, preserving the old priority: player-overlapping zones first, then `entireLevel` fallback. It also passes `suppressZones` while the player is inside the Giant Builder, which restores the default camera profile.
- `ItemWorldScene` uses the default selection policy: first matching zone wins, and `entireLevel` zones match immediately. This preserves its previous authored-order behavior.
- `resetToDefaults()` clears zones and restores the default camera dead zone/look-ahead/follow profile. Use `clear()` when a scene only needs to drop authored zones without changing the current camera profile.

Prevention rules:

- Do not parse host-world LDtk `Camera` entities in `LdtkWorldScene`; call `CameraZoneRuntime.loadLevel(level, { resetToDefaults: true })`.
- Keep `addZone()` available for Item World until its static-entity camera parsing is intentionally extracted into the shared runtime.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
