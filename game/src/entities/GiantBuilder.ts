/**
 * GiantBuilder — A massive Builder entity rendered from a separate LDtk level.
 *
 * Moves sub-pixel smooth along a vertical route. The scene is responsible
 * for stamping this builder's collisionGrid into the host grid each frame
 * (tile-aligned) so the player walks on it via standard tile physics.
 */

import { Container } from 'pixi.js';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { Texture } from 'pixi.js';
import { applyAreaTilesetToLdtkTiles } from '@data/areaPalettes';

const TILE = 16;

export interface BuilderRoutePoint {
  y: number;
  waitMs: number;
}

type BuilderState = 'moving' | 'waiting' | 'dormant';

export class GiantBuilder {
  readonly container: Container;
  readonly collisionGrid: number[][];
  readonly widthPx: number;
  readonly heightPx: number;
  readonly widthTiles: number;
  readonly heightTiles: number;

  lastDeltaY = 0;

  private route: BuilderRoutePoint[] = [];
  private routeIndex = 0;
  private state: BuilderState = 'dormant';
  private waitTimer = 0;
  private speed = 0;

  private renderer: LdtkRenderer;

  constructor(
    level: LdtkLevel,
    atlases: Record<string, Texture>,
    bgAreaId: string,
    wallAreaId: string,
  ) {
    this.widthPx = level.pxWid;
    this.heightPx = level.pxHei;
    this.widthTiles = Math.ceil(level.pxWid / TILE);
    this.heightTiles = Math.ceil(level.pxHei / TILE);
    this.collisionGrid = level.collisionGrid.map(r => [...r]);

    const bgTiles = [...level.backgroundTiles];
    const wallTiles = [...level.wallTiles];
    const shadowTiles = [...level.shadowTiles];
    applyAreaTilesetToLdtkTiles(bgAreaId, bgTiles);
    applyAreaTilesetToLdtkTiles(wallAreaId, wallTiles);
    applyAreaTilesetToLdtkTiles(wallAreaId, shadowTiles);

    this.renderer = new LdtkRenderer();
    this.renderer.renderLevel(bgTiles, wallTiles, shadowTiles, atlases);
    this.container = this.renderer.container;
  }

  placeInLevel(pixelX: number, pixelY: number): void {
    this.container.x = pixelX;
    this.container.y = pixelY;
  }

  setRoute(route: BuilderRoutePoint[], speed: number): void {
    this.route = route;
    this.speed = speed;
    this.routeIndex = 0;
    this.state = 'waiting';
    this.waitTimer = route[0]?.waitMs ?? 0;
  }

  activate(): void {
    if (this.state === 'dormant' && this.route.length > 0) {
      this.state = 'moving';
    }
  }

  update(dt: number): void {
    this.lastDeltaY = 0;
    if (this.state === 'dormant' || this.route.length === 0) return;

    if (this.state === 'waiting') {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.routeIndex = (this.routeIndex + 1) % this.route.length;
        this.state = 'moving';
      }
      return;
    }

    const target = this.route[this.routeIndex];
    const dirSign = Math.sign(target.y - this.container.y);
    if (dirSign === 0) {
      this.state = 'waiting';
      this.waitTimer = target.waitMs;
      return;
    }

    // Sub-pixel smooth motion. Container.y is continuous; physics stamp
    // quantization to whole tiles is handled by the scene.
    let step = dirSign * this.speed * (dt / 1000);

    // Do not overshoot the target.
    const remaining = target.y - this.container.y;
    if (dirSign > 0 && step > remaining) step = remaining;
    else if (dirSign < 0 && step < remaining) step = remaining;

    this.container.y += step;
    this.lastDeltaY = step;

    if (Math.abs(target.y - this.container.y) < 0.01) {
      this.container.y = target.y;
      this.state = 'waiting';
      this.waitTimer = target.waitMs;
    }
  }
}
