# ItemWorldRoomGraph

Item World graph generation lives in `game/src/level/RoomGraph.ts`, with runtime placement handled by `game/src/level/RoomGraphAdapter.ts`.

## 2026-06-18 - Horizontal descent topology

- Added `horizontal_descent` topology.
- Shape intent for Normal 7-node runs:
  - `A -- B -- C -- D`
  - `C` has `left/right/down` exits and carries the `descent_anchor` tag.
  - Below `C`, `E/F` are `vertical_shaft` nodes with `up/down` exits.
  - Final vertical node is `boss0`, with `up` only and `no_down`.
- There is no L-shaped graph node. L-shaped movement is authored inside the rectangular LDtk room used for `descent_anchor`.
- `Sheets/Content_StrataConfig.csv` now uses `horizontal_descent` as the default Item World topology. Legacy unimplemented weapon topology overrides no longer block this default unless the override is explicitly `horizontal_descent`.
- Template fallback policy keeps exit/socket correctness above room flavor. Missing exact `Start exits=R` or `Boss exits=U` templates may warn and use another exact-exit room type.

## Verification

- `npx tsc --noEmit`
- `npm run build`
- Playwright `http://localhost:3000/play/?debug=1&debugItemWorld=1`
  - `scene = ItemWorldScene`
  - `nodeCount = 7`
  - `hasDescentAnchor = true`
  - `verticalShaftNodes = 2`
  - anchor cell exits are `L/R/D`
  - boss cell exits are `U`
  - `rectSummary = 48x32`
  - `fullGrid = 192x128`

## Prevention rules

- Do not add `LRoom`, `Corner`, or special L-shaped graph nodes for this pattern.
- Keep graph nodes rectangular. Express the turn with `descent_anchor` exits and LDtk room authoring.
- Do not allow desired room type to override required exits.
