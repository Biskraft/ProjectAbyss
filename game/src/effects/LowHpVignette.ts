import { Container, Graphics } from 'pixi.js';

/**
 * Low-HP vignette — subtle red pulse around the viewport edges when the player
 * drops to critical HP. Intensity ramps as HP decreases toward zero.
 *
 * Call setViewport(width, height) when resolution changes.
 * Call update(dt, hpRatio) every frame — the manager handles the pulse itself.
 */

const COLOR = 0xc23b3b;

export class LowHpVignetteManager {
  private parent: Container;
  private gfx: Graphics;
  private t = 0;
  private viewW = 0;
  private viewH = 0;

  constructor(parent: Container) {
    this.parent = parent;
    this.gfx = new Graphics();
    this.gfx.alpha = 0;
    this.parent.addChild(this.gfx);
  }

  setViewport(width: number, height: number): void {
    this.viewW = width;
    this.viewH = height;
    this.redraw();
  }

  private redraw(): void {
    this.gfx.clear();
    if (this.viewW <= 0 || this.viewH <= 0) return;
    const w = this.viewW;
    const h = this.viewH;
    const bandThick = Math.min(w, h) * 0.18;
    // Top band
    this.gfx.rect(0, 0, w, bandThick).fill({ color: COLOR, alpha: 0.55 });
    this.gfx.rect(0, bandThick, w, bandThick * 0.5).fill({ color: COLOR, alpha: 0.25 });
    // Bottom band
    this.gfx.rect(0, h - bandThick, w, bandThick).fill({ color: COLOR, alpha: 0.55 });
    this.gfx.rect(0, h - bandThick * 1.5, w, bandThick * 0.5).fill({ color: COLOR, alpha: 0.25 });
    // Left band
    this.gfx.rect(0, 0, bandThick, h).fill({ color: COLOR, alpha: 0.45 });
    // Right band
    this.gfx.rect(w - bandThick, 0, bandThick, h).fill({ color: COLOR, alpha: 0.45 });
  }

  /**
   * Drive the overlay. hpRatio ∈ [0, 1]. Vignette activates below ~0.35,
   * ramps to full intensity near 0. Pulses at ~1.2 Hz when critical.
   */
  update(dt: number, hpRatio: number): void {
    const threshold = 0.35;
    if (hpRatio >= threshold) {
      this.gfx.alpha = 0;
      this.t = 0;
      return;
    }
    this.t += dt;
    // Intensity ramps as HP drops: 0 at threshold -> 1 at 0
    const k = 1 - Math.max(0, hpRatio) / threshold;
    // Pulse 1.2 Hz: alpha oscillates 0.55..1 of target
    const pulse = 0.55 + (Math.sin(this.t * 0.0075) * 0.5 + 0.5) * 0.45;
    this.gfx.alpha = Math.min(1, k * pulse);
  }

  clear(): void {
    this.gfx.alpha = 0;
    this.t = 0;
  }

  destroy(): void {
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    this.gfx.destroy();
  }
}
