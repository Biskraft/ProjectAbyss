import { Container, Graphics } from 'pixi.js';

/**
 * Steam puff — soft white cloud bursts upward when fire meets water,
 * magma melts ice, or acid corrodes magma. Three overlapping ellipses
 * that drift up + expand + fade.
 *
 * Used wherever a hot-meets-wet interaction would visually call for vapor.
 * Pairs with TileMutator passive/attack effects.
 */

interface Puff {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  baseR: number;
  /** 0..1 — drives growth + alpha curve. */
  seed: number;
  /** Per-puff tint (set at spawn time, used by draw). */
  bodyColor: number;
  rimColor: number;
}

const PUFF_LIFE_MIN = 520;
const PUFF_LIFE_MAX = 820;
const PUFFS_PER_BURST = 3;
const MAX_PUFFS = 80;
const COLOR_PUFF = 0xe6f0f5;
const COLOR_PUFF_RIM = 0xffffff;

export interface PuffTint {
  /** Body color override (default `#e6f0f5` white). */
  body: number;
  /** Rim color override (default `#ffffff`). */
  rim?: number;
}

/** Preset tints for common chemical reactions. */
export const PUFF_TINT_TOXIC: PuffTint  = { body: 0xccdd44, rim: 0xeeff66 }; // R-NEW-003 acid flash
export const PUFF_TINT_PLASMA: PuffTint = { body: 0xb066ff, rim: 0xe0aaff }; // R-NEW-018 magma detonation

export class SteamPuffManager {
  private parent: Container;
  private puffs: Puff[] = [];

  constructor(parent: Container) { this.parent = parent; }

  /**
   * @param x        - World-space center
   * @param y        - World-space center (steam rises from here)
   * @param strength - 1.0 = default, ~0.6 small fizz, ~1.4 big jet, up to 2.0 for detonation
   * @param tint     - Optional color override (PUFF_TINT_TOXIC / PUFF_TINT_PLASMA / custom)
   */
  spawn(x: number, y: number, strength = 1.0, tint?: PuffTint): void {
    const s = Math.max(0.5, Math.min(2.0, strength));
    const bodyColor = tint?.body ?? COLOR_PUFF;
    const rimColor  = tint?.rim  ?? COLOR_PUFF_RIM;
    const count = Math.min(PUFFS_PER_BURST, Math.max(0, MAX_PUFFS - this.puffs.length));
    if (count <= 0) return;
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5;
      const speed = (30 + Math.random() * 40) * s;
      const gfx = new Graphics();
      gfx.x = x + (Math.random() - 0.5) * 6 * s;
      gfx.y = y + (Math.random() - 0.5) * 4;
      this.parent.addChild(gfx);
      const life = PUFF_LIFE_MIN + Math.random() * (PUFF_LIFE_MAX - PUFF_LIFE_MIN);
      this.puffs.push({
        gfx,
        x: gfx.x,
        y: gfx.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        baseR: (3.5 + Math.random() * 2.5) * s,
        seed: Math.random(),
        bodyColor,
        rimColor,
      });
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= dt;
      // Drift + slow lateral spread + gentle upward buoyancy
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy -= 30 * dtSec; // accelerate upward
      p.vx *= 0.96;       // damp lateral motion
      const k = 1 - Math.max(0, p.life / p.maxLife);
      const r = p.baseR * (1 + k * 1.8);
      // Alpha bell: low → peak ~0.3 → fade out
      const a = k < 0.25 ? (k / 0.25) * 0.7 : (1 - (k - 0.25) / 0.75) * 0.7;
      p.gfx.clear();
      p.gfx.ellipse(0, 0, r, r * 0.78).fill({ color: p.bodyColor, alpha: Math.max(0, a) });
      p.gfx.ellipse(-r * 0.2, -r * 0.2, r * 0.4, r * 0.32)
           .fill({ color: p.rimColor, alpha: Math.max(0, a * 0.6) });
      p.gfx.x = p.x;
      p.gfx.y = p.y;
      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        p.gfx.destroy();
        this.puffs.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.puffs) {
      if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.puffs.length = 0;
  }
}
