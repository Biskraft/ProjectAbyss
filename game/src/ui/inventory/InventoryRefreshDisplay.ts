import type { Container, Graphics } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import type { Inventory } from '@items/Inventory';
import type { UnifiedGridData } from '@level/RoomGrid';
import type { UISkin } from '../UISkin';
import { redrawInventoryChrome } from './InventoryChromeRefreshDisplay';
import { drawInventoryGrid } from './InventoryGridDisplay';
import { drawInventoryItemInfoPanel } from './InventoryItemInfoPanelDisplay';
import { drawInventoryAnvilSlotPanel } from './InventoryAnvilSlotPanelDisplay';
import { drawInventoryAnvilRadialMap } from './InventoryAnvilRadialStatsDisplay';
import type { InventoryTitleNode } from './InventoryTitleDisplay';
import { clearInventoryContainer } from './InventoryShellDisplay';
import { drawInventoryRightColumn, type InventoryStatsLike } from './InventoryRightColumnDisplay';
import type { InventoryStratumNoiseLayer } from './InventoryStratumCardDisplay';
import type { InventorySelectionPulseRect } from './InventorySelectionPulse';
import { selectedInventoryItem, type FilterTab } from './InventorySelection';
import type { InventoryUIMode } from './InventoryVisibilityStatePolicy';

export interface InventoryRefreshDisplayArgs {
  panel: Container;
  panelBg: Graphics;
  tabsArea: Container;
  gridArea: Container;
  infoArea: Container;
  statusArea: Container;
  skin: UISkin | null;
  mode: InventoryUIMode;
  filter: FilterTab;
  filteredItems: readonly ItemInstance[];
  selectedIndex: number;
  scrollRowOffset: number;
  inventory: Inventory;
  anvilItem: ItemInstance | null;
  anvilPulseTimer: number;
  selectionPulseTimer: number;
  abyssNoiseTick: number;
  playerStats: InventoryStatsLike | null;
  unifiedGridCache: Map<string, UnifiedGridData | null>;
  panelFrame: Container | null;
  columnDividers: Graphics | null;
  titleNodes: InventoryTitleNode[];
}

export interface InventoryRefreshDisplayResult {
  panelFrame: Container | null;
  columnDividers: Graphics | null;
  titleNodes: InventoryTitleNode[];
  selectionPulseOverlay: Graphics | null;
  selectionPulseRect: InventorySelectionPulseRect | null;
  anvilPulseOverlay: Graphics | null;
  anvilPulseRect: { w: number; h: number } | null;
  divePromptIcon: Container | null;
  divePromptLabel: Container | null;
  abyssNoiseLayers: InventoryStratumNoiseLayer[];
}

export function redrawInventoryUi(args: InventoryRefreshDisplayArgs): InventoryRefreshDisplayResult {
  const chrome = redrawInventoryChrome(args.panel, args.panelBg, args.tabsArea, args.skin, args.mode, args.filter, {
    panelFrame: args.panelFrame,
    columnDividers: args.columnDividers,
    titleNodes: args.titleNodes,
  });

  const grid = drawInventoryGrid(
    args.gridArea,
    args.filteredItems,
    args.selectedIndex,
    args.scrollRowOffset,
    args.inventory.equipped?.uid,
    args.anvilItem?.uid,
    args.mode === 'anvil',
    args.selectionPulseTimer,
  );

  const info = drawInventoryInfoArea(args);
  const rightColumn = drawInventoryRightColumn({
    statusArea: args.statusArea,
    mode: args.mode,
    filteredItems: args.filteredItems,
    playerStats: args.playerStats,
    selectedIndex: args.selectedIndex,
    anvilItem: args.anvilItem,
    equippedItem: args.inventory.equipped,
    abyssNoiseTick: args.abyssNoiseTick,
    unifiedGridCache: args.unifiedGridCache,
  });

  return {
    panelFrame: chrome.panelFrame,
    columnDividers: chrome.columnDividers,
    titleNodes: chrome.titleNodes,
    selectionPulseOverlay: grid.selectionPulseOverlay,
    selectionPulseRect: grid.selectionPulseRect,
    anvilPulseOverlay: info.anvilPulseOverlay,
    anvilPulseRect: info.anvilPulseRect,
    divePromptIcon: info.divePromptIcon,
    divePromptLabel: info.divePromptLabel,
    abyssNoiseLayers: rightColumn.abyssNoiseLayers,
  };
}

function drawInventoryInfoArea(args: InventoryRefreshDisplayArgs): Pick<
  InventoryRefreshDisplayResult,
  'anvilPulseOverlay' | 'anvilPulseRect' | 'divePromptIcon' | 'divePromptLabel'
> {
  clearInventoryContainer(args.infoArea);

  if (args.mode !== 'anvil') {
    drawInventoryItemInfoPanel(
      args.infoArea,
      args.filteredItems[args.selectedIndex],
      args.inventory.equipped ?? undefined,
    );
    return {
      anvilPulseOverlay: null,
      anvilPulseRect: null,
      divePromptIcon: null,
      divePromptLabel: null,
    };
  }

  const slotPanel = drawInventoryAnvilSlotPanel(
    args.infoArea,
    args.anvilItem,
    selectedInventoryItem(args.filteredItems, args.selectedIndex),
    args.anvilPulseTimer,
  );

  if (slotPanel.activeItem) {
    const playerAtk = args.inventory.getWeaponAtk() || (args.playerStats?.atk ?? 0);
    drawInventoryAnvilRadialMap(args.infoArea, slotPanel.activeItem, slotPanel.radialBaseY, playerAtk);
  }

  return {
    anvilPulseOverlay: slotPanel.anvilPulseOverlay,
    anvilPulseRect: slotPanel.anvilPulseRect,
    divePromptIcon: slotPanel.divePromptIcon,
    divePromptLabel: slotPanel.divePromptLabel,
  };
}
