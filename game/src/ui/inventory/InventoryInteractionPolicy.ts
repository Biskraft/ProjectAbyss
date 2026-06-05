import type { InventoryAnvilState } from './InventoryAnvilStatePolicy';
import type { InventoryUIMode } from './InventoryVisibilityStatePolicy';
import type { FilterTab, GridDirection } from './InventorySelection';
import type { ItemInstance } from '@items/ItemInstance';
import { selectedInventoryItem } from './InventorySelection';
import { cycleInventoryFilterSelection, moveGridSelection } from './InventorySelection';

export type InventoryConfirmAction = 'place-anvil' | 'confirm-dive' | 'equip-selected';
export type InventoryCancelAction = 'remove-anvil' | 'close';
export type InventoryAttackInputAction = 'none' | 'confirmed_equipment_change' | 'confirm-anvil';
export type InventoryAnvilPromptCancelAction = 'refresh' | 'reopen-altar-select';

export interface InventoryFilterSelectionResult {
  filter: FilterTab;
  selectedIndex: number;
  scrollRowOffset: number;
  changed: boolean;
}

export interface InventoryNavigationSelectionResult {
  selectedIndex: number;
  scrollRowOffset: number;
  changed: boolean;
}

export interface InventoryConfirmSelection {
  type: InventoryConfirmAction | 'none';
  item: ItemInstance | null;
}

export interface InventoryEquipSelection {
  item: ItemInstance | null;
  hasSelection: boolean;
}

export interface InventoryCancelSelection {
  action: InventoryCancelAction;
  shouldRemoveAnvil: boolean;
  shouldClose: boolean;
}

export function nextInventoryFilterSelection(
  items: readonly ItemInstance[],
  filter: FilterTab,
  mode: InventoryUIMode,
  anvilState: InventoryAnvilState,
): InventoryFilterSelectionResult {
  const canChangeSelection = !(mode === 'anvil' && anvilState === 'placed');
  if (!canChangeSelection) {
    return { filter, selectedIndex: 0, scrollRowOffset: 0, changed: false };
  }

  const next = cycleInventoryFilterSelection(items, filter);
  return {
    filter: next.filter,
    selectedIndex: next.selectedIndex,
    scrollRowOffset: next.scrollRowOffset,
    changed: true,
  };
}

export function nextInventoryNavigation(
  selectedIndex: number,
  scrollRowOffset: number,
  dir: GridDirection,
  count: number,
  gridCols: number,
  gridRows: number,
  mode: InventoryUIMode,
  anvilState: InventoryAnvilState,
): InventoryNavigationSelectionResult {
  const canChangeSelection = !(mode === 'anvil' && anvilState === 'placed');
  if (!canChangeSelection || count === 0) {
    return { selectedIndex, scrollRowOffset, changed: false };
  }

  const next = moveGridSelection({ selectedIndex, scrollRowOffset }, dir, count, gridCols, gridRows);
  return { selectedIndex: next.selectedIndex, scrollRowOffset: next.scrollRowOffset, changed: next.selectedIndex !== selectedIndex || next.scrollRowOffset !== scrollRowOffset };
}

export function nextInventoryConfirmSelection(
  mode: InventoryUIMode,
  anvilState: InventoryAnvilState,
  filteredItems: readonly ItemInstance[],
  selectedIndex: number,
): InventoryConfirmSelection {
  const action: InventoryConfirmAction = mode === 'anvil'
    ? (anvilState === 'placed' ? 'confirm-dive' : 'place-anvil')
    : 'equip-selected';
  if (action === 'confirm-dive') {
    return { type: action, item: null };
  }

  const item = selectedInventoryItem(filteredItems, selectedIndex) ?? null;
  if (!item) {
    return { type: 'none', item: null };
  }

  if (action === 'place-anvil') {
    return { type: 'place-anvil', item };
  }

  return { type: 'equip-selected', item };
}

export function nextInventoryEquipSelection(
  filteredItems: readonly ItemInstance[],
  selectedIndex: number,
): InventoryEquipSelection {
  const item = selectedInventoryItem(filteredItems, selectedIndex) ?? null;
  return {
    item,
    hasSelection: Boolean(item),
  };
}

export function nextInventoryCancelAction(anvilState: InventoryAnvilState): InventoryCancelSelection {
  const action: InventoryCancelAction = anvilState === 'placed' ? 'remove-anvil' : 'close';
  return {
    action,
    shouldRemoveAnvil: action === 'remove-anvil',
    shouldClose: action === 'close',
  };
}

export function nextInventoryAttackInputAction(mode: InventoryUIMode): InventoryAttackInputAction {
  return mode === 'anvil' ? 'confirm-anvil' : 'confirmed_equipment_change';
}

export function shouldCloseInventoryOnMenu(mode: InventoryUIMode): boolean {
  return mode === 'inventory';
}

export type InventoryAnvilModeCloseAction = 'none' | 'handle-anvil-menu-close';

export interface InventoryAnvilModeCloseActionInput {
  mode: InventoryUIMode;
  visible: boolean;
}

export function nextInventoryCloseAnvilModeAction(
  input: InventoryAnvilModeCloseActionInput,
): InventoryAnvilModeCloseAction {
  if (input.mode === 'anvil' && input.visible) return 'handle-anvil-menu-close';
  return 'none';
}

export interface InventoryAnvilPromptCancelState {
  visible: boolean;
  mode: InventoryUIMode;
}

export function nextInventoryAnvilPromptCancelAction({
  visible,
  mode,
}: InventoryAnvilPromptCancelState): InventoryAnvilPromptCancelAction {
  if (visible && mode === 'anvil') {
    return 'refresh';
  }
  return 'reopen-altar-select';
}
