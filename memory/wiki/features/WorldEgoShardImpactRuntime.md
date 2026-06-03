# WorldEgoShardImpactRuntime

`game/src/scenes/world/WorldEgoShardImpactRuntime.ts` owns LDtk world Ego Shard elemental terrain impacts and debug elemental sweeps.

Current responsibilities:

- Apply fire/ice/thunder Ego Shard terrain impact effects against the active `player.roomData` grid.
- Preserve the World path's 2x2 nearest-corner impact footprint and 24px fire hit box.
- Handle fire melt/evaporate/toxic flash/magma surge/heat-metal/ignition behavior, including fluid residue ignition and procedural grass ignition.
- Handle ice freeze/freeze-metal behavior.
- Handle thunder magma detonation, ice shatter pulse, and thunder-chain application.
- Own debug Shift+1/2/3 elemental sweeps, including hitbox calculation, `Debug.log`, and localized debug toasts.

Scene-owned boundaries:

- `LdtkWorldScene` still owns debug key routing and debug enchant switching.
- `WorldEgoShardProjectileRuntime` owns the projectile update and calls this runtime for terrain impacts.
- `WorldEgoShardCombatRuntime` owns enemy/container shard hits; do not merge combat hit policy into this terrain-impact runtime.

Verification: 2026-06-03 `npx tsc --noEmit`, `npm run build`, Puppeteer smoke against `http://localhost:3000/play/?debug=1`, and `git diff --check` passed. `git diff --check` only printed existing line-ending warnings.
