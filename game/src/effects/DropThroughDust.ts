import { Container, Graphics } from 'pixi.js';

/**
 * Drop-through dust — thin horizontal dust streak left behind when the player
 * drops through a one-way platform. Conceptually different from landing dust:
 * it signals "went through a surface" rather than "landed on ground".
 */

interface Streak {
  gfx: Graphics;
  life: number;
  maxLife: number;
  width: number;
}

const LIFE = 320;
const COLOR = 0xb8a679;

export class DropThroughDustManager {
  private parent: Container;
  private streaks: Streak[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(centerX: number, platformY: number, halfWidth: number): void {
    const gfx = new Graphics();
    const w = Math.max(12, halfWidth);
    gfx.ellipse(0, 0, w, 2).fill({ color: COLOR, alpha: 0.75 });
    gfx.ellipse(0, 0, w * 0.6, 1.2).fill({ color: 0xe3cf94, alpha: 0.9 });
    gfx.x = centerX;
    gfx.y = platformY;
    this.parent.addChild(gfx);
    this.streaks.push({ gfx, life: LIFE, maxLife: LIFE, width: w });
  }

  update(dt: number): void {
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      s.life -= dt;
      const t = Math.max(0, s.life / s.maxLife);
      s.gfx.alpha = t * 0.85;
      s.gfx.scale.x = 1 + (1 - t) * 0.25;
      s.gfx.scale.y = 1 + (1 - t) * 2.2; // dust puffs vertically as it fades
      if (s.life <= 0) {
        if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
        s.gfx.destroy();
        this.streaks.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const s of this.streaks) {
      if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
      s.gfx.destroy();
    }
    this.streaks.length = 0;
  }
}
