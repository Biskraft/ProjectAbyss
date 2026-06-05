import type { Game } from '../../Game';
import type { Enemy } from '@entities/Enemy';
import { ThrowableContainer } from '@entities/ThrowableContainer';
import type { FluidSystem } from '@effects/FluidSystem';
import { SteamPuffManager } from '@effects/SteamPuff';
import type { TileMutator } from '@systems/TileMutator';
import {
  applyAcidExposureToNearbyContainers,
  applyContainerFluidImpactSideEffects,
  applyContainerFluidContactEffects,
  getContainerFluidTile,
  paintContainerFluidCells,
} from '@scenes/shared/ContainerFluidHelpers';

interface WorldContainerFluidRuntimeDeps {
  game: Game;
  getCollisionGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getFluidSystem: () => FluidSystem;
  getContainers: () => readonly ThrowableContainer[];
  getEnemies: () => readonly Enemy<string>[];
  getSteamPuff: () => SteamPuffManager;
  rerenderTilemap: () => void;
}

export class WorldContainerFluidRuntime {
  private dirty = false;

  constructor(private readonly deps: WorldContainerFluidRuntimeDeps) {}

  paintImpact(kind: ThrowableContainer['kind'], gx: number, gy: number, quantity: number): void {
    const grid = this.deps.getCollisionGrid();
    const tile = getContainerFluidTile(kind);
    if (tile > 0 && quantity > 0) {
      this.paintFluidSplash(grid, gx, gy, tile, quantity);
      this.dirty = true;
    }

    this.dirty = applyContainerFluidImpactSideEffects(kind, gx, gy, {
      grid,
      tileMutator: this.deps.getTileMutator(),
      steamPuff: this.deps.getSteamPuff(),
      containers: this.deps.getContainers(),
      shakeCamera: (intensity) => this.deps.game.camera.shake(intensity),
    }) || this.dirty;
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.deps.getFluidSystem().refreshFromGrid(this.deps.getCollisionGrid());
    this.deps.rerenderTilemap();
  }

  applyContainerEffect(container: ThrowableContainer): void {
    const changed = applyContainerFluidContactEffects(container, {
      grid: this.deps.getCollisionGrid(),
      tileMutator: this.deps.getTileMutator(),
      steamPuff: this.deps.getSteamPuff(),
      enemies: this.deps.getEnemies(),
    });
    if (changed) this.dirty = true;
  }

  private paintFluidSplash(grid: number[][], sx: number, sy: number, tile: number, quantity: number): void {
    const painted = paintContainerFluidCells(grid, sx, sy, tile, quantity);

    if (tile === 6) {
      const tileMutator = this.deps.getTileMutator();
      for (const [px, py] of painted.cells) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          tileMutator.tryIgnite(grid, px + dx, py + dy);
        }
      }
    }
  }
}
