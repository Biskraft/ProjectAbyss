# Player Movement

## Jump Physics

- Player movement keeps float velocity, but displacement is accumulated into integer pixel remainders before tile collision.
- `game/src/core/Physics.ts` exposes pixel-sweep resolvers for player movement so jump/fall frames do not skip tile edges during frame spikes.
- `game/src/entities/Player.ts` starts ground, wall, and double jumps through explicit jump-motion helpers. Do not put generic takeoff velocity back into the `jump` state `enter`, or wall/double jump authored velocities will be overwritten.
- Grounded jumps inherit only upward carrier velocity from moving platforms. Descending platforms must not reduce jump height.
- Early jump release uses `Player.Jump.VarJumpCutMult` from `Sheets/Content_Player.csv`; as of 2026-05-28 it is `0.55` for a clearer tap short-hop.

## Ground Locomotion Animation

- `game/src/entities/Player.ts` treats grounded locomotion as active when movement input is held or `|vx| > 10`. Do not switch idle/run purely from `vx`: wall collision can zero horizontal velocity while the player is still pressing into the wall, causing walk animation stutter.
- Non-grid supports such as `ThrowableContainer` tops must refresh external grounding before `Player.update()` when the player is already standing on the top face. Post-update overlap resolution alone misses the exact-touch frame, causing repeated air/land pose churn. Use `forceGrounded(true)` for container-top support when the visual should snap directly to idle/run instead of playing the landing recovery pose.
