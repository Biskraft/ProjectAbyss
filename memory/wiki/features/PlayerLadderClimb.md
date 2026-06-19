# Player Ladder Climb

## 2026-06-19 - MVP ladder state

- `game/src/core/Physics.ts` defines `TILE_LADDER = 14`, `isLadder()`, and `isOnLadder()` as a passable IntGrid marker.
- `game/src/entities/Player.ts` adds the `climb` FSM state. `LOOK_UP` while overlapping a ladder enters climb; gravity, dash, dive attack, and normal attack are suppressed while climbing.
- Climb movement uses vertical input only, centers the player toward the ladder column, and lets `JUMP` exit with a jump or horizontal input step off.
- Erda uses the `climb` Aseprite frameTag when present in `erda_atlas.json`; if missing, it falls back to the air frame instead of breaking animation.
- Future phases still need polished top climb-over, ladder-bottom edge cases, and procedural/biome ladder generation.

