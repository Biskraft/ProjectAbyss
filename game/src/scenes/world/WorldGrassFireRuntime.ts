import type { Container } from 'pixi.js';
import { AshRemnantManager } from '@effects/AshRemnant';
import { GrassClumpFireSystem } from '@effects/GrassClumpFire';
import type { TileMutator } from '@systems/TileMutator';

export class WorldGrassFireRuntime {
  private readonly grassClumpFire = new GrassClumpFireSystem();
  private ashRemnantManager: AshRemnantManager | null = null;

  get system(): GrassClumpFireSystem {
    return this.grassClumpFire;
  }

  get ashRemnant(): AshRemnantManager {
    if (!this.ashRemnantManager) throw new Error('WorldGrassFireRuntime.ashRemnant used before initialize()');
    return this.ashRemnantManager;
  }

  initialize(entityLayer: Container): void {
    this.grassClumpFire.setFireLayer(entityLayer);
    this.ashRemnantManager = new AshRemnantManager(entityLayer);
  }

  clearGrass(): void {
    this.grassClumpFire.clear();
  }

  clearAsh(): void {
    this.ashRemnantManager?.clear();
  }

  registerProceduralClumps(
    clumps: Parameters<GrassClumpFireSystem['register']>[0],
  ): ReturnType<GrassClumpFireSystem['register']> {
    return this.grassClumpFire.register(clumps);
  }

  registerProceduralBurnables(
    clumps: Parameters<GrassClumpFireSystem['register']>[0],
    tileMutator: TileMutator,
  ): void {
    for (const prop of this.registerProceduralClumps(clumps)) {
      tileMutator.registerBurnable(prop);
    }
  }

  spawnAsh(cx: number, baseY: number, footprintW: number, fadeMs?: number): void {
    this.ashRemnant.spawn(cx, baseY, footprintW, fadeMs);
  }

  igniteInCellAABB(gx0: number, gy0: number, gx1: number, gy1: number): number {
    return this.grassClumpFire.igniteInCellAABB(gx0, gy0, gx1, gy1);
  }

  update(dt: number, tileMutator: TileMutator, collisionGrid: number[][], tileSize: number): void {
    this.grassClumpFire.update(dt, tileMutator, collisionGrid, this.ashRemnant, tileSize);
    this.ashRemnant.update(dt);
  }
}
