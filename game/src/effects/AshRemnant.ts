import { Container, Graphics } from 'pixi.js';

/**
 * Ash remnant — small charred mound left behind by a BurnableProp after its
 * burn-out. Purely decorative (no collision, no interaction). Persists for the
 * lifetime of the level (no fade) so the player can read past combustion paths
 * during exploration.
 *
 * Look: bone/sepia-toned mound + two faint embers. Single Graphics per remnant
 * — cheap and stable, since dozens per level is fine.
 */

interface Ash {
  gfx: Graphics;
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
   */
  spawn(cx: number, baseY: number, footprintW: number): void {
    const g = new Graphics();
    const w = Math.max(8, footprintW * 0.85);
    const h = Math.max(3, Math.min(6, footprintW * 0.35));
    // Lower mound (dark)
    g.ellipse(0, 0, w / 2, h).fill({ color: COLOR_ASH_DARK, alpha: 0.95 });
    // Upper smaller mound (mid tone) — gives a 2-step silhouette
    g.ellipse(-w * 0.12, -h * 0.55, w * 0.32, h * 0.6).fill({ color: COLOR_ASH_MID, alpha: 0.9 });
    g.ellipse( w * 0.18, -h * 0.4 , w * 0.26, h * 0.5).fill({ color: COLOR_ASH_MID, alpha: 0.9 });
    // Two embers — small dots, slight randomness
    g.circle(-w * 0.18 + Math.random() * 2, -h * 0.25, 0.9)
      .fill({ color: COLOR_EMBER, alpha: 0.9 });
    g.circle( w * 0.22 - Math.random() * 2, -h * 0.10, 0.7)
      .fill({ color: COLOR_EMBER, alpha: 0.75 });
    g.x = cx;
    g.y = baseY;
    this.parent.addChild(g);
    this.items.push({ gfx: g });
  }

  /** No animation needed, but kept for API parity with other managers. */
  update(_dt: number): void { void _dt; }

  clear(): void {
    for (const a of this.items) {
      if (a.gfx.parent) a.gfx.parent.removeChild(a.gfx);
      a.gfx.destroy();
    }
    this.items.length = 0;
  }
}
