import { Container, Graphics, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../Game';

interface PullFragment {
  sprite: Sprite;
  homeX: number;
  homeY: number;
  ctrlX: number;
  ctrlY: number;
  spin: number;
  startMs: number;
  durationMs: number;
}

export interface WorldPullInCapture {
  name: string;
  texture: RenderTexture;
  startMs: number;
  durationMs: number;
  cols?: number;
  rows?: number;
}

const DEFAULT_COLS = 7;
const DEFAULT_ROWS = 4;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Screen-space center sink effect.
 *
 * Each source layer is captured to a RenderTexture before construction. This
 * class slices those snapshots into a fixed screen grid, then pulls the
 * fragments toward the camera center in layer order. It intentionally lives in
 * the 640x360 legacy UI space so HUD/native UI can stay excluded.
 */
export class WorldPullIn {
  readonly container = new Container();

  private parallaxLayer = new Container();
  private intgridLayer = new Container();
  private characterLayer = new Container();
  private effectLayer = new Container();
  private fragments: PullFragment[] = [];
  private textures: RenderTexture[] = [];
  private elapsedMs = 0;
  private totalMs = 0;
  private core = new Graphics();
  private streaks = new Graphics();
  private vignette = new Graphics();

  constructor(
    captures: WorldPullInCapture[],
    private readonly sinkX = GAME_WIDTH / 2,
    private readonly sinkY = GAME_HEIGHT / 2,
  ) {
    this.container.sortableChildren = false;
    this.textures = captures.map(c => c.texture);
    this.totalMs = captures.reduce((max, c) => Math.max(max, c.startMs + c.durationMs), 0);
    this.container.addChild(this.parallaxLayer);
    this.container.addChild(this.intgridLayer);
    this.container.addChild(this.effectLayer);
    this.container.addChild(this.characterLayer);

    for (const capture of captures) {
      this.addCaptureFragments(capture);
    }

    this.effectLayer.addChild(this.streaks);
    this.effectLayer.addChild(this.vignette);
    this.effectLayer.addChild(this.core);
    this.redrawCore(0);
  }

  update(dtMs: number): boolean {
    this.elapsedMs += dtMs;
    for (const f of this.fragments) {
      const t = clamp01((this.elapsedMs - f.startMs) / f.durationMs);
      const e = easeInCubic(t);
      const inv = 1 - e;
      f.sprite.x = inv * inv * f.homeX + 2 * inv * e * f.ctrlX + e * e * this.sinkX;
      f.sprite.y = inv * inv * f.homeY + 2 * inv * e * f.ctrlY + e * e * this.sinkY;
      f.sprite.rotation = f.spin * e;
      f.sprite.scale.set(1 - 0.94 * e);
      f.sprite.alpha = 1 - smoothstep(0.92, 1, t);
      f.sprite.visible = this.elapsedMs >= f.startMs - 1 && t < 1;
    }

    this.redrawCore(clamp01(this.elapsedMs / Math.max(1, this.totalMs)));
    return this.elapsedMs >= this.totalMs;
  }

  destroy(): void {
    this.container.destroy({ children: true });
    for (const rt of this.textures) rt.destroy(true);
    this.textures.length = 0;
    this.fragments.length = 0;
  }

  private addCaptureFragments(capture: WorldPullInCapture): void {
    const cols = capture.cols ?? DEFAULT_COLS;
    const rows = capture.rows ?? DEFAULT_ROWS;
    const cellW = Math.ceil(GAME_WIDTH / cols);
    const cellH = Math.ceil(GAME_HEIGHT / rows);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellW;
        const y = row * cellH;
        const w = Math.min(cellW, GAME_WIDTH - x);
        const h = Math.min(cellH, GAME_HEIGHT - y);
        if (w <= 0 || h <= 0) continue;

        const tex = new Texture({
          source: capture.texture.source,
          frame: new Rectangle(x, y, w, h),
        });
        const sprite = new Sprite(tex);
        sprite.anchor.set(0.5);
        sprite.x = x + w / 2;
        sprite.y = y + h / 2;
        sprite.visible = capture.startMs <= 0;
        const layer = capture.name === 'character'
          ? this.characterLayer
          : capture.name === 'background' || capture.name === 'parallax'
            ? this.parallaxLayer
            : this.intgridLayer;
        layer.addChild(sprite);

        const dx = this.sinkX - sprite.x;
        const dy = this.sinkY - sprite.y;
        const angleSign = sprite.x < this.sinkX ? -1 : 1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const invDistance = distance > 0 ? 1 / distance : 0;
        const curveSign = ((row + col) & 1) === 0 ? 1 : -1;
        const curve = Math.min(96, 18 + distance * 0.22) * curveSign;
        this.fragments.push({
          sprite,
          homeX: sprite.x,
          homeY: sprite.y,
          ctrlX: (sprite.x + this.sinkX) / 2 + (-dy * invDistance) * curve,
          ctrlY: (sprite.y + this.sinkY) / 2 + (dx * invDistance) * curve,
          spin: angleSign * (0.25 + distance / 520),
          startMs: capture.startMs,
          durationMs: capture.durationMs,
        });
      }
    }
  }

  private redrawCore(t: number): void {
    this.core.clear();
    this.streaks.clear();
    this.vignette.clear();

    const corePulse = 0.4 + smoothstep(0.05, 0.85, t) * 1.2;
    const alpha = 0.35 + smoothstep(0.1, 0.75, t) * 0.55;

    this.vignette
      .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fill({ color: 0x000000, alpha: 0.12 + t * 0.5 });

    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + t * 0.8;
      const len = 84 + t * 110;
      const x0 = this.sinkX + Math.cos(a) * 12;
      const y0 = this.sinkY + Math.sin(a) * 12;
      const x1 = this.sinkX + Math.cos(a) * len;
      const y1 = this.sinkY + Math.sin(a) * len;
      this.streaks
        .moveTo(x0, y0)
        .lineTo(x1, y1)
        .stroke({ color: 0xffa41b, width: 1, alpha: 0.25 + alpha * 0.35 });
    }

    this.core
      .circle(this.sinkX, this.sinkY, 8 * corePulse)
      .fill({ color: 0xffa41b, alpha: 0.85 })
      .circle(this.sinkX, this.sinkY, 4 * corePulse)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .circle(this.sinkX, this.sinkY, 26 * corePulse)
      .stroke({ color: 0xffa41b, width: 2, alpha: 0.25 + alpha * 0.3 });

    if (t > 0.92) {
      this.core
        .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        .fill({ color: 0x000000, alpha: smoothstep(0.92, 1, t) });
    }
  }
}
