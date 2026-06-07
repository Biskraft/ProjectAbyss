import { Container, Graphics } from 'pixi.js';
import { aabbOverlap, resolveY, TILE_SIZE, TILE_ACID, TILE_CYRO, TILE_MAGMA, TILE_OIL, TILE_WATER } from '@core/Physics';
import { detachDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import type { Enemy } from './Enemy';

const DEFAULT_TELEGRAPH_MS = 1000;
const DEFAULT_GRAVITY = 1800;
const MAX_FALL_SPEED = 760;
const DUST_INTERVAL_MS = 38;

type FallingHazardState = 'armed' | 'telegraph' | 'falling' | 'spent';
export type FallingHazardFluidType = 'water' | 'magma' | 'oil' | 'acid' | 'cyro' | null;

export interface FallingHazardConfig {
  x: number;
  y: number;
  triggerHeight: number;
  tileW?: number;
  tileH?: number;
  telegraphMs?: number;
}

export interface FallingHazardImpact {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  bottomY: number;
  fluidType: FallingHazardFluidType;
}

interface Dust {
  gfx: Graphics;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class FallingHazard {
  readonly container = new Container();
  readonly triggerX: number;
  readonly triggerY: number;
  readonly triggerWidth: number;
  readonly triggerHeight: number;
  readonly width: number;
  readonly height: number;
  readonly telegraphMs: number;

  private readonly block = new Graphics();
  private readonly telegraph = new Graphics();
  private readonly originX: number;
  private readonly originY: number;
  private state: FallingHazardState = 'armed';
  private timer = 0;
  private dustTimer = 0;
  private vy = 0;
  private x: number;
  private y: number;
  private hasDamagedPlayer = false;
  private readonly damagedEnemies = new Set<Enemy<string>>();
  private readonly dust: Dust[] = [];

  constructor(config: FallingHazardConfig) {
    const tileW = Math.max(1, Math.floor(config.tileW ?? 2));
    const tileH = Math.max(1, Math.floor(config.tileH ?? 1));
    this.width = tileW * TILE_SIZE;
    this.height = tileH * TILE_SIZE;
    this.triggerX = config.x - this.width;
    this.triggerY = config.y;
    this.triggerWidth = this.width * 3;
    this.triggerHeight = Math.max(1, config.triggerHeight);
    this.telegraphMs = Math.max(0, config.telegraphMs ?? DEFAULT_TELEGRAPH_MS);

    this.originX = config.x;
    this.originY = this.triggerY - this.height;
    this.x = this.originX;
    this.y = this.originY;

    this.container.addChild(this.telegraph, this.block);
    this.drawBlock();
    this.drawTelegraph(0);
    this.syncBlock();
  }

  update(dt: number, grid: number[][]): FallingHazardImpact | null {
    this.updateDust(dt);

    if (this.state === 'telegraph') {
      this.timer += dt;
      this.dustTimer += dt;
      while (this.dustTimer >= DUST_INTERVAL_MS) {
        this.dustTimer -= DUST_INTERVAL_MS;
        this.spawnDust();
      }
      this.drawTelegraph(Math.min(1, this.timer / Math.max(1, this.telegraphMs)));
      this.block.x = this.x + (Math.random() - 0.5) * 1.5;
      if (this.timer >= this.telegraphMs) this.startFalling();
      return null;
    }

    if (this.state !== 'falling') return null;

    const dtSec = dt / 1000;
    this.vy = Math.min(MAX_FALL_SPEED, this.vy + DEFAULT_GRAVITY * dtSec);
    const result = resolveY(this.x, this.y, this.width, this.height, this.vy * dtSec, grid, false);
    this.y = result.y;
    this.syncBlock();

    if (result.collided || result.grounded) {
      const impact = this.createImpact(grid);
      this.finish();
      return impact;
    }
    return null;
  }

  tryTrigger(playerBox: { x: number; y: number; width: number; height: number }): boolean {
    if (this.state !== 'armed') return false;
    if (!aabbOverlap(playerBox, this.getTriggerAABB())) return false;
    this.state = 'telegraph';
    this.timer = 0;
    this.dustTimer = DUST_INTERVAL_MS;
    this.drawTelegraph(0);
    return true;
  }

  overlapsPlayer(playerBox: { x: number; y: number; width: number; height: number }): boolean {
    if (this.state !== 'falling' || this.hasDamagedPlayer) return false;
    if (!aabbOverlap(playerBox, this.getAABB())) return false;
    this.hasDamagedPlayer = true;
    return true;
  }

  overlapsEnemy(enemy: Enemy<string>): boolean {
    if (this.state !== 'falling' || this.damagedEnemies.has(enemy)) return false;
    if (!enemy.alive || enemy.hp <= 0) return false;
    if (!aabbOverlap(enemy, this.getAABB())) return false;
    this.damagedEnemies.add(enemy);
    return true;
  }

  getAABB(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  destroy(): void {
    for (const dust of this.dust) detachDisplayObject(dust.gfx);
    this.dust.length = 0;
    detachDisplayObject(this.container);
  }

  private getTriggerAABB(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.triggerX,
      y: this.triggerY,
      width: this.triggerWidth,
      height: this.triggerHeight,
    };
  }

  private startFalling(): void {
    this.state = 'falling';
    this.timer = 0;
    this.vy = 0;
    this.block.x = this.x;
    this.drawTelegraph(1);
  }

  private finish(): void {
    this.state = 'spent';
    this.block.visible = false;
    this.telegraph.visible = false;
  }

  private createImpact(grid: number[][]): FallingHazardImpact {
    const gx = Math.floor((this.x + this.width / 2) / TILE_SIZE);
    const gy = Math.floor((this.y + this.height) / TILE_SIZE);
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      centerX: this.x + this.width / 2,
      bottomY: this.y + this.height,
      fluidType: this.fluidTypeAt(grid, gx, gy),
    };
  }

  private fluidTypeAt(grid: number[][], gx: number, gy: number): FallingHazardFluidType {
    for (let y = gy - 1; y <= gy + 1; y++) {
      for (let x = gx - 1; x <= gx + 1; x++) {
        switch (grid[y]?.[x]) {
          case TILE_WATER: return 'water';
          case TILE_MAGMA: return 'magma';
          case TILE_OIL: return 'oil';
          case TILE_ACID: return 'acid';
          case TILE_CYRO: return 'cyro';
        }
      }
    }
    return null;
  }

  private drawBlock(): void {
    this.block.clear();
    this.block.rect(0, 0, this.width, this.height).fill({ color: 0x2b3138, alpha: 0.96 });
    this.block.rect(0, 0, this.width, this.height).stroke({ color: 0x9ba7a8, width: 1, alpha: 0.75 });
    for (let x = 4; x < this.width; x += 10) {
      this.block.moveTo(x, 2).lineTo(x + 4, this.height - 3).stroke({ color: 0x111820, width: 1, alpha: 0.55 });
    }
  }

  private drawTelegraph(progress: number): void {
    this.telegraph.clear();
    this.telegraph.visible = this.state !== 'spent';
    if (this.state !== 'telegraph') return;
    const alpha = 0.28 + progress * 0.45;
    this.telegraph.rect(this.originX, this.triggerY + this.triggerHeight - 2, this.width, 2)
      .fill({ color: 0xd8c48a, alpha });
  }

  private syncBlock(): void {
    this.block.x = this.x;
    this.block.y = this.y;
  }

  private spawnDust(): void {
    const gfx = new Graphics();
    const x = this.originX + Math.random() * this.width;
    const y = this.triggerY + Math.random() * 3;
    gfx.circle(0, 0, 2.2 + Math.random() * 1.8).fill({ color: 0xd8c48a, alpha: 0.88 });
    gfx.x = x;
    gfx.y = y;
    this.container.addChild(gfx);
    this.dust.push({
      gfx,
      x,
      y,
      vy: 105 + Math.random() * 135,
      life: 560,
      maxLife: 560,
    });
  }

  private updateDust(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const dust = this.dust[i];
      dust.life -= dt;
      dust.y += dust.vy * dtSec;
      dust.gfx.x = dust.x;
      dust.gfx.y = dust.y;
      dust.gfx.alpha = Math.max(0, dust.life / dust.maxLife);
      if (dust.life <= 0) {
        detachDisplayObject(dust.gfx);
        this.dust.splice(i, 1);
      }
    }
  }
}
