import { Container, Graphics } from 'pixi.js';
import { create9SlicePanel } from '../ModalPanel';
import type { UISkin } from '../UISkin';
import { destroyDisplayObject } from '../../scenes/shared/DisplayObjectLifecycleHelpers';
import { drawInventoryPanelBackground } from './InventoryPanelChrome';

export function redrawInventoryPanelFrame(
  panel: Container,
  panelBg: Graphics,
  previousFrame: Container | null,
  skin: UISkin | null,
  width: number,
  height: number,
): Container | null {
  panelBg.clear();
  if (previousFrame) {
    destroyDisplayObject(previousFrame, { children: true });
  }

  if (skin?.isLoaded) {
    const frame = create9SlicePanel(skin, width, height);
    if (frame) {
      panel.addChildAt(frame, 0);
      return frame;
    }
  }

  drawInventoryPanelBackground(panelBg);
  return null;
}
