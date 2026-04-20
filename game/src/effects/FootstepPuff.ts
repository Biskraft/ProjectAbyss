import { Container, Graphics } from 'pixi.js';

/**
 * Footstep puff — tiny single puff under the back foot as the player runs.
 * Manager throttles by a configurable step interval (ms). Scene calls
 * stepIfMoving() each frame with current movement state.
 */

interface Puff {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const LIFE = 260;
const STEP_INTERVAL = 240; // ms between footsteps at full speed
const COLOR = 0xc8b48a;

export class FootstepPuffManager {
  private parent: Container;
  private puffs: Puff[] = [];
  private stepTimer = 0;

  constructor(parent: Container) { this.parent = parent; }

  /**
   * Call each frame. Emits a puff if the player is moving horizontally on
   * ground at more than ~40 px/s and the step timer has elapsed.
   */
  stepIfMoving(
    dt: number,
    grounded: boolean,
    footX: number,
    footY: number,
    vx: number,
    facingRight: boolean,
  ): void {
    this.stepTimer -= dt;
    if (!grounded || Math.abs(vx) < 40) {
      this.stepTimer = 0;
      return;
    }
    if (this.stepTimer > 0) return;
    this.stepTimer = STEP_INTERVAL;

    // Puff trails behind the player (opposite to facing)
    const backDir = facingRight ? -1 : 1;
    const gfx = new Graphics();
    const radius = 1.8 + Math.random() * 1.2;
    gfx.circle(0, 0, radius).fill({ color: COLOR, alpha: 0.6 });
    gfx.x = footX + backDir * 3;
    gfx.y = footY - 1;
    this.parent.addChild(gfx);

    this.puffs.push({
      gfx, x: gfx.x, y: gfx.y,
      vx: backDir * (15 + Math.random() * 15),
      vy: -8 - Math.random() * 12,
      life: LIFE, maxLife: LIFE,
    });
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= dt;
      p.x += p.vx * dtSec; p.y += p.vy * dtSec;
      p.vx *= 0.88; p.vy = p.vy * 0.92 + 35 * dtSec;
      p.gfx.x = p.x; p.gfx.y = p.y;
      const t = Math.max(0, p.life / p.maxLife);
      p.gfx.alpha = t * 0.65;
      p.gfx.scale.set(1 + (1 - t) * 0.5);
      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        this.puffs.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.puffs) if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
    this.puffs.length = 0;
    this.stepTimer = 0;
  }
}
