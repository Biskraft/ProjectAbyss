---
feature: Item World Spawning
status: active
last_updated: 2026-05-31
---
# Item World Spawning

## Current Rule

- Procedural Item World enemy spawn points come from `ItemWorldSpawnController.computeSpawnPoints()`.
- A spawn point requires an air cell above a valid floor cell.
- Valid floor cells are solid IntGrid values or one-way platform IntGrid value `3`.
- The flat floor/platform run must be at least 8 IntGrid cells long.
- Passable hazard/fluid cells such as charged `8`, water, magma, oil, acid, and cyro are not spawn floors.

## Prevention

- Do not revert Item World enemy spawn floors to `below >= 1`; that includes passable hazards and can spawn enemies on terrain they cannot stand on.
