import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { AABB } from '@core/Physics';
import { assetPath } from '@core/AssetLoader';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';
import type { PropDrop } from './BreakableProp';

const DEFAULT_BASE_COLOR = 0x8a6a4a;
const DEFAULT_ACCENT_COLOR = 0xddccaa;
const DEFAULT_FRAME_DURATION_MS = 180;

interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  duration?: number;
}

interface AtlasJson {
  frames: AtlasFrame[] | Record<string, AtlasFrame>;
  meta: { image: string };
}

interface BreakableAtlasAnimation {
  frames: Texture[];
  durations: number[];
}

const textureCache = new Map<string, Texture>();
const loadingPromises = new Map<string, Promise<Texture>>();
const atlasCache = new Map<string, BreakableAtlasAnimation>();
const atlasLoadingPromises = new Map<string, Promise<BreakableAtlasAnimation>>();

function loadBreakableTexture(spriteName: string): Promise<Texture> {
  const cached = textureCache.get(spriteName);
  if (cached) return Promise.resolve(cached);
  const inFlight = loadingPromises.get(spriteName);
  if (inFlight) return inFlight;
  const promise = (async () => {
    const tex = await Assets.load<Texture>(assetPath(`assets/sprites/${spriteName}.png`));
    tex.source.scaleMode = 'nearest';
    textureCache.set(spriteName, tex);
    return tex;
  })();
  loadingPromises.set(spriteName, promise);
  return promise;
}

function loadBreakableAtlas(spriteName: string): Promise<BreakableAtlasAnimation> {
  const cached = atlasCache.get(spriteName);
  if (cached) return Promise.resolve(cached);
  const inFlight = atlasLoadingPromises.get(spriteName);
  if (inFlight) return inFlight;
  const promise = (async () => {
    const atlas = await fetch(assetPath(`assets/sprites/${spriteName}.json`))
      .then(r => r.json()) as AtlasJson;
    const tex = await Assets.load<Texture>(assetPath(`assets/sprites/${atlas.meta.image}`));
    tex.source.scaleMode = 'nearest';
    const sourceFrames = Array.isArray(atlas.frames)
      ? atlas.frames
      : Object.values(atlas.frames);
    const frames = sourceFrames.map(f => new Texture({
      source: tex.source,
      frame: new Rectangle(f.frame.x, f.frame.y, f.frame.w, f.frame.h),
    }));
    const durations = sourceFrames.map(f => Math.max(1, f.duration ?? DEFAULT_FRAME_DURATION_MS));
    const animation = { frames, durations };
    atlasCache.set(spriteName, animation);
    return animation;
  })();
  atlasLoadingPromises.set(spriteName, promise);
  return promise;
}

export class Breakable {
  readonly container: Container;
  readonly spriteName: string;
  x: number;
  y: number;
  width = 0;
  height = 0;
  destroyed = false;

  private spriteNode: Sprite | null = null;
  private animationFrames: Texture[] = [];
  private animationDurations: number[] = [];
  private animationTimer = 0;
  private animationFrameIndex = 0;

  constructor(px: number, py: number, spriteName: string) {
    this.spriteName = spriteName;
    this.x = px;
    this.y = py;
    this.container = new Container();
    this.container.x = px;
    this.container.y = py;
    void this.loadSprite();
  }

  private async loadSprite(): Promise<void> {
    try {
      if (this.spriteName.endsWith('_atlas')) {
        await this.loadAtlasSprite();
        return;
      }
      const tex = await loadBreakableTexture(this.spriteName);
      if (this.destroyed) return;
      this.attachSprite(tex);
    } catch {
      // Missing art leaves the object invisible and non-colliding.
    }
  }

  private async loadAtlasSprite(): Promise<void> {
    const animation = await loadBreakableAtlas(this.spriteName);
    if (this.destroyed || animation.frames.length === 0) return;
    this.animationFrames = animation.frames;
    this.animationDurations = animation.durations;
    this.animationFrameIndex = 0;
    this.animationTimer = 0;
    this.attachSprite(this.animationFrames[0]);
  }

  private attachSprite(texture: Texture): void {
    const sp = new Sprite(texture);
    sp.anchor.set(0.5, 1);
    this.container.addChild(sp);
    this.spriteNode = sp;
    this.width = texture.frame.width;
    this.height = texture.frame.height;
    this.x = this.container.x - this.width / 2;
    this.y = this.container.y - this.height;
  }

  getAABB(): AABB {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  break(): PropDrop {
    if (this.destroyed) return { type: 'none', amount: 0 };
    this.destroyed = true;
    this.container.visible = false;
    return this.rollDrop();
  }

  getParticleColor(): number {
    return DEFAULT_BASE_COLOR;
  }

  getAccentColor(): number {
    return DEFAULT_ACCENT_COLOR;
  }

  getArtifactTexture(): Texture | null {
    return this.spriteNode?.texture ?? null;
  }

  update(dt: number): void {
    if (!this.spriteNode || this.animationFrames.length <= 1) return;
    this.animationTimer += dt;
    while (this.animationTimer >= this.animationDurations[this.animationFrameIndex]) {
      this.animationTimer -= this.animationDurations[this.animationFrameIndex];
      this.animationFrameIndex = (this.animationFrameIndex + 1) % this.animationFrames.length;
      this.spriteNode.texture = this.animationFrames[this.animationFrameIndex];
    }
  }

  destroy(): void {
    this.destroyed = true;
    destroyDisplayObject(this.container, { children: true });
  }

  private rollDrop(): PropDrop {
    const roll = Math.floor(Math.random() * 100);
    if (roll < 50) return { type: 'none', amount: 0 };
    if (roll < 85) return { type: 'gold', amount: Math.max(1, Math.floor((1 + Math.floor(Math.random() * 3)) * 0.1)) };
    if (roll < 95) return { type: 'flask', amount: 1 };
    return { type: 'gold', amount: Math.max(1, Math.floor((3 + Math.floor(Math.random() * 5)) * 0.1)) };
  }
}
