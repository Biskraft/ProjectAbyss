import { Container, Graphics } from 'pixi.js';
import { destroyDisplayObject } from '../../scenes/shared/DisplayObjectLifecycleHelpers';
import { createInventoryColumnDividers } from './InventoryPanelChrome';

export function redrawInventoryColumnDividers(
  panel: Container,
  previous: Graphics | null,
): Graphics {
  if (previous) {
    destroyDisplayObject(previous);
  }

  const dividers = createInventoryColumnDividers();
  panel.addChildAt(dividers, 1);
  return dividers;
}
