import { Container, Graphics } from 'pixi.js';
import type { UISkin } from '../UISkin';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';
import { redrawInventoryColumnDividers } from './InventoryColumnDividerDisplay';
import { redrawInventoryPanelFrame } from './InventoryPanelFrameDisplay';
import { drawInventoryFilterTabs } from './InventoryFilterTabs';
import { centeredPanelPosition } from './InventoryLayout';
import { FILTER_TABS, type FilterTab } from './InventorySelection';
import { PANEL_H, PANEL_W } from './InventoryConstants';
import { redrawInventoryTitleNodes, type InventoryTitleNode } from './InventoryTitleDisplay';
import type { InventoryUIMode } from './InventoryVisibilityStatePolicy';

export interface InventoryChromeRefreshState {
  panelFrame: Container | null;
  columnDividers: Graphics | null;
  titleNodes: InventoryTitleNode[];
}

export function redrawInventoryChrome(
  panel: Container,
  panelBg: Graphics,
  tabsArea: Container,
  skin: UISkin | null,
  mode: InventoryUIMode,
  filter: FilterTab,
  state: InventoryChromeRefreshState,
): InventoryChromeRefreshState {
  const panelPos = centeredPanelPosition(GAME_WIDTH, GAME_HEIGHT, PANEL_W, PANEL_H);
  panel.x = panelPos.x;
  panel.y = panelPos.y;

  const panelFrame = redrawInventoryPanelFrame(panel, panelBg, state.panelFrame, skin, PANEL_W, PANEL_H);
  const titleNodes = redrawInventoryTitleNodes(panel, state.titleNodes, mode);
  const columnDividers = redrawInventoryColumnDividers(panel, state.columnDividers);
  drawInventoryFilterTabs(tabsArea, FILTER_TABS, filter);

  return { panelFrame, columnDividers, titleNodes };
}
