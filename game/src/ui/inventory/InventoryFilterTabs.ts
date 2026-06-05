import { Container, Graphics } from 'pixi.js';
import { createUiText } from '../factories';
import {
  COL_BORDER,
  COL_DIM,
  COL_EQUIPPED_BAR,
  GRID_W,
  TAB_H,
} from './InventoryConstants';
import type { FilterTab } from './InventorySelection';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

export function drawInventoryFilterTabs(
  tabsArea: Container,
  tabs: readonly FilterTab[],
  activeFilter: FilterTab,
): void {
  for (const child of [...tabsArea.children]) {
    destroyDisplayObject(child, { children: true });
  }

  const tabW = Math.floor((GRID_W - (tabs.length - 1) * 2) / tabs.length);
  tabs.forEach((tab, index) => {
    const x = index * (tabW + 2);
    const isActive = tab === activeFilter;

    const bg = new Graphics();
    if (isActive) {
      bg.rect(x, 0, tabW, TAB_H).fill({ color: COL_EQUIPPED_BAR, alpha: 0.18 });
      bg.rect(x, 0, tabW, TAB_H).stroke({ color: COL_EQUIPPED_BAR, width: 1 });
    } else {
      bg.rect(x, 0, tabW, TAB_H).fill({ color: 0x111111, alpha: 0.3 });
      bg.rect(x, 0, tabW, TAB_H).stroke({ color: COL_BORDER, width: 1 });
    }
    tabsArea.addChild(bg);

    const label = createUiText(tab, { fontSize: 8, fill: isActive ? COL_EQUIPPED_BAR : COL_DIM });
    label.x = x + Math.floor((tabW - label.width) / 2);
    label.y = Math.floor((TAB_H - (label.height ?? 8)) / 2) + 1;
    tabsArea.addChild(label);
  });
}
