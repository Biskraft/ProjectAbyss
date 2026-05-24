import { Container, Graphics } from 'pixi.js';
import { GlowFilter } from '@effects/GlowFilter';

const FADE_MS = 300;
// px per ms
const FOG_SPEED = 0.02;
// 2026-05-24: 강도 강화 — fog alpha 0.6→0.9, 외곽 GlowFilter halo 추가.
const FOG_ALPHA = 0.9;
const HALO_GLOW_COLOR = 0xffaa44;
const HALO_GLOW_RADIUS = 18;
const HALO_GLOW_INTENSITY = 1.4;

/**
 * Orange glow preview layered behind the WallGate hole.
 * Mask clips all content to the hole rectangle.
 * Placeholder until iw_silhouette_platform.png and proper tileset land.
 */
export class ItemWorldLeakageLayer {
  readonly container: Container;

  private readonly fog1: Graphics;
  private readonly fog2: Graphics;
  private readonly silhouettes: { gfx: Graphics; baseY: number; phase: number }[];

  private fogOffset = 0;
  private elapsed = 0;
  private fadeElapsed = 0;
  private fading = false;

  private readonly totalWidth: number;

  constructor(worldX: number, worldY: number, w: number, h: number) {
    this.totalWidth = w;

    this.container = new Container();
    this.container.x = worldX;
    this.container.y = worldY;
    this.container.alpha = 0;

    const maskGfx = new Graphics();
    maskGfx.rect(-w / 2, -h, w, h).fill(0xffffff);
    this.container.addChild(maskGfx);

    const content = new Container();
    content.mask = maskGfx;
    this.container.addChild(content);

    // Orange background
    const bg = new Graphics();
    bg.rect(-w / 2, -h, w, h).fill(0xff8800);
    content.addChild(bg);

    // Outer halo — 강화된 발광 시그널 (2026-05-24).
    this.container.filters = [new GlowFilter({
      color: HALO_GLOW_COLOR,
      radius: HALO_GLOW_RADIUS,
      intensity: HALO_GLOW_INTENSITY,
      coreBoost: 0.5,
    })];

    // Two fog strips (seamless horizontal scroll)
    const fogColor = { color: 0xffcc66, alpha: FOG_ALPHA };
    this.fog1 = new Graphics();
    this.fog1.rect(0, -h, w, h).fill(fogColor);
    content.addChild(this.fog1);

    this.fog2 = new Graphics();
    this.fog2.rect(0, -h, w, h).fill(fogColor);
    content.addChild(this.fog2);

    this.fog1.x = -w / 2;
    this.fog2.x = -w / 2 - w;

    // Silhouettes — platform shapes that float in the glow
    const silCol = 0x331100;
    this.silhouettes = [
      { gfx: this.makeRect(16, 4, silCol), baseY: -h * 0.75, phase: 0 },
      { gfx: this.makeRect(12, 4, silCol), baseY: -h * 0.4, phase: Math.PI * 0.7 },
    ];
    for (const s of this.silhouettes) {
      s.gfx.x = -w / 2 + 4;
      s.gfx.y = s.baseY;
      content.addChild(s.gfx);
    }
  }

  /** Begin the 300 ms alpha fade-in. */
  startFade(): void {
    this.fading = true;
    this.fadeElapsed = 0;
  }

  update(dt: number): void {
    this.elapsed += dt;

    if (this.fading && this.fadeElapsed < FADE_MS) {
      this.fadeElapsed = Math.min(this.fadeElapsed + dt, FADE_MS);
      this.container.alpha = this.fadeElapsed / FADE_MS;
    }

    // Fog drift — two strips tile seamlessly within the totalWidth window
    this.fogOffset = (this.fogOffset + FOG_SPEED * dt) % this.totalWidth;
    this.fog1.x = -this.totalWidth / 2 + this.fogOffset;
    this.fog2.x = this.fog1.x - this.totalWidth;

    // Silhouette vertical bob
    for (const s of this.silhouettes) {
      s.gfx.y = s.baseY + Math.sin(this.elapsed * 0.0015 + s.phase) * 3;
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  private makeRect(w: number, h: number, color: number): Graphics {
    const g = new Graphics();
    g.rect(0, 0, w, h).fill(color);
    return g;
  }
}
