# WorldDungeonAtmosphereRuntime

`game/src/scenes/world/WorldDungeonAtmosphereRuntime.ts` owns LDtk world dungeon-atmosphere filter lifetime.

Invariants:

- The runtime owns the grayscale/contrast world `ColorMatrixFilter`, bright parallax gray filter, atmosphere target list, and builder-interior visibility restore references.
- `WorldFrozenSnapshotRuntime` owns frozen player snapshot creation/destruction. `WorldFrozenReturnRuntime` owns return prompt UI/input.
- `WorldItemDeploymentAtmosphereFlowRuntime` owns the anvil-entry activation/deactivation orchestration around this runtime, including frozen snapshot interaction cleanup and player reparenting between `entityLayer` and `vividLayer`.
- `ItemWorldGhostStreamRuntime` should use `isActive`, `filter`, `addTarget()`, and `removeTarget()` through this runtime. Do not re-add atmosphere target arrays to `LdtkWorldScene`.
- `WorldLaserDesaturationRuntime` can overwrite filter arrays when restoring legacy laser desaturation; call `reapply()` while dungeon atmosphere is active.
- Item World return visual normalization should call `removeKnownFiltersFrom()` before stripping laser desaturation snapshots so stale dungeon/parallax filters cannot leak across returns.
- Do not add scene-local `activateDungeonAtmosphere()` / `deactivateDungeonAtmosphere()` wrappers back to `LdtkWorldScene`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
