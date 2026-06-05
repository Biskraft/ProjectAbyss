/**
 * NPC.ts
 *
 * A standing world character (scientist, ghost, etc.) that carries the full
 * dialogue feature via WorldDialogueTriggerRuntime. This class owns only the
 * visual: the sprite + a looping idle animation.
 *
 * Appearance: the LDtk `character` name (e.g. `rustborn`, `scientist_01`) —
 * the atlas under `assets/characters/<name>_atlas.json` (+ image) is loaded at
 * runtime (same pattern as Anvil). Names already ending in `_atlas` are used
 * as-is.
 *
 * Pivot: bottom-left (anchor 0,1) — the entity px is the sprite's bottom-left,
 * so the feet sit on the placed grid cell.
 *
 * Idle: up to 4 frames (the atlas `idle` frameTag if present, else the first
 * frames), played SEQUENTIALLY in a loop at a fixed rate. Each NPC starts at a
 * random frame (random phase) so identical NPCs don't idle in lockstep.
 * Single-frame atlases stay static.
 */

import { Container, Sprite, Texture, Assets, Rectangle } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
}
interface AtlasJson {
  frames: AtlasFrame[] | Record<string, AtlasFrame>;
  meta: {
    image: string;
    frameTags?: Array<{ name: string; from: number; to: number }>;
  };
}

const IDLE_MAX_FRAMES = 4;
const IDLE_FRAME_INTERVAL_MS = 180; // fixed sequential playback rate

export class NPC {
  readonly container = new Container();
  readonly x: number;
  readonly y: number;

  private sprite: Sprite | null = null;
  private idleFrames: Texture[] = [];
  private idleTimer = 0;
  private frameIndex = 0;
  private frameWidth = 16;

  /** Persistent facing set from LDtk (`flipX`). Restored after a conversation. */
  private baseFlip = false;
  /** Current visual flip. */
  private flipped = false;

  constructor(x: number, y: number, character: string) {
    this.x = x;
    this.y = y;
    this.container.x = x;
    this.container.y = y;
    void this.load(character);
  }

  private async load(character: string): Promise<void> {
    if (!character) return;
    const atlasName = character.endsWith('_atlas') ? character : `${character}_atlas`;
    try {
      const atlas = await fetch(assetPath(`assets/characters/${atlasName}.json`))
        .then(r => r.json()) as AtlasJson;
      const tex = await Assets.load<Texture>(assetPath(`assets/characters/${atlas.meta.image}`));
      tex.source.scaleMode = 'nearest';

      const allFrames = Array.isArray(atlas.frames)
        ? atlas.frames.map(f => f.frame)
        : Object.values(atlas.frames).map(f => f.frame);
      if (allFrames.length === 0) return;

      // Idle frame range: the "idle" tag if authored, else the first frames.
      let from = 0;
      let to = Math.min(IDLE_MAX_FRAMES, allFrames.length) - 1;
      const idleTag = atlas.meta.frameTags?.find(tag => tag.name.toLowerCase() === 'idle');
      if (idleTag) {
        from = idleTag.from;
        to = Math.min(idleTag.to, from + IDLE_MAX_FRAMES - 1);
      }
      this.idleFrames = [];
      for (let i = from; i <= to && i < allFrames.length; i++) {
        const fr = allFrames[i];
        this.idleFrames.push(new Texture({
          source: tex.source,
          frame: new Rectangle(fr.x, fr.y, fr.w, fr.h),
        }));
      }
      if (this.idleFrames.length === 0) return;
      this.frameWidth = allFrames[from].w;

      // Random start frame (phase) so identical NPCs don't idle in lockstep.
      this.frameIndex = Math.floor(Math.random() * this.idleFrames.length);
      const sprite = new Sprite(this.idleFrames[this.frameIndex]);
      sprite.anchor.set(0, 1); // bottom-left pivot
      this.sprite = sprite;
      this.container.addChild(sprite);
      this.applyFlip(this.flipped); // honour any flip set before the atlas loaded
    } catch {
      // Atlas missing — NPC stays invisible (dialogue still works).
    }
  }

  /** Advance to the next idle frame in sequence (looping). */
  private advanceFrame(): void {
    if (!this.sprite || this.idleFrames.length === 0) return;
    this.frameIndex = (this.frameIndex + 1) % this.idleFrames.length;
    this.sprite.texture = this.idleFrames[this.frameIndex];
  }

  update(dt: number): void {
    if (this.idleFrames.length <= 1) return; // static (single-frame atlas)
    this.idleTimer += dt;
    while (this.idleTimer >= IDLE_FRAME_INTERVAL_MS) {
      this.idleTimer -= IDLE_FRAME_INTERVAL_MS;
      this.advanceFrame();
    }
  }

  /** World-space horizontal center of the sprite (bottom-left pivot + half width). */
  get centerX(): number {
    return this.x + this.frameWidth / 2;
  }

  /** Set the persistent facing (from LDtk). flip = mirror to face -x (left). */
  setBaseFlip(flip: boolean): void {
    this.baseFlip = flip;
    this.applyFlip(flip);
  }

  /** Turn to face a world-x target (e.g. the player) — flip when the target is on the -x side. */
  faceTowards(targetX: number): void {
    this.applyFlip(targetX < this.centerX);
  }

  /** Return to the persistent LDtk facing (call when a conversation ends). */
  restoreFlip(): void {
    this.applyFlip(this.baseFlip);
  }

  // Bottom-left pivot: a -1 x-scale mirrors around the left edge, so shift by
  // frameWidth to keep the sprite in the same footprint.
  private applyFlip(flip: boolean): void {
    this.flipped = flip;
    if (!this.sprite) return;
    this.sprite.scale.x = flip ? -1 : 1;
    this.sprite.x = flip ? this.frameWidth : 0;
  }

  destroy(): void {
    destroyDisplayObject(this.container, { children: true });
    this.sprite = null; // guard late restoreFlip() after a level change
  }
}
