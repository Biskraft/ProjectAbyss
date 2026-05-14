import { Container, Graphics } from 'pixi.js';

/**
 * EmberRise — small luminous particles drifting upward from every burning
 * tile cell. Decoupled from the fire sprite renderer so each cell only
 * needs to call `trySpawn(cx, baseY)` per frame; the manager itself owns
 * lifetime, motion (slight upward buoyancy + horizontal sway), color, and
 * fade.
 *
 * Visual intent (TileSystem §3.4):
 *   - 1–2 px pixel-art motes — readable at native resolution.
 *   - 3 color tiers: bright yellow (~50%), orange (~35%), white-hot (~15%).
 *   - Rise ~30–60 px before fading. Hard cap on count keeps draws cheap.
 *
 * Spawned by TileMutatorRenderer's burning loop. Drawn on the same
 * above-fluid parent as the fire sprites so embers float OVER fluid pools.
 */

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  swayPhase: number;
}

const SPAWN_PROB_PER_CELL = 0.18;   // ~1 ember every 6 frames per cell
const MAX_EMBERS = 240;

export class EmberRiseManager {
  private gfx = new Graphics();
  private embers: Ember[] = [];

  constructor(parent: Container) {
    parent.addChild(this.gfx);
  }

  destroy(): void {
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    this.gfx.destroy();
    this.embers.length = 0;
  }

  /**
   * Try to spawn one ember at a given pixel point (typically a burning
   * cell's bottom-center). Subject to per-frame probability + global cap.
   */
  trySpawn(cx: number, baseY: number): void {
    if (this.embers.length >= MAX_EMBERS) return;
    if (Math.random() > SPAWN_PROB_PER_CELL) return;
    const colorRoll = Math.random();
    const color = colorRoll < 0.5  ? 0xffee88
                : colorRoll < 0.85 ? 0xff8833
                                   : 0xffffff;
    const life = 700 + Math.random() * 600;
    this.embers.push({
      x: cx + (Math.random() - 0.5) * 14,
      y: baseY - Math.random() * 4,
      vx: (Math.random() - 0.5) * 12,
      vy: -22 - Math.random() * 26,
      life,
      maxLife: life,
      size: Math.random() < 0.65 ? 1 : 2,
      color,
      swayPhase: Math.random() * Math.PI * 2,
    });
  }

  /**
   * Special-purpose spawner: a fast "burst" used when a new cell ignites
   * (e.g. magma → flammable propagation), giving a small upward shower of
   * sparks. Bypasses the spawn probability gate.
   */
  burst(cx: number, baseY: number, count = 6): void {
    for (let i = 0; i < count; i++) {
      if (this.embers.length >= MAX_EMBERS) break;
      const colorRoll = Math.random();
      const color = colorRoll < 0.6 ? 0xffffff : 0xffee88;
      const life = 400 + Math.random() * 350;
      this.embers.push({
        x: cx + (Math.random() - 0.5) * 6,
        y: baseY - 2,
        vx: (Math.random() - 0.5) * 60,
        vy: -60 - Math.random() * 50,
        life,
        maxLife: life,
        size: 1,
        color,
        swayPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  update(dtMs: number): void {
    const g = this.gfx;
    g.clear();
    const dt = dtMs / 1000;
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life -= dtMs;
      if (e.life <= 0) { this.embers.splice(i, 1); continue; }
      // Buoyancy: a small upward force opposing gravity so embers ascend.
      // vy stays negative most of the life; the upward acceleration tapers
      // as the ember "cools" (slowdown via damping).
      e.vy += -12 * dt;
      e.vy *= 1 - 0.6 * dt;     // damping (cooler embers slow down)
      e.vx *= 1 - 0.9 * dt;
      e.swayPhase += 4 * dt;
      const swayX = Math.sin(e.swayPhase) * 12 * dt; // gentle side-to-side
      e.x += e.vx * dt + swayX;
      e.y += e.vy * dt;
      // Alpha — quick fade-in (first 15%), hold middle, fade-out last 30%.
      const r = e.life / e.maxLife; // 1 → 0
      let a: number;
      if (r > 0.85) a = (1 - r) / 0.15;
      else if (r < 0.30) a = r / 0.30;
      else a = 1;
      g.rect(e.x | 0, e.y | 0, e.size, e.size).fill({ color: e.color, alpha: a * 0.95 });
    }
  }
}
