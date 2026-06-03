import { Assets, Rectangle, Sprite, Texture } from 'pixi.js';
import type { GiantBuilder } from '@entities/GiantBuilder';
import type { LdtkEntity } from '@level/LdtkLoader';
import { assetPath } from '@core/AssetLoader';

export class WorldBuilderSpriteRuntime {
  spawnIfSprite(builder: GiantBuilder, entity: LdtkEntity): boolean {
    if (entity.type !== 'BuilderSprite') return false;
    this.add(builder, entity);
    return true;
  }

  private add(builder: GiantBuilder, entity: LdtkEntity): void {
    const tile = entity.tile;
    if (!tile || !tile.tilesetPath) return;

    const localX = entity.px[0];
    const localY = entity.px[1];
    const url = assetPath(`assets/${tile.tilesetPath}`);
    Assets.load<Texture>(url).then((tex) => {
      if (!tex) return;
      tex.source.scaleMode = 'nearest';
      const frameTex = new Texture({
        source: tex.source,
        frame: new Rectangle(tile.src[0], tile.src[1], tile.w, tile.h),
      });
      const sprite = new Sprite(frameTex);
      sprite.anchor.set(0.5, 1);
      sprite.x = localX;
      sprite.y = localY;
      builder.bodyLayers.wall.addChild(sprite);
    });
  }
}
