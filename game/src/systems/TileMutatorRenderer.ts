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

import { Container, Graphics, BlurFilter } from 'pixi.js';
import type { TileMutator } from './TileMutator';
import { TILE_OIL, TILE_GRASS, getTile } from '../core/Physics';

export class TileMutatorRenderer {
  private gfx = new Graphics();
  /** Separate Graphics that should live ABOVE the fluid layer (oil flames). */
  private aboveFluidGfx = new Graphics();
  /**
   * Fire light-source halo — BlurFilter applied so each burning cell emits
   * a soft warm glow above the scene. Drawn on aboveFluidGfx parent (which
   * is above the fluid polygon layer) for visibility over oil pools.
   */
  private fireHaloGfx = new Graphics();

  constructor(parent: Container) {
    parent.addChild(this.gfx);
    // BlurFilter strength=10 — enough for ~8px feathering on 16px cells.
    const blur = new BlurFilter({ strength: 10, quality: 4 });
    this.fireHaloGfx.filters = [blur];
  }

  /**
   * Provide a Graphics container that sits ABOVE the fluid layer. Oil flame
   * tongues are drawn here so they aren't covered by the fluid polygon.
   * Fire halo also lives here for the same z-order reason.
   * If never called, the flames + halo still render but may be hidden by fluid.
   */
  setAboveFluidLayer(parent: Container): void {
    parent.addChild(this.fireHaloGfx);   // halo first (back)
    parent.addChild(this.aboveFluidGfx); // flame on top (front)
  }

  destroy(): void {
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    this.gfx.destroy();
    if (this.aboveFluidGfx.parent) this.aboveFluidGfx.parent.removeChild(this.aboveFluidGfx);
    this.aboveFluidGfx.destroy();
    if (this.fireHaloGfx.parent) this.fireHaloGfx.parent.removeChild(this.fireHaloGfx);
    this.fireHaloGfx.destroy();
  }

  /**
   * Rebuilds overlay every frame. Cheap because cell counts are small.
   *
   * @param mutator        - Current TileMutator state
   * @param collisionGrid  - Optional grid for tile-type-aware rendering
   *                         (oil flames rise above the surface, wood/grass
   *                         fill the cell). If absent, all burning cells
   *                         fill the cell.
   */
  update(mutator: TileMutator, collisionGrid?: number[][]): void {
    const g = this.gfx;
    const af = this.aboveFluidGfx;
    const fh = this.fireHaloGfx;
    g.clear();
    af.clear();
    fh.clear();
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
    // Oil cells: draw flame tongues RISING above the cell surface (on the
    //   aboveFluid layer, so they're visible over the fluid polygon).
    // Wood/Grass: in-cell orange tint + yellow core (original style).
    mutator.forEachBurning((gx, gy) => {
      const x = gx * 16, y = gy * 16;
      const cellSeed = gx * 7 + gy * 13;
      const tile = collisionGrid ? getTile(collisionGrid, gx, gy) : 0;
      const isOil = tile === TILE_OIL;
      const isGrass = tile === TILE_GRASS;

      // Flame base Y depends on what the source actually is in pixel space:
      //   oil   = fluid surface = top of cell
      //   wood  = solid block top = top of cell
      //   grass = thin foliage growing UP from the floor below = BOTTOM of cell
      //           (so flames sit on the floor, not floating one cell above).
      const flameBaseY = isGrass ? y + 16 : y;
      // Halo follows the flame source. For grass we sink the halo center
      // BELOW cell bottom (into the wall row) so the BlurFilter spread bias
      // is downward — the user perceives the warm glow as "from the floor",
      // not "floating in the cell above the grass".
      const haloCy = isGrass ? y + 18 : flameBaseY - 4;

      // ── Fire halo — broad warm light bath. BlurFilter on fh smooths edges.
      // Grass halo is smaller + dimmer because the cell is thin foliage; a
      // full-strength halo bleeds into the row above and looks like the
      // fire originates there.
      const cx = x + 8;
      const haloPulse = 0.8 + Math.sin(t * 0.008 + cellSeed * 0.6) * 0.2;
      if (isGrass) {
        fh.ellipse(cx, haloCy, 12 * haloPulse, 6 * haloPulse)
          .fill({ color: 0xff7733, alpha: 0.45 });
        fh.ellipse(cx, haloCy - 1, 7 * haloPulse, 4 * haloPulse)
          .fill({ color: 0xffdd66, alpha: 0.6 });
      } else {
        fh.ellipse(cx, haloCy, 28 * haloPulse, 22 * haloPulse)
          .fill({ color: 0xff7733, alpha: 0.55 });
        fh.ellipse(cx, haloCy - 2, 14 * haloPulse, 12 * haloPulse)
          .fill({ color: 0xffdd66, alpha: 0.75 });
        fh.circle(cx, haloCy, 5 * haloPulse)
          .fill({ color: 0xffffff, alpha: 0.55 });
      }

      // ── Multi-strand teardrop flames (realistic fire silhouette) ──
      // Grass cells get SHORTER strands so the flame body fits inside the
      // cell (overlapping the grass blades) rather than billowing into the
      // cell ABOVE — which made the fire read as "floating above grass."
      // Bulge control also biased lower for grass (heavy at base = floor).
      const strands: Array<{ cxOff: number; phase: number; tall: number; wide: number }> = isGrass
        ? [
            // Heights capped well under 16 (cell size) so the flame stays
            // inside the grass cell and never licks into the row above.
            { cxOff: 8,   phase: t * 0.018 + cellSeed * 1.7, tall: 9,  wide: 5.5 },
            { cxOff: 4.5, phase: t * 0.020 + cellSeed * 2.3, tall: 7,  wide: 4.0 },
            { cxOff: 11.5,phase: t * 0.019 + cellSeed * 3.1, tall: 7,  wide: 4.0 },
          ]
        : [
            { cxOff: 8,   phase: t * 0.018 + cellSeed * 1.7, tall: 22, wide: 7 },
            { cxOff: 3.5, phase: t * 0.020 + cellSeed * 2.3, tall: 15, wide: 5 },
            { cxOff: 12.5,phase: t * 0.019 + cellSeed * 3.1, tall: 16, wide: 5 },
          ];
      const bulgeYFactor = isGrass ? 0.30 : 0.45;   // lower bulge for grass
      const layer = isOil ? af : g;   // oil flames need to render over the fluid polygon
      // For solid cells, also faint glow inside the cell so the source reads.
      // For grass, anchor the in-cell glow at the floor half (lower 8 px)
      // so it overlaps the blade visual instead of the whole cell.
      if (!isOil) {
        if (isGrass) {
          g.rect(x, y + 8, 16, 8).fill({ color: 0xff7733, alpha: 0.45 });
        } else {
          g.rect(x, y, 16, 16).fill({ color: 0xff7733, alpha: 0.35 });
        }
      }
      for (const s of strands) {
        const wobble = 0.85 + Math.sin(s.phase) * 0.25;
        const h = s.tall * wobble;
        const w = s.wide * (0.9 + Math.sin(s.phase * 1.4) * 0.18);
        const swayX = Math.sin(s.phase * 0.7) * 1.2;     // side-to-side sway
        const sx = x + s.cxOff + swayX;
        const tipY = flameBaseY - h;
        // Per-flame teardrop path: bottom-left → bulge mid-left → tip → bulge mid-right → bottom-right
        const drawTeardrop = (
          gfx: typeof g, halfWidth: number, height: number, color: number, alpha: number,
        ) => {
          gfx.moveTo(sx - halfWidth, flameBaseY);
          gfx.quadraticCurveTo(sx - halfWidth * 1.4, flameBaseY - height * bulgeYFactor, sx, tipY);
          gfx.quadraticCurveTo(sx + halfWidth * 1.4, flameBaseY - height * bulgeYFactor, sx + halfWidth, flameBaseY);
          gfx.closePath();
          gfx.fill({ color, alpha });
        };
        // Layer 1 — outer red, widest
        drawTeardrop(layer, w * 1.2, h,        0xff3311, 0.55);
        // Layer 2 — orange mid
        drawTeardrop(layer, w * 0.85, h * 0.92, 0xff7722, 0.78);
        // Layer 3 — yellow inner
        drawTeardrop(layer, w * 0.55, h * 0.80, 0xffcc44, 0.85);
        // Layer 4 — white-yellow core
        drawTeardrop(layer, w * 0.30, h * 0.62, 0xffffaa, 0.85);
      }
      // ── Embers rising — for grass we cap rise so embers stay inside
      // the grass cell. For solid wood / oil they may rise into the air
      // above the cell as before (heat plume).
      const emberLayer = isOil ? af : g;
      const emberHighY  = isGrass ? flameBaseY - 8  : flameBaseY - 18;
      const emberRange  = isGrass ? 4                : 8;
      const emberHighY2 = isGrass ? flameBaseY - 5  : flameBaseY - 12;
      const emberRange2 = isGrass ? 6                : 14;
      if (Math.random() < 0.55) {
        const ex = x + Math.random() * 16;
        const ey = emberHighY - Math.random() * emberRange;
        emberLayer.rect(ex | 0, ey | 0, 1, 1).fill({ color: 0xffee88, alpha: 0.95 });
      }
      if (Math.random() < 0.30) {
        const ex = x + Math.random() * 16;
        const ey = emberHighY2 - Math.random() * emberRange2;
        emberLayer.rect(ex | 0, ey | 0, 1, 1).fill({ color: 0xffffff, alpha: 0.9 });
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
