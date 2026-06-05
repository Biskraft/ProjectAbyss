import type { Camera } from '@core/Camera';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';

interface WorldPromptProjectionOptions {
  camera: Pick<Camera, 'renderX' | 'renderY' | 'zoom'>;
  uiScale: number;
  worldX: number;
  worldY: number;
}

export function projectWorldToUi({
  camera,
  uiScale,
  worldX,
  worldY,
}: WorldPromptProjectionOptions): { x: number; y: number } {
  const zoom = camera.zoom;
  const rtW = Math.ceil(GAME_WIDTH / zoom);
  const rtH = Math.ceil(GAME_HEIGHT / zoom);
  const scaleX = GAME_WIDTH / rtW;
  const scaleY = GAME_HEIGHT / rtH;

  return {
    x: (worldX - camera.renderX + rtW / 2) * scaleX * uiScale,
    y: (worldY - camera.renderY + rtH / 2) * scaleY * uiScale,
  };
}
