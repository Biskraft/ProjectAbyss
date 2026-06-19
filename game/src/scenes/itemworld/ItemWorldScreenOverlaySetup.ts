import { Graphics, type Container } from 'pixi.js';
import type { Game } from '../../Game';
import { ScreenFlash } from '@effects/ScreenFlash';

export interface ItemWorldScreenOverlaySetupResult {
  screenFlash: ScreenFlash;
  fadeOverlay: Graphics;
}

export function setupItemWorldScreenOverlays(
  game: Game,
  sceneContainer: Container,
): ItemWorldScreenOverlaySetupResult {
  const screenFlash = new ScreenFlash();
  game.legacyUIContainer.addChild(screenFlash.overlay);

  const fadeOverlay = new Graphics();
  fadeOverlay.rect(0, 0, 960, 544).fill(0x000000);
  fadeOverlay.alpha = 0;
  sceneContainer.addChild(fadeOverlay);

  return { screenFlash, fadeOverlay };
}
