import { Container, Graphics } from 'pixi.js';

/**
 * Critical highlight — golden starburst overlay spawned on top of a hit spark
 * when HitResult.critical is true. 4-point star with bright core.
 */

interface Star {
  gfx: Graphics;
  life: number;
  maxLife: number;
}

const LIFE = 240;

export class CriticalHighlightManager {
  private parent: Container;
  private stars: Star[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(x: number, y: number): void {
    const gfx = new Graphics();
    // 4-point star (vertical + horizontal rays)
    const long = 18;
    const thick = 3;
    // Dark outline for readability
    gfx.rect(-long, -thick / 2, long * 2, thick).fill({ color: 0x000000, alpha: 0.8 });
    gfx.rect(-thick / 2, -long, thick, long * 2).fill({ color: 0x000000, alpha: 0.8 });
    // Bright core rays
    gfx.rect(-long + 1, -thick / 2 + 0.5, long * 2 - 2, thick - 1).fill({ color: 0xffd84d, alpha: 1 });
    gfx.rect(-thick / 2 + 0.5, -long + 1, thick - 1, long * 2 - 2).fill({ color: 0xfff5a0, alpha: 1 });
    // Central hot spot
    gfx.circle(0, 0, 4).fill({ color: 0xffffff, alpha: 1 });

    gfx.x = x;
    gfx.y = y;
    gfx.rotation = Math.random() * Math.PI * 0.25;
    this.parent.addChild(gfx);
    this.stars.push({ gfx, life: LIFE, maxLife: LIFE });
  }

  update(dt: number): void {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      s.life -= dt;
      const t = Math.max(0, s.life / s.maxLife);
      s.gfx.alpha = t;
      s.gfx.scale.set(0.5 + (1 - t) * 1.0);
      s.gfx.rotation += dt * 0.008;
      if (s.life <= 0) {
        if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
        s.gfx.destroy();
        this.stars.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const s of this.stars) {
      if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
      s.gfx.destroy();
    }
    this.stars.length = 0;
  }
}
