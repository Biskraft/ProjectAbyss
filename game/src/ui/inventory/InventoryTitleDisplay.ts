import { Container } from 'pixi.js';
import { t } from '@i18n';
import { createUiText } from '../factories';
import { destroyDisplayObject } from '../../scenes/shared/DisplayObjectLifecycleHelpers';
import {
  COL_DIM,
  GRID_COL_X,
  INFO_COL_X,
  PADDING_H,
  PADDING_V,
  STATUS_COL_X,
} from './InventoryConstants';

export type InventoryTitleNode = ReturnType<typeof createUiText>;

export function redrawInventoryTitleNodes(
  panel: Container,
  existingNodes: readonly InventoryTitleNode[],
  mode: 'inventory' | 'anvil',
): InventoryTitleNode[] {
  for (const title of existingNodes) {
    destroyDisplayObject(title);
  }

  if (mode === 'anvil') {
    const headers: { key: string; x: number }[] = [
      { key: 'ui.inventory.title_anvil', x: GRID_COL_X },
      { key: 'ui.inventory.button_anvil', x: INFO_COL_X },
      { key: 'ui.inventory.stratum_header', x: STATUS_COL_X },
    ];
    const created: InventoryTitleNode[] = [];
    for (const header of headers) {
      const text = createUiText(t(header.key), { fontSize: 9, fill: COL_DIM });
      text.x = header.x;
      text.y = PADDING_V;
      panel.addChild(text);
      created.push(text);
    }
    return created;
  }

  const title = createUiText(t('ui.inventory.title'), { fontSize: 9, fill: COL_DIM });
  title.x = PADDING_H;
  title.y = PADDING_V;
  panel.addChild(title);
  return [title];
}
