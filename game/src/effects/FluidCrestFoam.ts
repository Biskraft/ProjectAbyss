/**
 * FluidCrestFoam — waterfall crest + impact particle layer.
 *
 * Pairs with FluidSpawnerManager. Each frame the scene feeds in the active
 * waterfall segments; this manager emits three particle classes:
 *
 *   - Crest spray  : large, short-lived dots bursting outward from the
 *                    cliff edge. Big and abundant — sells the violent
 *                    atomization at the lip.
 *   - Streak hi.   : faint dots that ride down the body — the "stars in
 *                    the water" inside the falling column.
 *   - Impact foam  : big short-lived dots erupting where the column meets
 *                    the basin / floor. Symmetric to the crest spray.
 *
 * The static crest band + bottom impact band are drawn inside
 * FluidSpawnerManager.repaintVisual so they track the segment exactly. This
 * file only owns the moving particles.
 *
 * SSoT: foam_color / foam_density in Sheets/Content_System_FluidTypes.csv
 *       (consumed via getFluidDef).
 */

import { Container, Graphics } from 'pixi.js';
import { getFluidDef } from '@data/FluidTypes';
import type { WaterfallSegment } from '@systems/FluidSpawner';

interface Particle {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const SPRAY_BUDGET = 220;
const STREAK_BUDGET = 80;
const IMPACT_BUDGET = 220;

const SPRAY_LIFE_MS = 220;   // short, punchy bursts
const STREAK_LIFE_MS = 380;
const IMPACT_LIFE_MS = 260;

/** ms between crest spray emission attempts per segment (scaled by density). */
const SPRAY_INTERVAL_MS = 22;
/** ms between streak emission attempts per segment. */
const STREAK_INTERVAL_MS = 160;
/** ms between impact emission attempts per segment. */
const IMPACT_INTERVAL_MS = 18;

export class FluidCrestFoamManager {
  private parent: Container;
  private sprays: Particle[] = [];
  private streaks: Particle[] = [];
  private impacts: Particle[] = [];
  /** Per-segment accumulators keyed by stable segment id. */
  private sprayAccum = new Map<string, number>();
  private streakAccum = new Map<string, number>();
  private impactAccum = new Map<string, number>();
  private reduceMotion = false;

  constructor(parent: Container, reduceMotion = false) {
    this.parent = parent;
    this.reduceMotion = reduceMotion;
  }

  /**
   * Feed in this frame's waterfall segments and advance particle simulation.
   * Call once per frame from the scene.
   */
  update(dtMs: number, segments: WaterfallSegment[]): void {
    if (!this.reduceMotion) this.emit(dtMs, segments);
    this.advance(dtMs);
  }

  clear(): void {
    for (const p of this.sprays) this.destroyParticle(p);
    for (const p of this.streaks) this.destroyParticle(p);
    for (const p of this.impacts) this.destroyParticle(p);
    this.sprays.length = 0;
    this.streaks.length = 0;
    this.impacts.length = 0;
    this.sprayAccum.clear();
    this.streakAccum.clear();
    this.impactAccum.clear();
  }

  destroy(): void {
    this.clear();
  }

  // ─── Emission ──────────────────────────────────────────────────────

  private emit(dtMs: number, segments: WaterfallSegment[]): void {
    const live = new Set<string>();
    for (const seg of segments) {
      const key = segKey(seg);
      live.add(key);
      const def = getFluidDef(seg.type);
      if (def.foamDensity <= 0.05) continue;

      const w = (seg.maxGx - seg.minGx + 1) * 16;
      const h = (seg.endY - seg.gy) * 16;
      const x = seg.minGx * 16;
      const y = seg.gy * 16;
      const flow = seg.flow;
      const widthBoost = Math.max(1, w / 16); // wider falls emit more

      // ── Crest spray ──
      // ceilingFed pipes still emit (sideways jet) but at reduced rate.
      const sprayCadence = SPRAY_INTERVAL_MS / Math.max(0.2, def.foamDensity * flow * widthBoost * (seg.ceilingFed ? 0.5 : 1.0));
      let sa = (this.sprayAccum.get(key) ?? 0) + dtMs;
      while (sa >= sprayCadence && this.sprays.length < SPRAY_BUDGET) {
        sa -= sprayCadence;
        this.spawnCrestSpray(x, y, w, def.foamColor, seg.ceilingFed, flow);
      }
      this.sprayAccum.set(key, sa);

      // ── Streak highlight (inside the column) ──
      if (h >= 32) {
        const streakCadence = STREAK_INTERVAL_MS / Math.max(0.2, def.foamDensity * flow * Math.min(2.0, h / 48));
        let st = (this.streakAccum.get(key) ?? 0) + dtMs;
        while (st >= streakCadence && this.streaks.length < STREAK_BUDGET) {
          st -= streakCadence;
          this.spawnStreak(x, y, w, h, def.foamColor, flow);
        }
        this.streakAccum.set(key, st);
      }

      // ── Impact foam (basin lip / landing spot) ──
      const impactCadence = IMPACT_INTERVAL_MS / Math.max(0.2, def.foamDensity * flow * widthBoost);
      let ia = (this.impactAccum.get(key) ?? 0) + dtMs;
      while (ia >= impactCadence && this.impacts.length < IMPACT_BUDGET) {
        ia -= impactCadence;
        this.spawnImpact(x, y + h, w, def.foamColor, flow);
      }
      this.impactAccum.set(key, ia);
    }

    // Drop accumulators for segments that disappeared so they don't grow.
    for (const k of [...this.sprayAccum.keys()]) {
      if (!live.has(k)) this.sprayAccum.delete(k);
    }
    for (const k of [...this.streakAccum.keys()]) {
      if (!live.has(k)) this.streakAccum.delete(k);
    }
    for (const k of [...this.impactAccum.keys()]) {
      if (!live.has(k)) this.impactAccum.delete(k);
    }
  }

  private spawnCrestSpray(x: number, y: number, w: number, color: number, ceilingFed: boolean, flow: number): void {
    // Reference look: big disc-shaped foam blobs that linger above the cliff
    // rim rather than streaking outward. Spawn anywhere across the column
    // top (not just corners) so the cluster reads as a wide foam patch.
    const left = Math.random() < 0.5;
    const sx = x + Math.random() * w + (left ? -Math.random() * 6 : Math.random() * 6);
    const sy = y + (ceilingFed ? 4 : -2) + (Math.random() * 4 - 2);

    // Nearly vertical drift with a tiny lateral spread.
    const baseAng = ceilingFed
      ? (left ? Math.PI - 0.25 : 0.25)
      : (left ? -Math.PI * 0.55 : -Math.PI * 0.45);
    const ang = baseAng + (Math.random() - 0.5) * 0.4;
    // Very slow — particles should appear nearly static, sliding off life via fade.
    const speed = (8 + Math.random() * 16) * (0.6 + 0.4 * flow);

    const gfx = new Graphics();
    // Big disc — 3.6~7.2px (20% boost over reference baseline).
    const size = 3.6 + Math.random() * 3.6;
    gfx.circle(0, 0, size).fill({ color, alpha: 1 });
    gfx.x = sx; gfx.y = sy;
    this.parent.addChild(gfx);
    this.sprays.push({
      gfx,
      x: sx, y: sy,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: SPRAY_LIFE_MS * (0.7 + Math.random() * 0.6),
      maxLife: SPRAY_LIFE_MS,
    });
  }

  private spawnStreak(x: number, y: number, w: number, h: number, color: number, flow: number): void {
    const sx = x + 2 + Math.random() * Math.max(2, w - 4);
    const sy = y + Math.random() * (h * 0.4);
    const gfx = new Graphics();
    const size = 1.2 + Math.random() * 0.96;
    gfx.circle(0, 0, size).fill({ color, alpha: 0.55 + Math.random() * 0.35 });
    gfx.x = sx; gfx.y = sy;
    this.parent.addChild(gfx);
    this.streaks.push({
      gfx,
      x: sx, y: sy,
      vx: (Math.random() - 0.5) * 6,
      vy: 140 + Math.random() * 110 * flow,
      life: STREAK_LIFE_MS * (0.7 + Math.random() * 0.5),
      maxLife: STREAK_LIFE_MS,
    });
  }

  private spawnImpact(x: number, by: number, w: number, color: number, flow: number): void {
    // Reference look: a thick cluster of big foam discs piles up at the
    // basin lip and to either side. They drift slowly outward + slightly
    // upward, then fade — almost static.
    const fanLeft = Math.random() < 0.5;
    const lateralOffset = fanLeft
      ? -Math.random() * 14
      :  w + Math.random() * 14;
    // 60% of particles spawn out at the side fan, 40% across the impact line.
    const sx = (Math.random() < 0.6)
      ? x + lateralOffset
      : x + Math.random() * w;
    const sy = by - 4 + Math.random() * 6;

    const left = sx < x + w * 0.5;
    const ang = (left ? -Math.PI * 0.6 : -Math.PI * 0.4) + (Math.random() - 0.5) * 0.4;
    // Slow drift, not a fountain.
    const speed = (10 + Math.random() * 18) * (0.6 + 0.4 * flow);

    const gfx = new Graphics();
    // Big disc — 3.6~7.8px (20% boost). Impact pile reads as the heaviest cluster.
    const size = 3.6 + Math.random() * 4.2;
    gfx.circle(0, 0, size).fill({ color, alpha: 1 });
    gfx.x = sx; gfx.y = sy;
    this.parent.addChild(gfx);
    this.impacts.push({
      gfx,
      x: sx, y: sy,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: IMPACT_LIFE_MS * (0.7 + Math.random() * 0.6),
      maxLife: IMPACT_LIFE_MS,
    });
  }

  // ─── Simulation ────────────────────────────────────────────────────

  private advance(dtMs: number): void {
    const dtSec = dtMs / 1000;
    // Crest spray — barely any gravity. Particles linger near spawn and fade.
    for (let i = this.sprays.length - 1; i >= 0; i--) {
      const p = this.sprays[i];
      p.life -= dtMs;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 40 * dtSec;
      p.gfx.x = p.x; p.gfx.y = p.y;
      p.gfx.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.destroyParticle(p);
        this.sprays.splice(i, 1);
      }
    }
    // Streak — flows straight down, fades
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const p = this.streaks[i];
      p.life -= dtMs;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.gfx.x = p.x; p.gfx.y = p.y;
      p.gfx.alpha = Math.max(0, p.life / p.maxLife) * 0.85;
      if (p.life <= 0) {
        this.destroyParticle(p);
        this.streaks.splice(i, 1);
      }
    }
    // Impact — gentle settling, not a fountain. Big discs pile near the lip.
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const p = this.impacts[i];
      p.life -= dtMs;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 60 * dtSec;
      p.gfx.x = p.x; p.gfx.y = p.y;
      p.gfx.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.destroyParticle(p);
        this.impacts.splice(i, 1);
      }
    }
  }

  private destroyParticle(p: Particle): void {
    if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
    p.gfx.destroy();
  }
}

function segKey(s: WaterfallSegment): string {
  return `${s.type}:${s.gy}:${s.minGx}-${s.maxGx}`;
}
