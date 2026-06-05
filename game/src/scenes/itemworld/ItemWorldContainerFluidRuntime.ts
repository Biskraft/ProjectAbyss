import type { Game } from '../../Game';
import type { Enemy } from '@entities/Enemy';
import { ThrowableContainer } from '@entities/ThrowableContainer';
import type { FluidCellBounds, FluidSystem } from '@effects/FluidSystem';
import { SteamPuffManager } from '@effects/SteamPuff';
import type { TileMutator } from '@systems/TileMutator';
import {
  applyContainerFluidImpactSideEffects,
  applyContainerFluidContactEffects,
  getContainerFluidTile,
  paintContainerFluidCells,
} from '@scenes/shared/ContainerFluidHelpers';

interface ItemWorldContainerFluidRuntimeDeps {
  game: Game;
  getCollisionGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getFluidSystem: () => FluidSystem;
  getActiveTileBounds: () => FluidCellBounds;
  getContainers: () => readonly ThrowableContainer[];
  getEnemies: () => readonly Enemy<string>[];
  getSteamPuff: () => SteamPuffManager;
}

export class ItemWorldContainerFluidRuntime {
  private dirty = false;

  constructor(private readonly deps: ItemWorldContainerFluidRuntimeDeps) {}

  paintImpact(kind: ThrowableContainer['kind'], gx: number, gy: number, quantity: number): void {
    const grid = this.deps.getCollisionGrid();
    const tile = getContainerFluidTile(kind);
    if (tile > 0 && quantity > 0) {
      paintContainerFluidCells(grid, gx, gy, tile, quantity);
    }

    if (tile === 6) {
      this.igniteAroundMagmaPaint(grid, gx, gy, quantity);
    }
    this.dirty = applyContainerFluidImpactSideEffects(kind, gx, gy, {
      grid,
      tileMutator: this.deps.getTileMutator(),
      steamPuff: this.deps.getSteamPuff(),
      containers: this.deps.getContainers(),
      shakeCamera: (intensity) => this.deps.game.camera.shake(intensity),
    }) || this.dirty;

    if (tile === 2 || tile === 6 || tile === 11 || tile === 13) {
      this.dirty = true;
    }
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.deps.getFluidSystem().refreshFromGrid(
      this.deps.getCollisionGrid(),
      this.deps.getActiveTileBounds(),
    );
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

  private igniteAroundMagmaPaint(grid: number[][], gx: number, gy: number, quantity: number): void {
    const radius = Math.max(2, Math.ceil(Math.sqrt(quantity)) + 1);
    const tileMutator = this.deps.getTileMutator();
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        tileMutator.tryIgnite(grid, nx, ny);
      }
    }
  }

}
