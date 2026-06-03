# WorldRelicPickupRuntime

`game/src/scenes/world/WorldRelicPickupRuntime.ts` owns LDtk world `HealthShard` and `AbilityRelic` pickup lifetimes and reward side effects.

Current state:

- The runtime owns HealthShard arrays, AbilityRelic marker graphics, entity-layer attachment, level cleanup, per-frame pickup update, player overlap checks, marker removal, relic aura burst spawning, and collected reward side effects.
- `loadLevel(level, collectedRelics)` owns LDtk `HealthShard` and `AbilityRelic` parsing, persistent key skipping, HealthShard construction, and AbilityRelic marker creation.
- HealthShard collection updates `collectedRelics`, HealthShard bonus, ATK/max HP, full heal, hitstop, screen flash, camera shake, and HP acquire overlay through injected callbacks/runtime getters.
- AbilityRelic collection updates `collectedRelics`, player ability flags, analytics, acquire overlays, cheat full heal/toast, hitstop, and camera shake.
- `LdtkWorldScene` still owns the backing save/progression stores and provides callbacks/getters for mutation; it should not keep scene-local HealthShard/AbilityRelic reward handlers.

Prevention rules:

- Do not add scene-owned `healthShards` or `relicMarkers` arrays back to `LdtkWorldScene`.
- Do not parse LDtk `HealthShard` or `AbilityRelic` entities in `LdtkWorldScene`; call `WorldRelicPickupRuntime.loadLevel()`.
- Keep save/progression storage in `WorldProgressState` / `WorldPlayerProgressionState`; this runtime may mutate them only through injected callbacks.
- Keep acquire overlay lifetime in `WorldAcquireOverlayRuntime`; this runtime delegates show calls through the runtime getter and does not create UI overlays directly.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
