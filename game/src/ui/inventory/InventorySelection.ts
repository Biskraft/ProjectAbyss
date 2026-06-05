import type { ItemInstance } from '@items/ItemInstance';

export type FilterTab = 'ALL' | 'WPN' | 'ARM' | 'ACC';

export const FILTER_TABS: readonly FilterTab[] = ['ALL', 'WPN', 'ARM', 'ACC'];

export type GridDirection = 'left' | 'right' | 'up' | 'down';

export interface SelectionState {
  selectedIndex: number;
  scrollRowOffset: number;
}

export interface FilterSelectionState extends SelectionState {
  filter: FilterTab;
}

export function itemMatchesFilter(item: ItemInstance, filter: FilterTab): boolean {
  if (filter === 'ALL' || filter === 'WPN') return true;
  return false;
}

export function filterInventoryItems(items: readonly ItemInstance[], filter: FilterTab): ItemInstance[] {
  return items.filter(item => itemMatchesFilter(item, filter));
}

export function selectedInventoryItem(
  items: readonly ItemInstance[],
  selectedIndex: number,
): ItemInstance | undefined {
  return items[selectedIndex];
}

export function nextFilterTab(filter: FilterTab): FilterTab {
  const idx = FILTER_TABS.indexOf(filter);
  return FILTER_TABS[(idx + 1) % FILTER_TABS.length];
}

export function firstInventorySelectionIndex(count: number): number {
  return count > 0 ? 0 : -1;
}

export function cycleInventoryFilterSelection(
  items: readonly ItemInstance[],
  filter: FilterTab,
): FilterSelectionState {
  const nextFilter = nextFilterTab(filter);
  const count = filterInventoryItems(items, nextFilter).length;
  return {
    filter: nextFilter,
    selectedIndex: firstInventorySelectionIndex(count),
    scrollRowOffset: 0,
  };
}

export function moveGridSelection(
  state: SelectionState,
  dir: GridDirection,
  count: number,
  gridCols: number,
  gridRows: number,
): SelectionState {
  if (count === 0) return state;

  let selectedIndex = state.selectedIndex;
  if (selectedIndex < 0) {
    selectedIndex = 0;
  } else {
    switch (dir) {
      case 'left':
        selectedIndex = Math.max(0, selectedIndex - 1);
        break;
      case 'right':
        selectedIndex = Math.min(count - 1, selectedIndex + 1);
        break;
      case 'up':
        if (selectedIndex >= gridCols) selectedIndex -= gridCols;
        break;
      case 'down':
        if (selectedIndex + gridCols < count) selectedIndex += gridCols;
        break;
    }
  }

  const row = Math.floor(selectedIndex / gridCols);
  let scrollRowOffset = state.scrollRowOffset;
  if (row < scrollRowOffset) scrollRowOffset = row;
  if (row >= scrollRowOffset + gridRows) scrollRowOffset = row - gridRows + 1;

  return { selectedIndex, scrollRowOffset };
}
