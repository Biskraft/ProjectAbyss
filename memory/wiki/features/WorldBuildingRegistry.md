# WorldBuildingRegistry

`game/src/scenes/world/WorldBuildingRegistry.ts` owns LDtk world `Building` entity lifetime.

Current state:

- The registry owns the active `Building[]` list, entity-layer attachment, and room-clear cleanup.
- `WorldBuildingRuntime` owns LDtk `Building` spawn decisions and tile-picker validation/logging.
- `Building` remains visual-only; it does not add collision or gameplay interaction.

Prevention rules:

- Do not add a scene-owned `buildings` array back to `LdtkWorldScene`.
- Add world `Building` entities through `WorldBuildingRegistry.add()` so visual attachment and list ownership stay together.
- Keep collision out of `Building`; use explicit LDtk collision/intgrid systems when a visual building needs blocking behavior.
- Do not instantiate `Building` directly in `LdtkWorldScene`; route active-level visual spawning through `WorldBuildingRuntime`.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
