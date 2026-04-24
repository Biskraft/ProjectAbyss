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

  /**
   * Sub-pixel internal position (float). container.y is always rounded to
   * integer for pixel-perfect rendering; posY retains the fractional
   * accumulator so motion speed is preserved across integer snaps.
   */
  posY = 0;

  lastDeltaY = 0;

  private route: BuilderRoutePoint[] = [];
  private routeIndex = 0;
  private state: BuilderState = 'dormant';
  private waitTimer = 0;
  private speed = 0;
  private loop = true;

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
    this.posY = pixelY;
    this.container.y = Math.round(pixelY);
  }

  setRoute(route: BuilderRoutePoint[], speed: number, loop = true): void {
    this.route = route;
    this.speed = speed;
    this.loop = loop;
    this.routeIndex = 0;
    this.state = 'waiting';
    this.waitTimer = route[0]?.waitMs ?? 0;
  }

  activate(): void {
    if (this.state === 'dormant' && this.route.length > 0) {
      this.state = 'moving';
    }
  }

  /** True while the builder is actively traveling between route points. */
  get isMoving(): boolean {
    return this.state === 'moving';
  }

  update(dt: number): void {
    this.lastDeltaY = 0;
    if (this.state === 'dormant' || this.route.length === 0) return;

    if (this.state === 'waiting') {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        const next = this.routeIndex + 1;
        if (next >= this.route.length) {
          if (this.loop) {
            this.routeIndex = 0;
            this.state = 'moving';
          } else {
            // One-shot: end of route, go permanently dormant.
            this.state = 'dormant';
          }
        } else {
          this.routeIndex = next;
          this.state = 'moving';
        }
      }
      return;
    }

    const target = this.route[this.routeIndex];
    const dirSign = Math.sign(target.y - this.posY);
    if (dirSign === 0) {
      this.state = 'waiting';
      this.waitTimer = target.waitMs;
      return;
    }

    // Sub-pixel smooth motion in posY (float). container.y snaps to integer
    // each frame to avoid nearest-filter shimmer at X.5 positions. Physics
    // stamp quantization to whole tiles is handled by the scene.
    let step = dirSign * this.speed * (dt / 1000);

    // Do not overshoot the target.
    const remaining = target.y - this.posY;
    if (dirSign > 0 && step > remaining) step = remaining;
    else if (dirSign < 0 && step < remaining) step = remaining;

    const prevRenderY = this.container.y;
    this.posY += step;
    this.container.y = Math.round(this.posY);
    this.lastDeltaY = this.container.y - prevRenderY;

    if (Math.abs(target.y - this.posY) < 0.01) {
      this.posY = target.y;
      this.container.y = Math.round(target.y);
      this.state = 'waiting';
      this.waitTimer = target.waitMs;
    }
  }
}
