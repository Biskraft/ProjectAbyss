import type { ItemInstance } from '@items/ItemInstance';
import type { Inventory } from '@items/Inventory';
import type { FilterTab, GridDirection } from './InventorySelection';
import type { InventoryAnvilState } from './InventoryAnvilStatePolicy';
import type { InventoryUIMode } from './InventoryVisibilityStatePolicy';
import { ensureInventoryAnvilPlacementAllowed } from './InventoryAnvilPlacementPolicy';
import { confirmInventoryAnvilDive, placeInventoryAnvilItem, removeInventoryAnvilItem } from './InventoryAnvilStatePolicy';
import {
  nextInventoryAnvilPromptCancelAction,
  nextInventoryCancelAction,
  nextInventoryConfirmSelection,
  shouldCloseInventoryOnMenu,
  nextInventoryAttackInputAction,
  nextInventoryFilterSelection,
  nextInventoryNavigation,
  nextInventoryEquipSelection,
  nextInventoryCloseAnvilModeAction,
  type InventoryAnvilModeCloseAction,
  type InventoryAnvilModeCloseActionInput,
  type InventoryAnvilPromptCancelAction,
  type InventoryAttackInputAction,
  type InventoryAnvilPromptCancelState,
} from './InventoryInteractionPolicy';

interface InventoryConfirmFacadeState {
  mode: InventoryUIMode;
  anvilState: InventoryAnvilState;
  filteredItems: readonly ItemInstance[];
  selectedIndex: number;
}

interface InventoryConfirmCommandOptions {
  canPlaceSelection?: (item: ItemInstance) => boolean;
}

interface InventoryCancelFacadeState {
  anvilState: InventoryAnvilState;
}

interface InventoryFilterFacadeState {
  items: readonly ItemInstance[];
  filter: FilterTab;
  mode: InventoryUIMode;
  anvilState: InventoryAnvilState;
}

export interface InventoryFilterActionResult {
  changed: boolean;
  filter: FilterTab;
  selectedIndex: number;
  scrollRowOffset: number;
}

interface InventoryNavigationFacadeState {
  selectedIndex: number;
  scrollRowOffset: number;
  mode: InventoryUIMode;
  anvilState: InventoryAnvilState;
}

export interface InventoryNavigationActionResult {
  changed: boolean;
  selectedIndex: number;
  scrollRowOffset: number;
}

type InventoryEquipCommand = { type: 'none' } | { type: 'equip'; item: ItemInstance };

interface InventoryEquipFacadeState {
  filteredItems: readonly ItemInstance[];
  selectedIndex: number;
}

interface InventoryConfirmActionContext {
  inventory: Inventory;
  anvilItem: ItemInstance | null;
  firstDiveDone?: boolean;
  canPlaceSelection?: (item: ItemInstance) => boolean;
}

interface InventoryConfirmActionInput extends InventoryConfirmFacadeState, InventoryConfirmActionContext {}

interface InventoryCancelActionContext {
  anvilItem: ItemInstance | null;
  filteredItems: readonly ItemInstance[];
  selectedIndex: number;
}

interface InventoryCancelActionInput extends InventoryCancelFacadeState, InventoryCancelActionContext {}

export interface InventoryCancelActionResult {
  type: 'none' | 'close' | 'remove-anvil';
  anvilItem: ItemInstance | null;
  anvilState: InventoryAnvilState;
  selectedIndex: number;
}

export interface InventoryConfirmActionResult {
  type: 'none' | 'equip' | 'place-anvil' | 'confirm-dive';
  equipUid?: number;
  anvilItem?: ItemInstance | null;
  anvilState?: InventoryAnvilState;
  selectedForCallback?: ItemInstance | null;
  anvilPulseTimer?: number;
}

function buildInventoryConfirmCommand(
  state: InventoryConfirmFacadeState,
  options: InventoryConfirmCommandOptions = {},
): { type: 'none' | 'confirm-dive' | 'place-anvil' | 'equip'; item?: ItemInstance | null } {
  const action = nextInventoryConfirmSelection(state.mode, state.anvilState, state.filteredItems, state.selectedIndex);
  if (action.type === 'confirm-dive') return { type: 'confirm-dive' };

  if (!action.item) return { type: 'none' };

  if (action.type === 'place-anvil') {
    if (!options.canPlaceSelection?.(action.item)) return { type: 'none' };
    return { type: 'place-anvil', item: action.item };
  }
  return { type: 'equip', item: action.item };
}

function buildInventoryCancelCommand(state: InventoryCancelFacadeState): 'none' | 'remove-anvil' | 'close' {
  const decision = nextInventoryCancelAction(state.anvilState);
  return decision.shouldRemoveAnvil ? 'remove-anvil' : decision.shouldClose ? 'close' : 'none';
}

function buildInventoryFilterCommand(state: InventoryFilterFacadeState): InventoryFilterActionResult {
  const next = nextInventoryFilterSelection(state.items, state.filter, state.mode, state.anvilState);
  return {
    changed: next.changed,
    filter: next.filter,
    selectedIndex: next.selectedIndex,
    scrollRowOffset: next.scrollRowOffset,
  };
}

export interface InventoryAttackInputState {
  mode: InventoryUIMode;
}

interface InventoryMenuFacadeState extends InventoryCancelActionInput {
  mode: InventoryUIMode;
}
export function executeInventoryFilterAction(
  state: InventoryFilterFacadeState,
): InventoryFilterActionResult {
  return buildInventoryFilterCommand(state);
}

function buildInventoryNavigationCommand(
  state: InventoryNavigationFacadeState,
  dir: GridDirection,
  count: number,
  gridCols: number,
  gridRows: number,
): InventoryNavigationActionResult {
  const next = nextInventoryNavigation(
    state.selectedIndex,
    state.scrollRowOffset,
    dir,
    count,
    gridCols,
    gridRows,
    state.mode,
    state.anvilState,
  );
  return {
    changed: next.changed,
    selectedIndex: next.selectedIndex,
    scrollRowOffset: next.scrollRowOffset,
  };
}

export function executeInventoryNavigationAction(
  state: InventoryNavigationFacadeState,
  dir: GridDirection,
  count: number,
  gridCols: number,
  gridRows: number,
): InventoryNavigationActionResult {
  return buildInventoryNavigationCommand(state, dir, count, gridCols, gridRows);
}

function buildInventoryEquipCommand(state: InventoryEquipFacadeState): InventoryEquipCommand {
  const selection = nextInventoryEquipSelection(state.filteredItems, state.selectedIndex);
  if (!selection.hasSelection || !selection.item) return { type: 'none' };
  return { type: 'equip', item: selection.item };
}

export function executeInventoryEquipAction(
  state: InventoryEquipFacadeState,
): InventoryEquipCommand {
  return buildInventoryEquipCommand(state);
}

export function executeInventoryAttackInput(
  state: InventoryAttackInputState,
): InventoryAttackInputAction {
  return nextInventoryAttackInputAction(state.mode);
}

export function executeInventoryMenuAction(
  input: InventoryMenuFacadeState,
): InventoryCancelActionResult {
  const shouldClose = shouldCloseInventoryOnMenu(input.mode);
  if (shouldClose) {
    return {
      type: 'close',
      anvilItem: input.anvilItem,
      anvilState: input.anvilState,
      selectedIndex: input.selectedIndex,
    };
  }

  return buildInventoryCancelActionResult(input);
}
export function executeInventoryAnvilPromptCancelAction(
  state: InventoryAnvilPromptCancelState,
): InventoryAnvilPromptCancelAction {
  return nextInventoryAnvilPromptCancelAction(state);
}

export function executeInventoryCloseAnvilModeAction(
  input: InventoryAnvilModeCloseActionInput,
): InventoryAnvilModeCloseAction {
  return nextInventoryCloseAnvilModeAction(input);
}

function buildInventoryCancelActionResult(
  input: InventoryCancelActionInput,
): InventoryCancelActionResult {
  const command = buildInventoryCancelCommand(input);
  if (command === 'none') {
    return {
      type: 'none',
      anvilItem: input.anvilItem,
      anvilState: input.anvilState,
      selectedIndex: input.selectedIndex,
    };
  }

  if (command === 'close') {
    return {
      type: 'close',
      anvilItem: null,
      anvilState: input.anvilState,
      selectedIndex: input.selectedIndex,
    };
  }

  const next = removeInventoryAnvilItem(input.filteredItems, input.anvilItem, input.selectedIndex);
  return {
    type: 'remove-anvil',
    anvilItem: next.anvilItem,
    anvilState: next.anvilState,
    selectedIndex: next.selectedIndex,
  };
}

export function executeInventoryCancelAction(
  input: InventoryCancelActionInput,
): InventoryCancelActionResult {
  return buildInventoryCancelActionResult(input);
}

function buildInventoryConfirmActionResult(
  input: InventoryConfirmActionInput,
  options: InventoryConfirmCommandOptions = {},
): InventoryConfirmActionResult {
  const canPlaceSelection = input.canPlaceSelection
    ?? ((item) => {
      if (input.firstDiveDone === false) return true;
      if (input.firstDiveDone === true) return ensureInventoryAnvilPlacementAllowed(input.inventory, item, true);
      return ensureInventoryAnvilPlacementAllowed(input.inventory, item, input.inventory.getWeaponAtk() > 0);
    });

  const action = buildInventoryConfirmCommand(
    {
      mode: input.mode,
      anvilState: input.anvilState,
      filteredItems: input.filteredItems,
      selectedIndex: input.selectedIndex,
    },
    { ...options, canPlaceSelection },
  );

  if (action.type === 'confirm-dive') {
    const next = confirmInventoryAnvilDive(input.anvilItem);
    return {
      type: 'confirm-dive',
      anvilItem: next.anvilItem,
      anvilState: next.anvilState,
      selectedForCallback: next.confirmedItem,
    };
  }

  if (action.type === 'place-anvil' && action.item) {
    const next = placeInventoryAnvilItem(action.item);
    return {
      type: 'place-anvil',
      anvilItem: next.anvilItem,
      anvilState: next.anvilState,
      anvilPulseTimer: 0,
    };
  }

  if (action.type === 'equip' && action.item) {
    return {
      type: 'equip',
      equipUid: action.item.uid,
    };
  }

  return { type: 'none' };
}

export function executeInventoryConfirmAction(
  input: InventoryConfirmActionInput,
  options: InventoryConfirmCommandOptions = {},
): InventoryConfirmActionResult {
  return buildInventoryConfirmActionResult(input, options);
}

