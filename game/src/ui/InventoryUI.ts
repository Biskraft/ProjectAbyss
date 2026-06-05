import { Container, Graphics } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import type { Inventory } from '@items/Inventory';
import type { UnifiedGridData } from '@level/RoomGrid';
import type { UISkin } from './UISkin';
import {
  filterInventoryItems,
  selectedInventoryItem,
  type FilterTab,
  type GridDirection,
} from './inventory/InventorySelection';
import type { InventoryTitleNode } from './inventory/InventoryTitleDisplay';
import { createInventoryShell } from './inventory/InventoryShellDisplay';
import { redrawInventoryUi } from './inventory/InventoryRefreshDisplay';
import type { InventoryStratumNoiseLayer } from './inventory/InventoryStratumCardDisplay';
import {
  type InventoryAnvilState,
} from './inventory/InventoryAnvilStatePolicy';
import {
  runCloseInventoryVisibilityTransition,
  runOpenInventoryVisibilityTransition,
  type InventoryVisibilityTransitionBinding,
  type InventoryUIMode,
} from './inventory/InventoryVisibilityStatePolicy';
import { updateInventoryPulses } from './inventory/InventoryPulseUpdatePolicy';
import {
  GRID_COLS,
  GRID_ROWS,
} from './inventory/InventoryConstants';
import {
  executeInventoryAnvilPromptCancelAction,
  executeInventoryCancelAction,
  executeInventoryConfirmAction,
  executeInventoryAttackInput,
  executeInventoryMenuAction,
  executeInventoryCloseAnvilModeAction,
  executeInventoryEquipAction,
  executeInventoryFilterAction,
  executeInventoryNavigationAction,
} from './inventory/InventoryInteractionFacade';

interface InventoryUiSaveAccess {
  isFirstDiveDone: () => boolean;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  atk: number;
  abilities: string[];
}

export type { InventoryUIMode };

export type InventoryAttackInputResult = 'none' | 'confirmed_equipment_change';

export class InventoryUI {
  container: Container;
  visible = false;

  private inventory: Inventory;
  private selectedIndex = 0; // index within filteredItems()
  private scrollRowOffset = 0;
  private filter: FilterTab = 'ALL';

  private panel: Container;
  private panelBg: Graphics;
  private panelFrame: Container | null = null;
  private columnDividers: Graphics | null = null;

  private tabsArea: Container;
  private gridArea: Container;
  private infoArea: Container;
  private statusArea: Container;
  private titleNodes: InventoryTitleNode[] = [];

  private mode: InventoryUIMode = 'inventory';
  private onSelect: ((item: ItemInstance) => void) | null = null;

  /** Scene hook for toggling HUD/minimap when inventory visibility changes. */
  onVisibilityChange?: (visible: boolean) => void;

  private skin: UISkin | null = null;
  private playerStats: PlayerStats | null = null;
  private readonly saveAccess: InventoryUiSaveAccess;

  // Anvil 2-stage
  private anvilState: InventoryAnvilState = 'selecting';
  private anvilItem: ItemInstance | null = null;
  private anvilPulseOverlay: Graphics | null = null;
  private anvilPulseRect: { w: number; h: number } | null = null;
  private anvilPulseTimer = 0;
  private divePromptIcon: Container | null = null;
  private divePromptLabel: Container | null = null;

  // Selection pulse
  private selectionPulseOverlay: Graphics | null = null;
  private selectionPulseRect: { w: number; h: number } | null = null;
  private selectionPulseTimer = 0;

  private abyssNoiseLayers: InventoryStratumNoiseLayer[] = [];
  private abyssNoiseTimer = 0;
  private abyssNoiseTick = 0;

  private unifiedGridCache = new Map<string, UnifiedGridData | null>();
  private readonly visibilityTransitionStateBinding: Pick<InventoryVisibilityTransitionBinding, 'readState' | 'writeState'> = {
    readState: () => ({
      mode: this.mode,
      onSelect: this.onSelect,
      visible: this.visible,
      anvilState: this.anvilState,
      anvilItem: this.anvilItem,
      scrollRowOffset: this.scrollRowOffset,
      filter: this.filter,
      selectedIndex: this.selectedIndex,
    }),
    writeState: (state) => {
      this.mode = state.mode;
      this.onSelect = state.onSelect;
      this.visible = state.visible;
      this.anvilState = state.anvilState;
      this.anvilItem = state.anvilItem;
      this.scrollRowOffset = state.scrollRowOffset;
      this.filter = state.filter;
      this.selectedIndex = state.selectedIndex;
    },
  };

  setInventory(inventory: Inventory): void { this.inventory = inventory; }
  setSkin(skin: UISkin): void { this.skin = skin; }
  setPlayerStats(stats: PlayerStats): void { this.playerStats = stats; }

  constructor(inventory: Inventory, uiScale: number = 1, saveAccess: InventoryUiSaveAccess) {
    this.inventory = inventory;
    this.saveAccess = saveAccess;
    const shell = createInventoryShell(uiScale);
    this.container = shell.container;
    this.panel = shell.panel;
    this.panelBg = shell.panelBg;
    this.tabsArea = shell.tabsArea;
    this.gridArea = shell.gridArea;
    this.infoArea = shell.infoArea;
    this.statusArea = shell.statusArea;
  }

  toggle(): void {
    if (this.visible) { this.close(); return; }
    this.open('inventory', null);
  }

  open(mode: InventoryUIMode, onSelect: ((item: ItemInstance) => void) | null): void {
    runOpenInventoryVisibilityTransition(
      mode,
      onSelect,
      filterInventoryItems(this.inventory.items, 'ALL').length,
      this.visible,
      {
        ...this.visibilityTransitionStateBinding,
        setContainerVisible: (visible) => { this.container.visible = visible; },
        onVisibilityChange: this.onVisibilityChange,
        onTemplatesPrepared: () => this.refresh(),
      },
      { afterApply: () => this.refresh() },
    );
  }

  openForAnvil(onSelect: (item: ItemInstance) => void): void {
    this.open('anvil', onSelect);
  }

  close(): void {
    runCloseInventoryVisibilityTransition(
      this.visible,
      {
      ...this.visibilityTransitionStateBinding,
      setContainerVisible: (visible) => { this.container.visible = visible; },
      onVisibilityChange: this.onVisibilityChange,
      },
    );
  }


  confirmSelected(): void {
    const result = executeInventoryConfirmAction({
      inventory: this.inventory,
      mode: this.mode,
      anvilState: this.anvilState,
      firstDiveDone: this.saveAccess.isFirstDiveDone(),
      filteredItems: this.filteredItems,
      selectedIndex: this.selectedIndex,
      anvilItem: this.anvilItem,
    });
    if (result.type === 'none') return;

    if (result.type === 'equip' && result.equipUid !== undefined) {
      this.inventory.equip(result.equipUid);
      this.refresh();
      return;
    }

    if (result.type === 'place-anvil') {
      if (result.anvilItem == null || result.anvilState === undefined || result.anvilPulseTimer === undefined) return;
      this.anvilItem = result.anvilItem;
      this.anvilState = result.anvilState;
      this.anvilPulseTimer = result.anvilPulseTimer;
      this.refresh();
      return;
    }

    this.anvilItem = result.anvilItem ?? null;
    this.anvilState = result.anvilState ?? this.anvilState;
    if (result.selectedForCallback) {
      this.onSelect?.(result.selectedForCallback);
    }
    if (this.visible) {
      this.refresh();
    }
  }

  cancelAnvil(): void {
    const result = executeInventoryCancelAction({
      anvilState: this.anvilState,
      anvilItem: this.anvilItem,
      filteredItems: this.filteredItems,
      selectedIndex: this.selectedIndex,
    });
    if (result.type === 'none') return;
    if (result.type === 'close') {
      this.close();
      return;
    }

    this.anvilItem = result.anvilItem;
    this.anvilState = result.anvilState;
    this.selectedIndex = result.selectedIndex;
    this.refresh();
  }

  handleAttackInput(): InventoryAttackInputResult {
    const attackResult = executeInventoryAttackInput({ mode: this.mode });
    if (attackResult === 'confirm-anvil') {
      this.confirmSelected();
      return 'none';
    }
    if (attackResult === 'confirmed_equipment_change') {
      this.confirmSelected();
    }
    return attackResult;
  }

  handleMenuInput(): void {
    const cancelResult = executeInventoryMenuAction({
      mode: this.mode,
      anvilState: this.anvilState,
      anvilItem: this.anvilItem,
      filteredItems: this.filteredItems,
      selectedIndex: this.selectedIndex,
    });
    if (cancelResult.type === 'none') return;
    if (cancelResult.type === 'close') {
      this.close();
      return;
    }
    this.anvilItem = cancelResult.anvilItem;
    this.anvilState = cancelResult.anvilState;
    this.selectedIndex = cancelResult.selectedIndex;
    this.refresh();
  }

  closeIfAnvilModeOpen(): void {
    const action = executeInventoryCloseAnvilModeAction({
      mode: this.mode,
      visible: this.visible,
    });
    if (action !== 'handle-anvil-menu-close') return;
    this.handleMenuInput();
  }

  handleAnvilCyclePromptCancel(reopenAltarSelect: () => void): void {
    const action = executeInventoryAnvilPromptCancelAction({ visible: this.visible, mode: this.mode });
    if (action === 'refresh') {
      this.refresh();
      return;
    }
    reopenAltarSelect();
  }

  getSelectedItem(): ItemInstance | undefined {
    return selectedInventoryItem(this.filteredItems, this.selectedIndex);
  }

  cycleFilter(): void {
    const next = executeInventoryFilterAction({
      items: this.inventory.items,
      filter: this.filter,
      mode: this.mode,
      anvilState: this.anvilState,
    });
    if (!next.changed) return;
    this.filter = next.filter;
    this.scrollRowOffset = next.scrollRowOffset;
    this.selectedIndex = next.selectedIndex;
    this.refresh();
  }

  navigate(dir: GridDirection): void {
    const next = executeInventoryNavigationAction(
      {
        selectedIndex: this.selectedIndex,
        scrollRowOffset: this.scrollRowOffset,
        mode: this.mode,
        anvilState: this.anvilState,
      },
      dir,
      this.filteredItems.length,
      GRID_COLS,
      GRID_ROWS,
    );
    if (!next.changed) return;
    this.selectedIndex = next.selectedIndex;
    this.scrollRowOffset = next.scrollRowOffset;
    this.refresh();
  }

  equipSelected(): void {
    const next = executeInventoryEquipAction({
      filteredItems: this.filteredItems,
      selectedIndex: this.selectedIndex,
    });
    if (next.type === 'none' || !next.item) return;
    this.inventory.equip(next.item.uid);
    this.refresh();
  }

  // Main refresh
  refresh(): void {
    const result = redrawInventoryUi({
      panel: this.panel,
      panelBg: this.panelBg,
      tabsArea: this.tabsArea,
      gridArea: this.gridArea,
      infoArea: this.infoArea,
      statusArea: this.statusArea,
      skin: this.skin,
      mode: this.mode,
      filter: this.filter,
      filteredItems: this.filteredItems,
      selectedIndex: this.selectedIndex,
      scrollRowOffset: this.scrollRowOffset,
      inventory: this.inventory,
      anvilItem: this.anvilItem,
      anvilPulseTimer: this.anvilPulseTimer,
      selectionPulseTimer: this.selectionPulseTimer,
      abyssNoiseTick: this.abyssNoiseTick,
      playerStats: this.playerStats,
      unifiedGridCache: this.unifiedGridCache,
      panelFrame: this.panelFrame,
      columnDividers: this.columnDividers,
      titleNodes: this.titleNodes,
    });
    this.panelFrame = result.panelFrame;
    this.columnDividers = result.columnDividers;
    this.titleNodes = result.titleNodes;
    this.selectionPulseOverlay = result.selectionPulseOverlay;
    this.selectionPulseRect = result.selectionPulseRect;
    this.anvilPulseOverlay = result.anvilPulseOverlay;
    this.anvilPulseRect = result.anvilPulseRect;
    this.divePromptIcon = result.divePromptIcon;
    this.divePromptLabel = result.divePromptLabel;
    this.abyssNoiseLayers = result.abyssNoiseLayers;
  }


  private get filteredItems(): ItemInstance[] {
    return filterInventoryItems(this.inventory.items, this.filter);
  }


  update(dt: number): void {
    if (!this.visible) return;
    const next = updateInventoryPulses({
      selectionPulseTimer: this.selectionPulseTimer,
      anvilPulseTimer: this.anvilPulseTimer,
      abyssNoiseTimer: this.abyssNoiseTimer,
      abyssNoiseTick: this.abyssNoiseTick,
    }, {
      selectionPulseOverlay: this.selectionPulseOverlay,
      selectionPulseRect: this.selectionPulseRect,
      anvilPulseOverlay: this.anvilPulseOverlay,
      anvilPulseRect: this.anvilPulseRect,
      divePromptIcon: this.divePromptIcon,
      divePromptLabel: this.divePromptLabel,
      abyssNoiseLayers: this.abyssNoiseLayers,
    }, dt, this.mode);
    this.selectionPulseTimer = next.selectionPulseTimer;
    this.anvilPulseTimer = next.anvilPulseTimer;
    this.abyssNoiseTimer = next.abyssNoiseTimer;
    this.abyssNoiseTick = next.abyssNoiseTick;
  }
}

