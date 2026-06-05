import { Assets, Sprite, type Container, type Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';

interface HudSkinBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export async function loadHudPortraitSprite(
  s: number,
  bounds: HudSkinBounds,
  parent: Container,
): Promise<Sprite> {
  const texture = await Assets.load<Texture>(assetPath('assets/portraits/erda.png'));
  texture.source.scaleMode = 'nearest';
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.5);
  const targetSize = Math.max(bounds.w, bounds.h) * 1.3;
  const scale = (targetSize / texture.width) * s;
  sprite.scale.set(scale);
  sprite.x = (bounds.x + bounds.w / 2) * s;
  sprite.y = (bounds.y + bounds.h / 2 + 2) * s;
  parent.addChild(sprite);
  return sprite;
}
