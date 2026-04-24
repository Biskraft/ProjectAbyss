/**
 * GiantBuilder — A massive Builder entity rendered from a separate LDtk level.
 *
 * Collision tiles are stamped ONCE at placement. During movement, only the
 * visual container moves. Player riding is handled by the scene via
 * post-physics surface snapping.
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

  /** Smooth Y delta applied this frame. */
  lastDeltaY = 0;

  private route: BuilderRoutePoint[] = [];
  private routeIndex = 0;
  private state: BuilderState = 'dormant';
  private waitTimer = 0;
  private speed = 0;
  private hostGrid: number[][] | null = null;

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

  /** Place builder and stamp collision into host grid ONCE. */
  placeInLevel(hostGrid: number[][], pixelX: number, pixelY: number): void {
    this.hostGrid = hostGrid;
    this.container.x = pixelX;
    this.container.y = pixelY;

    // Static stamp — never updated during movement
    const tileOffX = Math.floor(pixelX / TILE);
    const tileOffY = Math.floor(pixelY / TILE);
    const hostH = hostGrid.length;
    const hostW = hostGrid[0]?.length ?? 0;
    for (let r = 0; r < this.heightTiles; r++) {
      for (let c = 0; c < this.widthTiles; c++) {
        const v = this.collisionGrid[r]?.[c] ?? 0;
        if (v === 0) continue;
        const hr = tileOffY + r;
        const hc = tileOffX + c;
        if (hr >= 0 && hr < hostH && hc >= 0 && hc < hostW) {
          hostGrid[hr][hc] = v;
        }
      }
    }
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

  /**
   * Find the builder surface Y in WORLD coordinates at a given world X.
   * Scans the builder's collision grid from top down to find the first
   * solid tile at the given column.
   * Returns null if the X is outside the builder or no surface found.
   */
  getSurfaceY(worldX: number): number | null {
    const localX = worldX - this.container.x;
    const col = Math.floor(localX / TILE);
    if (col < 0 || col >= this.widthTiles) return null;

    for (let r = 0; r < this.heightTiles; r++) {
      if ((this.collisionGrid[r]?.[col] ?? 0) >= 1) {
        return this.container.y + r * TILE;
      }
    }
    return null;
  }

  /**
   * Find the nearest surface at or below a given local Y for a world X.
   */
  getSurfaceYBelow(worldX: number, worldFeetY: number): number | null {
    const localX = worldX - this.container.x;
    const col = Math.floor(localX / TILE);
    if (col < 0 || col >= this.widthTiles) return null;

    const localFeetY = worldFeetY - this.container.y;
    const startRow = Math.max(0, Math.floor(localFeetY / TILE) - 1);

    for (let r = startRow; r < this.heightTiles; r++) {
      if ((this.collisionGrid[r]?.[col] ?? 0) >= 1) {
        // Check tile above is air (this is a surface, not interior)
        const above = r > 0 ? (this.collisionGrid[r - 1]?.[col] ?? 0) : 0;
        if (above === 0) {
          return this.container.y + r * TILE;
        }
      }
    }
    return null;
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
    const currentY = this.container.y;
    const dir = Math.sign(target.y - currentY);
    const rawStep = dir * this.speed * (dt / 1000);
    const remaining = Math.abs(target.y - currentY);
    const clampedStep = Math.abs(rawStep) > remaining ? dir * remaining : rawStep;

    this.container.y += clampedStep;
    this.lastDeltaY = clampedStep;

    if (Math.abs(this.container.y - target.y) < 0.5) {
      this.container.y = target.y;
      this.state = 'waiting';
      this.waitTimer = target.waitMs;
    }
  }
}
