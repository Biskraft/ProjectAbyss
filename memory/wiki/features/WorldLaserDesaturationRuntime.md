# World Laser Desaturation Runtime

## Current State

- `game/src/scenes/world/WorldLaserDesaturationRuntime.ts` owns the legacy laser desaturation `ColorMatrixFilter`, target filter append, and previous-filter restore map.
- `WorldItemDeploymentAtmosphereFlowRuntime` keeps orchestration around laser release: activating dungeon atmosphere and scheduling pending ghost tunnel state after the laser clears. Dungeon filter reapply is delegated to `WorldDungeonAtmosphereRuntime.reapply()`.
- Item World return normalization removes dungeon/parallax filters in the scene and delegates laser filter stripping/snapshot clearing to `WorldLaserDesaturationRuntime.removeFromTargets()`.

## Prevention Rules

- Do not reintroduce laser desaturation filter or previous-filter map fields directly into `LdtkWorldScene`.
- Keep pending ghost tunnel scheduling in `WorldItemDeploymentAtmosphereFlowRuntime.setLaserDesaturation(false)`.
- Do not add a scene-local `setLaserDesaturation()` wrapper back to `LdtkWorldScene`.
- Do not re-add dungeon atmosphere filter/target fields to `LdtkWorldScene`; use `WorldDungeonAtmosphereRuntime`.
- If return normalization manually edits filter arrays, also call `WorldLaserDesaturationRuntime.removeFromTargets()` so stale restore snapshots are cleared.
