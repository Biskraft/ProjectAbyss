import type { Camera } from '@core/Camera';
import type { Portal } from '@entities/Portal';
import { PortalTransition } from '@effects/PortalTransition';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';

export function createLegacyWorldPortalTransition(portal: Portal, camera: Pick<Camera, 'renderX' | 'renderY'>): PortalTransition {
  const screenX = portal.x - camera.renderX + GAME_WIDTH / 2;
  const screenY = portal.y - camera.renderY + GAME_HEIGHT / 2;
  return new PortalTransition(
    screenX,
    screenY,
    portal.rarity,
    portal.sourceType,
    portal.sourceItem,
  );
}
