# WorldItemDeploymentAtmosphereFlowRuntime

`game/src/scenes/world/WorldItemDeploymentAtmosphereFlowRuntime.ts` owns the LDtk world Item World deployment atmosphere flow.

Current state:

- Coordinates legacy laser desaturation with dungeon-atmosphere activation/deactivation for the anvil Item World entry.
- On laser activation, activates `WorldLaserDesaturationRuntime`, then activates dungeon atmosphere.
- On laser release, deactivates laser desaturation, schedules any pending ghost tunnel through `ItemWorldGhostStreamRuntime`, clears the pending params in `WorldItemWorldEntryState`, and reapplies dungeon atmosphere because laser restore can overwrite filter arrays.
- Owns dungeon-atmosphere side effects that used to live in `LdtkWorldScene`: restoring the hidden anvil-dive UI, creating/destroying the frozen player snapshot, attaching/clearing frozen-return interaction, and moving the player container between `entityLayer` and `vividLayer`.

Boundaries:

- `WorldLaserDesaturationRuntime` still owns only the laser filter and previous-filter restore map.
- `WorldDungeonAtmosphereRuntime` still owns only the dungeon filters, target lists, builder-interior visibility, and filter reapply/remove APIs.
- `WorldItemWorldEntryState` still stores pending ghost-tunnel params; this flow decides when laser release consumes them.
- `LdtkWorldScene` still owns actual `ItemWorldScene` creation and Item World return placement/save side effects.

Prevention rules:

- Do not add scene-local `setLaserDesaturation()`, `activateDungeonAtmosphere()`, or `deactivateDungeonAtmosphere()` methods back to `LdtkWorldScene`.
- Keep dungeon-atmosphere `reapply()` after laser deactivation when pending ghost scheduling is consumed.
- Keep player reparenting paired with frozen-snapshot lifetime: activate moves from `entityLayer` to `vividLayer`; deactivate clears interaction/snapshot and moves back.

Verification on 2026-06-03: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
