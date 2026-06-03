# WorldSpikeRegistry

`game/src/scenes/world/WorldSpikeRegistry.ts` owns LDtk world `Spike` entity lifetime.

Current state:

- The registry owns the active `Spike[]` list, entity-layer attachment, room-clear cleanup, membership checks for builder attachments, and entity-spike AABB overlap checks.
- `WorldSpikeRuntime` owns LDtk spike spawn decisions, IntGrid spike checks, damage/teleport feedback, and player death handling.
- `LdtkWorldScene` still owns builder entity dispatch for builder-spawned spikes because those require attachment wiring; builder spikes are added to this registry and checked by `WorldSpikeRuntime`.

Prevention rules:

- Do not add a scene-owned `spikes` array back to `LdtkWorldScene`.
- Add world `Spike` entities through `WorldSpikeRegistry.add()` so visual attachment and list ownership stay together.
- Keep player damage/teleport side effects in `WorldSpikeRuntime`; `LdtkWorldScene` should delegate spike contact checks to it.

Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, `http://localhost:3000/play/?debug=1` Puppeteer smoke, and `git diff --check` passed with only existing line-ending warnings.
