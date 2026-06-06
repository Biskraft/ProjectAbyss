import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import type { LdtkEntity, LdtkLevel } from '@level/LdtkLoader';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

const DEFAULT_FRAME_DURATION_MS = 180;

interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  duration?: number;
}

interface AtlasJson {
  frames: AtlasFrame[] | Record<string, AtlasFrame>;
  meta: { image: string };
}

interface SpriteAnimation {
  frames: Texture[];
  durations: number[];
}

const textureCache = new Map<string, Texture>();
const textureLoads = new Map<string, Promise<Texture>>();
const atlasCache = new Map<string, SpriteAnimation>();
const atlasLoads = new Map<string, Promise<SpriteAnimation>>();

function loadSpriteTexture(spriteName: string): Promise<Texture> {
  const cached = textureCache.get(spriteName);
  if (cached) return Promise.resolve(cached);
  const inFlight = textureLoads.get(spriteName);
  if (inFlight) return inFlight;
  const promise = (async () => {
    const texture = await Assets.load<Texture>(assetPath(`assets/sprites/${spriteName}.png`));
    texture.source.scaleMode = 'nearest';
    textureCache.set(spriteName, texture);
    return texture;
  })();
  textureLoads.set(spriteName, promise);
  return promise;
}

function loadSpriteAtlas(spriteName: string): Promise<SpriteAnimation> {
  const cached = atlasCache.get(spriteName);
  if (cached) return Promise.resolve(cached);
  const inFlight = atlasLoads.get(spriteName);
  if (inFlight) return inFlight;
  const promise = (async () => {
    const atlas = await fetch(assetPath(`assets/sprites/${spriteName}.json`))
      .then(response => response.json()) as AtlasJson;
    const sourceTexture = await Assets.load<Texture>(assetPath(`assets/sprites/${atlas.meta.image}`));
    sourceTexture.source.scaleMode = 'nearest';
    const sourceFrames = Array.isArray(atlas.frames) ? atlas.frames : Object.values(atlas.frames);
    const frames = sourceFrames.map(frame => new Texture({
      source: sourceTexture.source,
      frame: new Rectangle(frame.frame.x, frame.frame.y, frame.frame.w, frame.frame.h),
    }));
    const durations = sourceFrames.map(frame => Math.max(1, frame.duration ?? DEFAULT_FRAME_DURATION_MS));
    const animation = { frames, durations };
    atlasCache.set(spriteName, animation);
    return animation;
  })();
  atlasLoads.set(spriteName, promise);
  return promise;
}

class CommonSpriteVisual {
  readonly container = new Container();

  private sprite: Sprite | null = null;
  private frames: Texture[] = [];
  private durations: number[] = [];
  private frameIndex = 0;
  private frameTimer = 0;
  private destroyed = false;

  constructor(private readonly entity: LdtkEntity) {
    this.container.x = entity.px[0];
    this.container.y = entity.px[1];
  }

  async load(loadVersion: number, getCurrentVersion: () => number): Promise<void> {
    const spriteName = ((this.entity.fields['Sprite'] ?? this.entity.fields['sprite']) as string | undefined)?.trim();
    try {
      if (this.entity.tile?.tilesetPath) {
        const texture = await this.loadEntityTileTexture(this.entity);
        if (this.destroyed || loadVersion !== getCurrentVersion()) return;
        this.attach(texture);
        return;
      }
      if (!spriteName) return;
      if (spriteName.endsWith('_atlas')) {
        const animation = await loadSpriteAtlas(spriteName);
        if (this.destroyed || loadVersion !== getCurrentVersion() || animation.frames.length === 0) return;
        this.frames = animation.frames;
        this.durations = animation.durations;
        this.attach(this.frames[0]);
        return;
      }
      const texture = await loadSpriteTexture(spriteName);
      if (this.destroyed || loadVersion !== getCurrentVersion()) return;
      this.attach(texture);
    } catch {
      // Missing art leaves the visual invisible. LDtk remains the source of truth.
    }
  }

  update(dtMs: number): void {
    if (!this.sprite || this.frames.length <= 1) return;
    this.frameTimer += dtMs;
    while (this.frameTimer >= this.durations[this.frameIndex]) {
      this.frameTimer -= this.durations[this.frameIndex];
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.sprite.texture = this.frames[this.frameIndex];
    }
  }

  destroy(): void {
    this.destroyed = true;
    destroyDisplayObject(this.container, { children: true });
  }

  private async loadEntityTileTexture(entity: LdtkEntity): Promise<Texture> {
    const tile = entity.tile;
    if (!tile?.tilesetPath) throw new Error('CommonSprite entity has no tile');
    const sourceTexture = await Assets.load<Texture>(assetPath(`assets/${tile.tilesetPath}`));
    sourceTexture.source.scaleMode = 'nearest';
    return new Texture({
      source: sourceTexture.source,
      frame: new Rectangle(tile.src[0], tile.src[1], tile.w, tile.h),
    });
  }

  private attach(texture: Texture): void {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    this.container.addChild(sprite);
    this.sprite = sprite;
  }
}

export class WorldCommonSpriteRuntime {
  private readonly visuals: CommonSpriteVisual[] = [];
  private loadVersion = 0;

  clear(): void {
    this.loadVersion++;
    for (const visual of this.visuals) visual.destroy();
    this.visuals.length = 0;
  }

  spawnForLevel(level: LdtkLevel, parent: Container): void {
    this.clear();
    const version = this.loadVersion;
    for (const entity of level.entities) {
      if (entity.type !== 'CommonSprite' && entity.type !== 'commonSprite') continue;
      const visual = new CommonSpriteVisual(entity);
      this.visuals.push(visual);
      parent.addChild(visual.container);
      void visual.load(version, () => this.loadVersion);
    }
  }

  update(dtMs: number): void {
    for (const visual of this.visuals) visual.update(dtMs);
  }
}
