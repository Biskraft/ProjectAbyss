/**
 * WeaponPulse.ts
 *
 * Sacred Pickup T2/S4 — 무기 획득 맥동 컷신.
 *   T2 (첫 아이템 획득): 카메라 줌인 0.3s → 레어리티 링 펄스 ×2 0.5s
 *     → Tether 트리거(외부에서 처리) → 줌아웃 0.3s. 입력 봉쇄 1.5s.
 *   S4 (이후 획득): 제자리 펄스 0.4s, 줌 없음, 입력 봉쇄 없음.
 *
 * 외부 통합:
 *   - onZoom 콜백 — T2 모드에서 scale 값을 카메라에 반영.
 *   - onTetherTrigger 콜백 — T2 모드에서 ring 2차 펄스 시작 시 1회 발동.
 */

import { Container, Graphics } from 'pixi.js';
import type { Rarity } from '@data/weapons';
import { RARITY_COLOR } from '@items/ItemInstance';

export type PulseMode = 'T2_FULL_CUTSCENE' | 'S4_IN_PLACE';

// T2 timing (1500ms total) ---------------------------------------------------
const T2_ZOOM_IN = 300;
const T2_PULSE = 500;   // 2 rings over this window
const T2_HOLD = 100;    // small hold before zoom-out to sell the impact
const T2_ZOOM_OUT = 300;
const T2_TOTAL = T2_ZOOM_IN + T2_PULSE + T2_HOLD + T2_ZOOM_OUT;
const T2_MAX_ZOOM = 1.5;

// S4 timing (400ms total) ----------------------------------------------------
const S4_TOTAL = 400;

// Ring visuals ---------------------------------------------------------------
const RING_START_RADIUS = 8;
const RING_END_RADIUS = 48;

export class WeaponPulse {
  readonly container: Container;
  private gfx: Graphics;
  private x: number;
  private y: number;
  private color: number;
  private mode: PulseMode;
  private timer = 0;
  private done = false;
  private tetherFired = false;

  /** Callback invoked every update with the desired camera zoom (T2 only). */
  onZoom: ((scale: number) => void) | null = null;
  /** Callback invoked once at ring peak in T2 mode — used to fire AnvilTether. */
  onTetherTrigger: (() => void) | null = null;

  constructor(x: number, y: number, rarity: Rarity, mode: PulseMode) {
    this.x = x;
    this.y = y;
    this.color = RARITY_COLOR[rarity];
    this.mode = mode;

    this.container = new Container();
    this.gfx = new Graphics();
    this.container.addChild(this.gfx);
  }

  get isDone(): boolean { return this.done; }
  get isBlocking(): boolean {
    // Only T2 blocks input; S4 is a subtle in-place pulse.
    return this.mode === 'T2_FULL_CUTSCENE' && !this.done;
  }

  start(): void {
    this.timer = 0;
    this.done = false;
    this.tetherFired = false;
    if (this.mode === 'T2_FULL_CUTSCENE' && this.onZoom) {
      this.onZoom(1.0);
    }
  }

  update(dt: number): void {
    if (this.done) return;
    this.timer += dt;

    if (this.mode === 'T2_FULL_CUTSCENE') {
      this.updateT2();
    } else {
      this.updateS4();
    }
  }

  private updateT2(): void {
    const t = this.timer;
    // Phase progression.
    let zoom = 1.0;
    if (t < T2_ZOOM_IN) {
      const p = t / T2_ZOOM_IN;
      zoom = 1.0 + (T2_MAX_ZOOM - 1.0) * this.easeOut(p);
      this.drawRings(0);
    } else if (t < T2_ZOOM_IN + T2_PULSE) {
      zoom = T2_MAX_ZOOM;
      const pulseT = t - T2_ZOOM_IN;
      this.drawRings(pulseT / T2_PULSE);
      // Fire tether trigger once as the first ring peaks.
      if (!this.tetherFired && pulseT >= T2_PULSE * 0.35) {
        this.tetherFired = true;
        this.onTetherTrigger?.();
      }
    } else if (t < T2_ZOOM_IN + T2_PULSE + T2_HOLD) {
      zoom = T2_MAX_ZOOM;
      this.gfx.clear();
    } else if (t < T2_TOTAL) {
      const outP = (t - (T2_ZOOM_IN + T2_PULSE + T2_HOLD)) / T2_ZOOM_OUT;
      zoom = T2_MAX_ZOOM + (1.0 - T2_MAX_ZOOM) * this.easeInOut(outP);
      this.gfx.clear();
    } else {
      zoom = 1.0;
      this.gfx.clear();
      this.done = true;
    }
    this.onZoom?.(zoom);
  }

  private updateS4(): void {
    const p = this.timer / S4_TOTAL;
    if (p >= 1) {
      this.done = true;
      this.gfx.clear();
      return;
    }
    this.drawRings(p);
  }

  /**
   * Draw up to 2 overlapping rings. Phase0 in [0,1] drives the outer ring;
   * a second ring is offset so the pair peaks sequentially.
   */
  private drawRings(phase: number): void {
    const g = this.gfx;
    g.clear();

    // Ring 1 — primary expanding.
    this.drawRing(g, phase);
    // Ring 2 — offset (0.5 phase lag) so rings "pulse twice".
    const phase2 = phase - 0.5;
    if (phase2 > 0 && phase2 <= 1) {
      this.drawRing(g, phase2);
    }
  }

  private drawRing(g: Graphics, phase: number): void {
    const p = Math.max(0, Math.min(1, phase));
    const radius = RING_START_RADIUS + (RING_END_RADIUS - RING_START_RADIUS) * p;
    const alpha = 0.85 * (1 - p);
    const width = 2 * (1 - p * 0.5);
    g.circle(this.x, this.y, radius).stroke({ color: this.color, width, alpha });
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 2);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }
}
