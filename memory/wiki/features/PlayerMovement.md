# Player Movement

## Jump Physics

- Player movement keeps float velocity, but displacement is accumulated into integer pixel remainders before tile collision.
- `game/src/core/Physics.ts` exposes pixel-sweep resolvers for player movement so jump/fall frames do not skip tile edges during frame spikes.
- `game/src/entities/Player.ts` starts ground, wall, and double jumps through explicit jump-motion helpers. Do not put generic takeoff velocity back into the `jump` state `enter`, or wall/double jump authored velocities will be overwritten.
- Grounded jumps inherit only upward carrier velocity from moving platforms. Descending platforms must not reduce jump height.
- Early jump release uses `Player.Jump.VarJumpCutMult` from `Sheets/Content_Player.csv`; as of 2026-05-28 it is `0.55` for a clearer tap short-hop.
