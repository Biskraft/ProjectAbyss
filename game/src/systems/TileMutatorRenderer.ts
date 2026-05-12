/**
 * TileMutatorRenderer — visual overlay for TileMutator state.
 *
 * The underlying LdtkRenderer paints tile sprites statically from collisionGrid,
 * so frozen/burning/electric state changes have no built-in visual. This
 * renderer queries the mutator each frame and draws semi-transparent overlays
 * on top so the player can see fire, ice and electric effects propagating.
 *
 * Z-order: parent should be a container ABOVE the tile layer but ideally BELOW
 *  entity sprites. For prototyping we just use entityLayer.
 *
 * Coordinate space: world (parent container in scene world space).
 * Tile size: hardcoded 16px (matches IntGrid).
 *
 * GDD: Documents/System/System_World_TileSystem.md §2.6-2.13
 */

import { Container, Graphics } from 'pixi.js';
import type { TileMutator } from './TileMutator';

export class TileMutatorRenderer {
  private gfx = new Graphics();

  constructor(parent: Container) {
    parent.addChild(this.gfx);
  }

  destroy(): void {
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    this.gfx.destroy();
  }

  /** Rebuilds overlay every frame. Cheap because cell counts are small. */
  update(mutator: TileMutator): void {
    const g = this.gfx;
    g.clear();
    const t = performance.now();

    // ── Frozen cells (ice wall, water/magma → temp wall) ──────────────────
    // bluish translucent fill + bright top stripe so player sees the "ice bridge"
    mutator.forEachFrozen((gx, gy) => {
      const x = gx * 16, y = gy * 16;
      g.rect(x, y, 16, 16).fill({ color: 0x88ccff, alpha: 0.55 });
      g.rect(x, y, 16, 2).fill({ color: 0xddf0ff, alpha: 0.9 });
      g.rect(x, y + 14, 16, 2).fill({ color: 0x6fa8d4, alpha: 0.7 });
    });

    // ── Burning cells (oil/wood/grass on fire) ────────────────────────────
    // orange flickering body + hot yellow core + occasional white spark
    mutator.forEachBurning((gx, gy) => {
      const x = gx * 16, y = gy * 16;
      const flicker = 0.65 + Math.sin(t * 0.012 + (gx * 7 + gy * 13) * 0.5) * 0.25;
      g.rect(x, y, 16, 16).fill({ color: 0xff7733, alpha: 0.45 * flicker });
      g.rect(x + 3, y + 3, 10, 10).fill({ color: 0xffdd66, alpha: 0.55 * flicker });
      if (Math.random() < 0.35) {
        const sx = x + Math.random() * 16;
        const sy = y + Math.random() * 16;
        g.rect(sx | 0, sy | 0, 1, 1).fill({ color: 0xffffff, alpha: 0.9 });
      }
    });

    // ── Electric cells (thunder flood-fill on water/metal/acid) ───────────
    // yellow translucent tint + zigzag arc between random edge points + bright sparks
    mutator.forEachElectric((gx, gy) => {
      const x = gx * 16, y = gy * 16;
      g.rect(x, y, 16, 16).fill({ color: 0xffee44, alpha: 0.55 });
      // ~40% chance per frame to draw an arc this cell
      if (Math.random() < 0.4) {
        const edge = (i: number): [number, number] => {
          const r = Math.random() * 16;
          switch (i) {
            case 0: return [x + r, y];        // top
            case 1: return [x + r, y + 16];   // bottom
            case 2: return [x, y + r];        // left
            default: return [x + 16, y + r];  // right
          }
        };
        const sIdx = Math.floor(Math.random() * 4);
        const eIdx = (sIdx + 1 + Math.floor(Math.random() * 3)) % 4;
        const s = edge(sIdx), e = edge(eIdx);
        const mx = (s[0] + e[0]) / 2 + (Math.random() - 0.5) * 5;
        const my = (s[1] + e[1]) / 2 + (Math.random() - 0.5) * 5;
        g.moveTo(s[0], s[1]).lineTo(mx, my).lineTo(e[0], e[1])
          .stroke({ color: 0xffffaa, width: 1, alpha: 0.9 });
      }
      // 1-pixel white spark
      if (Math.random() < 0.5) {
        g.rect((x + Math.random() * 16) | 0, (y + Math.random() * 16) | 0, 1, 1)
          .fill({ color: 0xffffff, alpha: 0.95 });
      }
    });
  }
}
