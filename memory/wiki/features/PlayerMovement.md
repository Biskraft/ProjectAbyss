# Player Movement

## Jump Physics

- Player movement keeps float velocity, but displacement is accumulated into integer pixel remainders before tile collision.
- `game/src/core/Physics.ts` exposes pixel-sweep resolvers for player movement so jump/fall frames do not skip tile edges during frame spikes.
- `game/src/entities/Player.ts` starts ground, wall, and double jumps through explicit jump-motion helpers. Do not put generic takeoff velocity back into the `jump` state `enter`, or wall/double jump authored velocities will be overwritten.
- Grounded jumps inherit only upward carrier velocity from moving platforms. Descending platforms must not reduce jump height.
- Early jump release uses `Player.Jump.VarJumpCutMult` from `Sheets/Content_Player.csv`; as of 2026-05-28 it is `0.55` for a clearer tap short-hop.
- Down+Jump drop-through must require `Player.isOnOneWayPlatform()`. Do not trigger drop-through from generic `grounded`, or solid floors can be treated like one-way platforms by nudging the player down.
- `Player.attackInputEnabled` gates player attack and dive-attack input at the entity level. LDtk world starts with it disabled for the opening tutorial. Creating an Item World scene enables it on both the source world player and Item World clone so world return keeps combat available; debug warp and void teleport also enable it on arrival.

## Ground Locomotion Animation

- `game/src/entities/Player.ts` treats grounded locomotion as active when movement input is held or `|vx| > 10`. Do not switch idle/run purely from `vx`: wall collision can zero horizontal velocity while the player is still pressing into the wall, causing walk animation stutter.
- Non-grid supports such as `ThrowableContainer` tops must refresh external grounding before `Player.update()` when the player is already standing on the top face. Post-update overlap resolution alone misses the exact-touch frame, causing repeated air/land pose churn. Use `forceGrounded(true)` for container-top support when the visual should snap directly to idle/run instead of playing the landing recovery pose.
- Shared placement helpers bind player terrain through `Player.bindCollisionGrid(...)`; do not add new helper-side `player.roomData = ...` writes.

## 2x1 Virtual Slopes

- `game/src/core/Physics.ts` infers 2x1 virtual slopes from unchanged IntGrid surfaces: low/low/high or high/low/low. This is a runtime overlay, not a new IntGrid tile value.
- Only 2-tile horizontal / 1-tile vertical ramps are automatic. Do not auto-generate 1x1 45-degree slopes; if they are needed later, gate them behind explicit LDtk markup or a separate rule.
- `game/src/entities/Player.ts` routes walking, running, ground dash, and air dash through the 2x1 slope-aware pixel sweep. Dive and Surge flight stay on the normal resolver; upward jump takeoff does not stick back to the slope.
- `game/src/entities/Enemy.ts` keeps ground-type enemies on normal pixel collision first and only falls back to the 2x1 slope-aware X sweep when a horizontal move would otherwise collide. Flying enemies stay on normal wall-only movement. Enemy jump takeoff disables slope stickiness once `vy < 0`; falling and grounded movement may land/capture on slopes.
- In `Enemy.update()`, compute the Y pixel sweep after wall-blocked jump logic. Wall jump AI can assign a new negative `vy` during X collision handling, and precomputing `moveY` before that makes the monster fail to leave the ground.
- Enemy wall-block jump timers must not reset on frames where pixel remainder rounds horizontal movement to 0 while AI still has horizontal intent. Skeleton speed can produce alternating `moveX` 1/0 frames; use an ahead-wall probe on 0px frames so the 150ms wall-block threshold still accumulates.
- Wall-block navigation jumps keep a short horizontal carry timer. Without it, the X collision that triggered the jump zeros `vx`, and ground enemy AI does not reapply horizontal chase while airborne, so the monster jumps vertically in place instead of clearing the ledge.
- Ground enemy patrol edge probes use `hasGroundSupportAtFoot()` so Skeleton and GoldenMonster do not treat a slope segment as a missing floor.
- Existing ledge snap and dash corner correction remain fallback behavior for non-2x1 geometry.
- While descending a 2x1 slope, the player AABB can overlap the high-side support cell behind the actor. The slope resolver intentionally ignores the inferred slope support/cap cells for wall blocking; otherwise downward traversal fails even though upward traversal works.
- `game/public/assets/World_ProjectAbyss.ldtk` has the matching visual autotile in `Collisions` -> `Walls`, rule `uid=2156`. Its pattern is `[0,0,-1,-1,-1,1,1,1,0]` with `flipX=true` and stamp tiles `[70,71]`, so it only paints wall-value low/low/high or high/low/low 2x1 slopes. Do not broaden it back to the older one-corner pattern, or 1x1 corners will receive 30-degree slope art.
- The `uid=2156` slope stamp tiles intentionally render over air cells. Runtime wall-tile filters in `LdtkWorldScene` and `ItemWorldScene` must preserve `isLdtkWallSlope2x1Tile()` before checking `collisionGrid[row][col] !== 0`; otherwise every slope visual is culled even though the LDtk `autoLayerTiles` cache contains it.
- `game/src/level/ProceduralDecorator.ts` suppresses all procedural edge decorations on inferred 2x1 slope support cells. Grass/moss/surface-overlay/micro passes are grid-edge based and will produce right-angle artifacts if they are allowed on the low/low/high or high/low/low support cells.
- `game/src/systems/BreakablePropSpawner.ts` excludes 2x1 slope support cells from procedural breakable prop floor candidates. Do not place breakable props on the virtual slope footprint.

