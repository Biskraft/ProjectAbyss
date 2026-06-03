# WorldSpikeRuntime

`game/src/scenes/world/WorldSpikeRuntime.ts` owns LDtk world spike spawning and player spike-contact punishment.

Responsibilities:

- Spawn LDtk `Spike` entities into `WorldSpikeRegistry`.
- Check both IntGrid spike cells and entity spike AABBs for player contact.
- Apply spike damage, HUD/screen/damage-number feedback, gamepad rumble, invincibility, last-safe teleport, and death fallback.

Boundaries:

- `WorldSpikeRegistry` still owns active spike list, entity-layer attachment, builder membership checks, and AABB overlap queries.
- Builder-spawned spikes are created by `WorldBuilderStaticEntityRuntime` because they need builder attachment wiring; they are added to the same registry and participate in `WorldSpikeRuntime.checkContact()`.
- Last-safe position maintenance remains in player/world movement logic; the spike runtime only consumes `player.lastSafeX/Y`.

Verification: 2026-06-03 `npx tsc --noEmit` passed. Broader build/smoke verification followed in the same session.
