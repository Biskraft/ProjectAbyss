# InventoryRefreshDisplay

## 2026-06-05

- `game/src/ui/inventory/InventoryRefreshDisplay.ts` owns full InventoryUI redraw orchestration across chrome, grid, info/anvil slot, and right-column status/minimap display helpers.
- `InventoryUI.refresh()` now passes current UI state into `redrawInventoryUi(...)` and only stores returned display handles needed by pulse/lifetime updates.
- Keep input/action policy in `InventoryInteractionFacade` and visibility state policy in `InventoryVisibilityStatePolicy`; this helper is display orchestration only.

- 2026-06-05: Inventory visibility transition application now uses `InventoryVisibilityStatePolicy.applyBoundInventoryVisibilityTransition`. `InventoryUI` keeps private fields as state owner, but should not retain separate create/apply transition-state wrapper methods.

- 2026-06-05: `InventoryUI` now keeps one `visibilityTransitionStateBinding` for transition state read/write. `open` and `close` should reuse that binding instead of duplicating field snapshot/commit lambdas.

- 2026-06-21: InventoryInteractionFacade now owns menu input 실행 흐름까지 통합해 InventoryUI.handleMenuInput()가 정책/상태 분기를 직접 수행하지 않도록 정리.

