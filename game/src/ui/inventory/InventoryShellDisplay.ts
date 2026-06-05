import { Container, Graphics } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';
import {
  CONTENT_START_Y,
  GRID_COL_X,
  INFO_COL_X,
  PADDING_V,
  STATUS_COL_X,
  TITLE_GAP,
  TITLE_H,
} from './InventoryConstants';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

export interface InventoryShellNodes {
  container: Container;
  panel: Container;
  panelBg: Graphics;
  tabsArea: Container;
  gridArea: Container;
  infoArea: Container;
  statusArea: Container;
}

export function createInventoryShell(uiScale: number): InventoryShellNodes {
  const container = new Container();
  container.scale.set(uiScale);
  container.visible = false;

  const overlay = new Graphics();
  overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.5 });
  container.addChild(overlay);

  const panel = new Container();
  container.addChild(panel);

  const panelBg = new Graphics();
  panel.addChild(panelBg);

  const tabsArea = new Container();
  tabsArea.x = GRID_COL_X;
  tabsArea.y = PADDING_V + TITLE_H + TITLE_GAP;
  panel.addChild(tabsArea);

  const gridArea = new Container();
  gridArea.x = GRID_COL_X;
  gridArea.y = CONTENT_START_Y;
  panel.addChild(gridArea);

  const infoArea = new Container();
  infoArea.x = INFO_COL_X;
  infoArea.y = CONTENT_START_Y;
  panel.addChild(infoArea);

  const statusArea = new Container();
  statusArea.x = STATUS_COL_X;
  statusArea.y = CONTENT_START_Y;
  panel.addChild(statusArea);

  return {
    container,
    panel,
    panelBg,
    tabsArea,
    gridArea,
    infoArea,
    statusArea,
  };
}

export function clearInventoryContainer(container: Container): void {
  for (const child of [...container.children]) {
    destroyDisplayObject(child, { children: true });
  }
}
