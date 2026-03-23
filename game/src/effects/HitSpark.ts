import { Container, Graphics } from 'pixi.js';

/**
 * Sakurai: "Hit Effect = Impact Spark → Sharp Burst → Soft Glow"
 * Sharp line-based sparks emanating from hit point.
 * Dark outlines mixed in for contrast (Make It "Pop").
 */

interface Spark {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const SPARK_COUNT_LIGHT = 4;
const SPARK_COUNT_HEAVY = 7;
const SPARK_SPEED = 180;  // px/s
const SPARK_LIFE = 180;   // ms

export class HitSparkManager {
  private parent: Container;
  private sparks: Spark[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Spawn a hit spark burst at (x, y).
   * @param heavy - true for 3타 or critical hits (more sparks, bigger)
   * @param dirX - knockback direction for directional bias
   */
  spawn(x: number, y: number, heavy: boolean, dirX: number): void {
    const count = heavy ? SPARK_COUNT_HEAVY : SPARK_COUNT_LIGHT;
    const speedMult = heavy ? 1.4 : 1.0;
    const size = heavy ? 6 : 4;

    // Central flash burst (bright, fades fast)
    const flash = new Graphics();
    const flashSize = heavy ? 12 : 8;
    flash.circle(0, 0, flashSize).fill({ color: 0xffffff, alpha: 0.9 });
    flash.circle(0, 0, flashSize * 0.6).fill({ color: 0xffffaa, alpha: 1 });
    flash.x = x;
    flash.y = y;
    this.parent.addChild(flash);
    this.sparks.push({
      gfx: flash, x, y, vx: 0, vy: 0,
      life: SPARK_LIFE * 0.5, maxLife: SPARK_LIFE * 0.5,
    });

    // Line sparks
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      // Bias toward knockback direction
      const biasAngle = angle + dirX * 0.4;
      const speed = SPARK_SPEED * speedMult * (0.6 + Math.random() * 0.8);

      const gfx = new Graphics();
      // Dark outline for contrast (Sakurai: mix dark elements)
      gfx.moveTo(0, 0).lineTo(size * 1.5, 0).stroke({ color: 0x000000, width: 3 });
      // Bright core
      const color = heavy ? 0xffff44 : 0xffffff;
      gfx.moveTo(0, 0).lineTo(size, 0).stroke({ color, width: 1.5 });
      gfx.x = x;
      gfx.y = y;
      // Rotate toward travel direction
      gfx.rotation = biasAngle;

      this.parent.addChild(gfx);
      this.sparks.push({
        gfx,
        x, y,
        vx: Math.cos(biasAngle) * speed,
        vy: Math.sin(biasAngle) * speed,
        life: SPARK_LIFE * (0.7 + Math.random() * 0.6),
        maxLife: SPARK_LIFE,
      });
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      s.gfx.x = s.x;
      s.gfx.y = s.y;
      // Decelerate
      s.vx *= 0.92;
      s.vy *= 0.92;

      const t = Math.max(0, s.life / s.maxLife);
      s.gfx.alpha = t;
      s.gfx.scale.set(0.5 + t * 0.5);

      if (s.life <= 0) {
        if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
        this.sparks.splice(i, 1);
      }
    }
  }
}
