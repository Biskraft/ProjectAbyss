import { Container, Graphics } from 'pixi.js';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

/**
 * SmokeWisp — dark gray cloud puffs that drift upward from burning tiles,
 * contrasting the bright ember motes. Spawn rate is intentionally low so
 * the silhouette doesn't compete with the flame sprites; the wisps live
 * BEHIND the fire sprite layer (closer to the halo) so they read as
 * "smoke rising past the flames" rather than overlay haze.
 *
 * Each wisp is a soft 3-blob ellipse cluster that expands while ascending
 * and fades over its lifetime.
 *
 * Spawned by TileMutatorRenderer's burning loop.
 */

interface Wisp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  baseR: number;          // initial blob radius
  color: number;
  swayPhase: number;
  swayAmp: number;        // px peak side-to-side
}

const SPAWN_PROB_PER_CELL = 0.045;   // ~1 wisp every ~22 frames per cell
const MAX_WISPS = 80;

export class SmokeWispManager {
  private gfx = new Graphics();
  private wisps: Wisp[] = [];

  constructor(parent: Container) {
    parent.addChild(this.gfx);
  }

  destroy(): void {
    destroyDisplayObject(this.gfx);
    this.wisps.length = 0;
  }

  trySpawn(cx: number, baseY: number): void {
    if (this.wisps.length >= MAX_WISPS) return;
    if (Math.random() > SPAWN_PROB_PER_CELL) return;
    // Dark gray dominant, occasional slightly warmer brown for variety.
    const dark = Math.random() < 0.7 ? 0x2a2a2e : 0x3a322a;
    const life = 1500 + Math.random() * 1500;
    this.wisps.push({
      x: cx + (Math.random() - 0.5) * 8,
      y: baseY - 6 - Math.random() * 4,
      vx: (Math.random() - 0.5) * 10,
      vy: -14 - Math.random() * 10,
      life,
      maxLife: life,
      baseR: 2.0 + Math.random() * 1.5,
      color: dark,
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: 0.5 + Math.random() * 0.8,
    });
  }

  update(dtMs: number): void {
    const g = this.gfx;
    g.clear();
    const dt = dtMs / 1000;
    for (let i = this.wisps.length - 1; i >= 0; i--) {
      const w = this.wisps[i];
      w.life -= dtMs;
      if (w.life <= 0) { this.wisps.splice(i, 1); continue; }
      // Continued slow ascent + slight damping.
      w.vy += -4 * dt;
      w.vy *= 1 - 0.4 * dt;
      w.vx *= 1 - 0.5 * dt;
      w.swayPhase += 2 * dt;
      w.x += w.vx * dt + Math.sin(w.swayPhase) * w.swayAmp * dt * 6;
      w.y += w.vy * dt;
      const r = w.life / w.maxLife; // 1 → 0
      // Expand as we rise (smoke fanning out) — radius grows from baseR
      // to ~2.3× by end of life.
      const grow = 1 + (1 - r) * 1.3;
      const rr = w.baseR * grow;
      // Alpha curve: rapid fade-in (first 12%), hold, long tail fade (last 50%).
      let a: number;
      if (r > 0.88) a = (1 - r) / 0.12;
      else if (r < 0.50) a = (r / 0.50) * 0.7;
      else a = 0.7 + ((r - 0.50) / 0.38) * 0.3;
      // 3-blob cluster — main + two satellites with slight offset.
      const cx = w.x, cy = w.y;
      g.ellipse(cx, cy, rr * 1.4, rr * 0.95).fill({ color: w.color, alpha: a * 0.45 });
      g.ellipse(cx - rr * 0.6, cy + rr * 0.2, rr * 0.85, rr * 0.6)
        .fill({ color: w.color, alpha: a * 0.40 });
      g.ellipse(cx + rr * 0.7, cy - rr * 0.1, rr * 0.75, rr * 0.55)
        .fill({ color: w.color, alpha: a * 0.40 });
    }
  }
}
