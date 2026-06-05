import { Sprite, type Texture } from 'pixi.js';

interface HudSkinBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HudFloorFillParts {
  fill: Sprite;
  fillMaxH: number;
}

export function createHudFloorFill(
  s: number,
  texture: Texture,
  bounds: HudSkinBounds,
): HudFloorFillParts {
  const fill = new Sprite(texture);
  fill.x = bounds.x * s;
  fill.y = bounds.y * s;
  fill.width = bounds.w * s;
  fill.height = bounds.h * s;
  return {
    fill,
    fillMaxH: bounds.h * s,
  };
}
