/**
 * ScreenCrack.ts — Full-screen crack effect for Item World entry.
 *
 * "The world breaks, not the weapon."
 *
 * Timeline (~1.2s):
 *   Phase 1: crack_spread   0~600ms    Crack lines radiate from impact point
 *   Phase 2: shatter        600~900ms  Fragments separate, Damascus light bleeds through
 *   Phase 3: hold           900~1200ms Hold shattered state → FloorCollapse takes over
 *
 * After hold, the effect stays visible while FloorCollapse runs underneath.
 */

import { Container, Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

const T_SPREAD_END = 600;
const T_SHATTER_END = 900;
const T_HOLD_END = 1200;
const T_DISSOLVE_DURATION = 1000;

/** A single crack branch. */
interface CrackLine {
  segments: { x1: number; y1: number; x2: number; y2: number }[];
  maxLen: number;
}

export type CrackPhase = 'idle' | 'crack_spread' | 'shatter' | 'hold' | 'dissolve' | 'done';

export class ScreenCrack {
  readonly container: Container;
  phase: CrackPhase = 'idle';
  private timer = 0;

  private originX: number;
  private originY: number;
  private cracks: CrackLine[] = [];
  private crackGfx: Graphics;
  private glowGfx: Graphics;
  private fragmentGfx: Graphics;

  // Callbacks
  onShake: ((intensity: number) => void) | null = null;
  onHitstop: ((frames: number) => void) | null = null;
  onScreenFlash: ((color: number, intensity: number) => void) | null = null;
  /** Fires when crack_spread ends — time to start FloorCollapse. */
  onCrackComplete: (() => void) | null = null;

  get isDone(): boolean { return this.phase === 'done'; }

  constructor(screenX: number, screenY: number) {
    this.originX = screenX;
    this.originY = screenY;

    this.container = new Container();
    this.container.eventMode = 'none';

    // Damascus glow layer (behind cracks)
    this.glowGfx = new Graphics();
    this.container.addChild(this.glowGfx);

    // Crack lines layer
    this.crackGfx = new Graphics();
    this.container.addChild(this.crackGfx);

    // Fragment separation layer
    this.fragmentGfx = new Graphics();
    this.container.addChild(this.fragmentGfx);

    // Generate crack patterns
    this.generateCracks();
  }

  private generateCracks(): void {
    // 12 main branches radiating from origin
    const branchCount = 12;
    for (let i = 0; i < branchCount; i++) {
      const baseAngle = (i / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const crack: CrackLine = { segments: [], maxLen: 0 };

      let cx = this.originX;
      let cy = this.originY;
      // Main branch length — enough to reach screen edges
      const totalLen = 400 + Math.random() * 300;
      const segCount = 8 + Math.floor(Math.random() * 6);
      let accumulated = 0;

      for (let s = 0; s < segCount; s++) {
        const segLen = totalLen / segCount;
        // Angle jitter increases with distance
        const jitter = (Math.random() - 0.5) * 0.6;
        const angle = baseAngle + jitter;
        const nx = cx + Math.cos(angle) * segLen;
        const ny = cy + Math.sin(angle) * segLen;
        accumulated += segLen;
        crack.segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
        cx = nx;
        cy = ny;

        // Sub-branches (fork off main crack)
        if (Math.random() < 0.4 && s > 1) {
          const subAngle = baseAngle + (Math.random() - 0.5) * 1.2;
          const subLen = segLen * (0.3 + Math.random() * 0.5);
          const sx = cx + Math.cos(subAngle) * subLen;
          const sy = cy + Math.sin(subAngle) * subLen;
          crack.segments.push({ x1: cx, y1: cy, x2: sx, y2: sy });
        }
      }
      crack.maxLen = accumulated;
      this.cracks.push(crack);
    }
  }

  start(): void {
    this.phase = 'crack_spread';
    this.timer = 0;
    this.onHitstop?.(6);
    this.onScreenFlash?.(0xffffff, 0.6);
    this.onShake?.(4);
  }

  update(dt: number): void {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.timer += dt;

    if (this.phase === 'crack_spread') {
      this.updateCrackSpread();
    } else if (this.phase === 'shatter') {
      this.updateShatter();
    } else if (this.phase === 'hold') {
      if (this.timer >= T_HOLD_END) {
        this.phase = 'dissolve';
        this.timer = 0;
      }
    } else if (this.phase === 'dissolve') {
      const progress = Math.min(1, this.timer / T_DISSOLVE_DURATION);
      this.container.alpha = 1 - progress;
      if (progress >= 1) {
        this.phase = 'done';
      }
    }
  }

  private updateCrackSpread(): void {
    const progress = Math.min(1, this.timer / T_SPREAD_END);
    // Ease-out for crack spread (fast start, slow end)
    const eased = 1 - (1 - progress) * (1 - progress);

    this.crackGfx.clear();
    this.glowGfx.clear();

    // Draw cracks up to current progress
    for (const crack of this.cracks) {
      const drawLen = eased * crack.maxLen;
      let accumulated = 0;

      for (const seg of crack.segments) {
        const segLen = Math.sqrt(
          (seg.x2 - seg.x1) ** 2 + (seg.y2 - seg.y1) ** 2,
        );

        if (accumulated > drawLen) break;

        const segProgress = Math.min(1, (drawLen - accumulated) / segLen);
        const ex = seg.x1 + (seg.x2 - seg.x1) * segProgress;
        const ey = seg.y1 + (seg.y2 - seg.y1) * segProgress;

        // Main crack line (white-hot)
        this.crackGfx
          .moveTo(seg.x1, seg.y1)
          .lineTo(ex, ey)
          .stroke({ color: 0xffffff, width: 2, alpha: 0.9 });

        // Damascus orange glow alongside crack
        this.glowGfx
          .moveTo(seg.x1, seg.y1)
          .lineTo(ex, ey)
          .stroke({ color: 0xe87830, width: 6, alpha: 0.3 * eased });

        accumulated += segLen;
      }
    }

    // Shake intensifies
    this.onShake?.(2 + progress * 6);

    if (this.timer >= T_SPREAD_END) {
      this.phase = 'shatter';
      this.timer = 0;
      this.onCrackComplete?.();
      this.onScreenFlash?.(0xe87830, 0.4);
      this.onHitstop?.(4);
    }
  }

  private updateShatter(): void {
    const progress = Math.min(1, this.timer / (T_SHATTER_END - T_SPREAD_END));

    // Cracks widen — fragments separate
    this.crackGfx.clear();
    this.glowGfx.clear();
    this.fragmentGfx.clear();

    const gapWidth = progress * 4; // cracks widen

    for (const crack of this.cracks) {
      for (const seg of crack.segments) {
        // Wider crack lines
        this.crackGfx
          .moveTo(seg.x1, seg.y1)
          .lineTo(seg.x2, seg.y2)
          .stroke({ color: 0xffffff, width: 2 + gapWidth, alpha: 0.9 });

        // Damascus light bleeding through widened cracks
        this.glowGfx
          .moveTo(seg.x1, seg.y1)
          .lineTo(seg.x2, seg.y2)
          .stroke({ color: 0xe87830, width: 8 + gapWidth * 3, alpha: 0.2 + progress * 0.3 });
      }
    }

    // Full-screen Damascus glow intensifies
    this.fragmentGfx
      .rect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .fill({ color: 0xe87830, alpha: progress * 0.15 });

    this.onShake?.(8 * (1 - progress * 0.5));

    if (this.timer >= T_SHATTER_END - T_SPREAD_END) {
      this.phase = 'hold';
      this.timer = 0;
    }
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
