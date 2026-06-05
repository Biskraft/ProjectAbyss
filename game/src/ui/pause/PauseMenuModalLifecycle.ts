import { Container, Graphics } from 'pixi.js';
import { destroyDisplayObject } from '../../scenes/shared/DisplayObjectLifecycleHelpers';
import { redrawPauseMenuPulse } from './PauseMenuPulse';

export interface PauseModalPanelParts {
  panel: Container;
  pulseG: Graphics;
  pulseRect: { w: number; h: number };
}

export interface MountedPauseModalPanel {
  panel: Container;
  pulseG: Graphics;
  pulseRect: { w: number; h: number };
  pulseTimer: number;
}

export function mountPauseModalPanel(
  parent: Container,
  currentPanel: Container | null,
  nextPanel: PauseModalPanelParts,
): MountedPauseModalPanel {
  destroyPauseModalPanel(currentPanel);
  parent.addChild(nextPanel.panel);
  return {
    panel: nextPanel.panel,
    pulseG: nextPanel.pulseG,
    pulseRect: nextPanel.pulseRect,
    pulseTimer: 0,
  };
}

export function mountPauseModalPanelAndApply(
  parent: Container,
  currentPanel: Container | null,
  nextPanel: PauseModalPanelParts,
  applyMounted: (mounted: MountedPauseModalPanel) => void,
): void {
  applyMounted(mountPauseModalPanel(parent, currentPanel, nextPanel));
}

export function mountPauseModalPanelAndRedraw(
  parent: Container,
  currentPanel: Container | null,
  nextPanel: PauseModalPanelParts,
  applyMounted: (mounted: MountedPauseModalPanel) => void,
): void {
  const mounted = mountPauseModalPanel(parent, currentPanel, nextPanel);
  applyMounted(mounted);
  redrawPauseMenuPulse(mounted.pulseG, mounted.pulseRect, mounted.pulseTimer);
}

export function destroyPauseModalPanel(panel: Container | null): void {
  if (!panel) return;
  destroyDisplayObject(panel, { children: true });
}

export function destroyPauseModalPanelAndApply(
  panel: Container | null,
  applyDestroyed: () => void,
): void {
  destroyPauseModalPanel(panel);
  applyDestroyed();
}
