import { Sprite, type Texture } from 'pixi.js';

interface HudSkinBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function createHudSkinSliceSprite(
  s: number,
  texture: Texture,
  bounds: HudSkinBounds,
): Sprite {
  const sprite = new Sprite(texture);
  sprite.x = bounds.x * s;
  sprite.y = bounds.y * s;
  sprite.width = bounds.w * s;
  sprite.height = bounds.h * s;
  return sprite;
}
