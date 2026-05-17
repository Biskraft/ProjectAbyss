import { Container, Graphics } from 'pixi.js';

/**
 * Ash remnant — small charred mound left behind by a BurnableProp after its
 * burn-out, or by a procedural grass clump that caught fire.
 *
 * Two lifecycle modes:
 *  - Persistent (BurnableProp default): mound lives for the level lifetime so
 *    the player can read past combustion paths during exploration.
 *  - Timed fade (`fadeMs`): for transient props (procedural grass clumps) the
 *    mound briefly persists then fades to alpha 0 and self-destructs. Callers
 *    must invoke `update(dt)` each frame for fades to advance.
 *
 * Look: bone/sepia-toned mound + two faint embers.
 */

interface Ash {
  gfx: Graphics;
  /** Remaining lifetime (ms). undefined = persistent. */
  fadeMs?: number;
  /** Original fade duration — used to compute alpha curve. */
  fadeTotalMs?: number;
}

const COLOR_ASH_DARK = 0x1f1a16;
const COLOR_ASH_MID  = 0x3a2f25;
const COLOR_EMBER    = 0xc56a2a;

export class AshRemnantManager {
  private parent: Container;
  private items: Ash[] = [];

  constructor(parent: Container) { this.parent = parent; }

  /**
   * Spawn an ash remnant centered horizontally on (cx, baseY), where baseY is
   * the prop's floor line. Width scales to roughly the prop footprint.
   *
   * @param fadeMs Optional timed fade. If set, the mound fades to 0 alpha and
   *   is removed after this many ms. Last 30 % of the lifetime is the fade
   *   ramp; preceding 70 % holds at full opacity.
   */
  spawn(cx: number, baseY: number, footprintW: number, fadeMs?: number): void {
    const g = new Graphics();
    const w = Math.max(8, footprintW * 0.85);
    const h = Math.max(3, Math.min(6, footprintW * 0.35));
    g.ellipse(0, 0, w / 2, h).fill({ color: COLOR_ASH_DARK, alpha: 0.95 });
    g.ellipse(-w * 0.12, -h * 0.55, w * 0.32, h * 0.6).fill({ color: COLOR_ASH_MID, alpha: 0.9 });
    g.ellipse( w * 0.18, -h * 0.4 , w * 0.26, h * 0.5).fill({ color: COLOR_ASH_MID, alpha: 0.9 });
    g.circle(-w * 0.18 + Math.random() * 2, -h * 0.25, 0.9)
      .fill({ color: COLOR_EMBER, alpha: 0.9 });
    g.circle( w * 0.22 - Math.random() * 2, -h * 0.10, 0.7)
      .fill({ color: COLOR_EMBER, alpha: 0.75 });
    g.x = cx;
    g.y = baseY;
    this.parent.addChild(g);
    this.items.push({ gfx: g, fadeMs, fadeTotalMs: fadeMs });
  }

  /** Advance timed-fade remnants. Persistent ones are skipped. */
  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const a = this.items[i];
      if (a.fadeMs === undefined || a.fadeTotalMs === undefined) continue;
      a.fadeMs -= dt;
      if (a.fadeMs <= 0) {
        if (a.gfx.parent) a.gfx.parent.removeChild(a.gfx);
        a.gfx.destroy();
        this.items.splice(i, 1);
        continue;
      }
      const ratio = a.fadeMs / a.fadeTotalMs;
      a.gfx.alpha = ratio < 0.3 ? ratio / 0.3 : 1;
    }
  }

  clear(): void {
    for (const a of this.items) {
      if (a.gfx.parent) a.gfx.parent.removeChild(a.gfx);
      a.gfx.destroy();
    }
    this.items.length = 0;
  }
}
