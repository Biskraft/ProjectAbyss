import { Container, Graphics } from 'pixi.js';

/**
 * Counter-Current Surge VFX — two phases:
 *
 * CHARGING (surge_charge state):
 *   - Aura ring beneath the player, pulsing + expanding as charge builds.
 *   - Rising embers converge toward the player's center.
 *
 * FLYING (surge_fly state):
 *   - Tight vertical streak trail behind the player (upward).
 *   - Bright leading-edge glow at the player center.
 *
 * Scene calls tickCharge(dt, centerX, footY, chargeRatio) each frame while
 * the surge is charging, then tickFly(dt, centerX, centerY) while flying.
 * Call stop() when the state ends.
 */

const AURA_COLOR = 0x5fd6ff;       // cyan
const AURA_BRIGHT = 0xd0f4ff;

interface Ember {
  gfx: Graphics;
  baseX: number;
  baseY: number;
  life: number;
  maxLife: number;
  targetX: number;
  targetY: number;
}

interface Streak {
  gfx: Graphics;
  life: number;
  maxLife: number;
}

export class SurgeVfxManager {
  private parent: Container;
  private aura: Graphics | null = null;
  private embers: Ember[] = [];
  private emberTimer = 0;
  private streaks: Streak[] = [];
  private streakTimer = 0;

  constructor(parent: Container) { this.parent = parent; }

  private ensureAura(): Graphics {
    if (!this.aura) {
      this.aura = new Graphics();
      this.parent.addChild(this.aura);
    }
    return this.aura;
  }

  /** Charge phase — pulsing aura + converging embers. */
  tickCharge(dt: number, centerX: number, footY: number, chargeRatio: number): void {
    const aura = this.ensureAura();
    aura.x = centerX;
    aura.y = footY;
    aura.clear();
    const pulse = 0.85 + Math.sin((performance.now() / 1000) * 8) * 0.15;
    const outerR = (18 + chargeRatio * 20) * pulse;
    const innerR = (8 + chargeRatio * 10) * pulse;
    const alpha = 0.45 + chargeRatio * 0.4;
    aura.ellipse(0, 0, outerR, outerR * 0.35)
      .stroke({ color: AURA_COLOR, width: 2, alpha });
    aura.ellipse(0, 0, innerR, innerR * 0.35)
      .stroke({ color: AURA_BRIGHT, width: 1, alpha: alpha * 0.9 });

    // Ember emission rate increases with charge
    this.emberTimer -= dt;
    const interval = 70 - chargeRatio * 40;
    if (this.emberTimer <= 0) {
      this.emberTimer = interval;
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 20;
      const baseX = centerX + Math.cos(angle) * dist;
      const baseY = footY - 10 + Math.sin(angle) * 10;
      const gfx = new Graphics();
      gfx.circle(0, 0, 1.8).fill({ color: AURA_BRIGHT, alpha: 1 });
      gfx.x = baseX; gfx.y = baseY;
      this.parent.addChild(gfx);
      this.embers.push({
        gfx, baseX, baseY,
        life: 420, maxLife: 420,
        targetX: centerX, targetY: footY - 10,
      });
    }

    this.updateEmbers(dt);
  }

  /** Fly phase — upward streak trail + head glow. */
  tickFly(dt: number, centerX: number, centerY: number): void {
    if (this.aura) {
      this.aura.clear();
      if (this.aura.parent) this.aura.parent.removeChild(this.aura);
      this.aura.destroy();
      this.aura = null;
    }

    this.streakTimer -= dt;
    if (this.streakTimer <= 0) {
      this.streakTimer = 18;
      const gfx = new Graphics();
      const width = 6 + Math.random() * 3;
      const length = 18 + Math.random() * 8;
      gfx.rect(-width / 2, -length / 2, width, length).fill({ color: AURA_BRIGHT, alpha: 0.7 });
      gfx.rect(-width / 4, -length / 2, width / 2, length).fill({ color: 0xffffff, alpha: 1 });
      gfx.x = centerX + (Math.random() - 0.5) * 4;
      gfx.y = centerY + 4;
      this.parent.addChild(gfx);
      this.streaks.push({ gfx, life: 260, maxLife: 260 });
    }

    // Leading-edge head glow (draw fresh each frame via aura slot repurposed)
    // Here we just update streaks.
    this.updateStreaks(dt);
    this.updateEmbers(dt); // finish any remaining embers from charge
  }

  private updateEmbers(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life -= dt;
      const k = 1 - Math.max(0, e.life / e.maxLife);
      e.gfx.x = e.baseX + (e.targetX - e.baseX) * k;
      e.gfx.y = e.baseY + (e.targetY - e.baseY) * k;
      e.gfx.alpha = 1 - k;
      void dtSec;
      if (e.life <= 0) {
        if (e.gfx.parent) e.gfx.parent.removeChild(e.gfx);
        e.gfx.destroy();
        this.embers.splice(i, 1);
      }
    }
  }

  private updateStreaks(dt: number): void {
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      s.life -= dt;
      const t = Math.max(0, s.life / s.maxLife);
      s.gfx.alpha = t * 0.85;
      s.gfx.scale.y = t;
      if (s.life <= 0) {
        if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
        s.gfx.destroy();
        this.streaks.splice(i, 1);
      }
    }
  }

  /** Called while neither charge nor fly is active — still updates fading trails. */
  idleTick(dt: number): void {
    this.updateEmbers(dt);
    this.updateStreaks(dt);
    if (this.aura) {
      if (this.aura.parent) this.aura.parent.removeChild(this.aura);
      this.aura.destroy();
      this.aura = null;
    }
  }

  clear(): void {
    if (this.aura) {
      if (this.aura.parent) this.aura.parent.removeChild(this.aura);
      this.aura.destroy();
      this.aura = null;
    }
    for (const e of this.embers) {
      if (e.gfx.parent) e.gfx.parent.removeChild(e.gfx);
      e.gfx.destroy();
    }
    for (const s of this.streaks) {
      if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
      s.gfx.destroy();
    }
    this.embers.length = 0;
    this.streaks.length = 0;
  }
}
