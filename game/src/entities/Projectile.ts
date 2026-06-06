import { Container, Graphics } from 'pixi.js';
import { GlowFilter } from '@effects/GlowFilter';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

/**
 * Simple projectile entity used by Ghost enemies.
 * Flies in a straight line, ignores terrain, and is destroyed on timeout or hit.
 */
export class Projectile {
  x: number;
  y: number;
  width = 8;
  height = 8;
  vx: number;
  vy: number;
  container: Container;
  alive = true;
  atk: number;

  private lifetime: number;
  private sprite: Graphics;

  constructor(x: number, y: number, vx: number, vy: number, atk: number, lifetime = 3000) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.atk = atk;
    this.lifetime = lifetime;

    this.container = new Container();
    this.sprite = new Graphics();

    // Ghostly ember: reddish-orange core with deep crimson outline.
    this.sprite.circle(4, 4, 4).fill({ color: 0x441100, alpha: 0.6 });
    this.sprite.circle(4, 4, 2.5).fill(0xFF5522);
    // Strong ember halo — reads as a glowing fireball on dark backgrounds.
    this.sprite.filters = [new GlowFilter({
      color: 0xFF5522,
      radius: 7,
      intensity: 2.8,
      coreBoost: 1.4,
    })];
    this.container.addChild(this.sprite);

    this.container.x = this.x;
    this.container.y = this.y;
  }

  update(dt: number): void {
    if (!this.alive) return;
    const dtSec = dt / 1000;
    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.alive = false;
    }

    // Pulse alpha for ghostly effect
    this.sprite.alpha = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  destroy(): void {
    destroyDisplayObject(this.container, { children: true });
  }
}
