import type { Container, Graphics, Sprite } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../Game';
import type { Player } from '@entities/Player';

export interface SavePointEntry {
  x: number;
  y: number;
  gfx: Graphics;
  sprite?: Sprite;
  prompt?: Container;
}

interface SavePointPulse {
  attach(x: number, y: number): void;
  detach(): void;
}

interface UpdateSavePointsDeps {
  game: Game;
  player: Player;
  savePoints: SavePointEntry[];
  savepointPulse: SavePointPulse;
  saveHintShown: boolean;
}

interface UpdateSavePointsResult {
  saveHintShown: boolean;
}

export function updateSavePointProximity({
  game,
  player,
  savePoints,
  savepointPulse,
  saveHintShown,
}: UpdateSavePointsDeps): UpdateSavePointsResult {
  const pcx = player.x + player.width / 2;
  const pcy = player.y + player.height / 2;
  const range = 32;

  let nearSave = false;
  let nearSavePt: { x: number; y: number } | null = null;
  for (const sp of savePoints) {
    const dx = Math.abs(pcx - sp.x);
    const dy = Math.abs(pcy - sp.y);
    if (dx < range && dy < range) {
      nearSave = true;
      nearSavePt = { x: sp.x, y: sp.y };
      const a = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;
      sp.gfx.alpha = a;
      if (sp.sprite) sp.sprite.alpha = a;
      if (sp.prompt) {
        sp.prompt.visible = true;
        const us = game.uiScale;
        const cam = game.camera;
        const sx = (sp.x - cam.renderX + GAME_WIDTH / 2) * us - sp.prompt.width / 2;
        const sy = (sp.y - cam.renderY + GAME_HEIGHT / 2 - 56) * us;
        sp.prompt.x = Math.round(sx);
        sp.prompt.y = Math.round(sy);
      }
    } else {
      sp.gfx.alpha = 0.6;
      if (sp.sprite) sp.sprite.alpha = 1.0;
      if (sp.prompt) sp.prompt.visible = false;
    }
  }

  if (nearSave) {
    if (nearSavePt) savepointPulse.attach(nearSavePt.x, nearSavePt.y);
    return { saveHintShown: true };
  }

  if (saveHintShown) {
    savepointPulse.detach();
  } else {
    savepointPulse.detach();
  }
  return { saveHintShown: false };
}

export function snapPlayerToNearestSavePoint(
  player: Player,
  savePoints: SavePointEntry[],
  game: Game,
): void {
  if (savePoints.length === 0) return;

  const pcx = player.x + player.width / 2;
  let closest = savePoints[0];
  let bestDist = Infinity;
  for (const sp of savePoints) {
    const d = Math.abs(sp.x - pcx);
    if (d < bestDist) {
      bestDist = d;
      closest = sp;
    }
  }

  player.x = closest.x - player.width / 2;
  player.y = closest.y - player.height;
  player.vx = 0;
  player.vy = 0;
  player.savePrevPosition();
  game.camera.snap(
    player.x + player.width / 2,
    player.y + player.height / 2,
  );
}
