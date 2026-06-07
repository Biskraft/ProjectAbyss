import { Container, Graphics } from 'pixi.js';
import { GlowFilter } from '@effects/GlowFilter';
import { getTile, isSolid, TILE_SIZE } from '@core/Physics';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';
import { Debug } from '@core/Debug';

/**
 * Simple projectile entity used by Ghost enemies.
 * Flies in a straight line and is destroyed by IntGrid wall tiles.
 * Platforms, fluids, hazards, and air are pass-through.
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
  private readonly debugPoint = new Graphics();
  private collisionGrid: number[][] | null = null;

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
    this.container.addChild(this.debugPoint);

    this.container.x = this.x;
    this.container.y = this.y;
  }

  bindCollisionGrid(collisionGrid: number[][]): void {
    this.collisionGrid = collisionGrid;
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
    if (this.collisionGrid && this.overlapsWallTile()) {
      this.alive = false;
    }

    // Pulse alpha for ghostly effect
    this.sprite.alpha = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
    this.renderDebugPoint();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  private renderDebugPoint(): void {
    this.debugPoint.clear();
    if (!Debug.infoVisible || !this.alive) return;
    this.debugPoint
      .circle(this.width / 2, this.height / 2, 2)
      .fill({ color: 0x00e5ff, alpha: 0.95 });
    this.debugPoint
      .moveTo(this.width / 2 - 5, this.height / 2)
      .lineTo(this.width / 2 + 5, this.height / 2)
      .moveTo(this.width / 2, this.height / 2 - 5)
      .lineTo(this.width / 2, this.height / 2 + 5)
      .stroke({ color: 0x00e5ff, alpha: 0.9, width: 1 });
  }

  private overlapsWallTile(): boolean {
    const grid = this.collisionGrid;
    if (!grid) return false;
    const centerCol = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const centerRow = Math.floor((this.y + this.height / 2) / TILE_SIZE);
    return isSolid(getTile(grid, centerCol, centerRow));
  }

  destroy(): void {
    destroyDisplayObject(this.container, { children: true });
  }
}
