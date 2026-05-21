import { Graphics } from 'pixi.js';

const DEFAULT_PAD = 512;

export function createBoundsGuard(width: number, height: number, color = 0x050608, pad = DEFAULT_PAD): Graphics {
  const g = new Graphics();
  g.rect(-pad, -pad, width + pad * 2, pad).fill(color);
  g.rect(-pad, height, width + pad * 2, pad).fill(color);
  g.rect(-pad, 0, pad, height).fill(color);
  g.rect(width, 0, pad, height).fill(color);
  g.visible = false;
  return g;
}
