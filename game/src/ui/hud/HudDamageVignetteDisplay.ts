import { Graphics } from 'pixi.js';

export function createHudDamageVignette(): Graphics {
  const gfx = new Graphics();
  gfx.alpha = 0;
  return gfx;
}

export function drawHudDamageVignette(
  gfx: Graphics,
  alpha: number,
  screenWidth: number,
  screenHeight: number,
  margin: number,
): void {
  gfx.clear();
  if (alpha <= 0) {
    gfx.alpha = 0;
    return;
  }

  gfx.alpha = 1;
  const fill = { color: 0xaa0000, alpha };
  gfx.rect(0, 0, screenWidth, margin).fill(fill);
  gfx.rect(0, screenHeight - margin, screenWidth, margin).fill(fill);
  gfx.rect(0, 0, margin, screenHeight).fill(fill);
  gfx.rect(screenWidth - margin, 0, margin, screenHeight).fill(fill);
}
