import type { Game } from '../../Game';
import type { Enemy } from '@entities/Enemy';
import { ThrowableContainer } from '@entities/ThrowableContainer';
import type { FluidCellBounds, FluidSystem } from '@effects/FluidSystem';
import { SteamPuffManager, PUFF_TINT_TOXIC } from '@effects/SteamPuff';
import type { TileMutator } from '@systems/TileMutator';

interface ItemWorldContainerFluidRuntimeDeps {
  game: Game;
  getFullGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getFluidSystem: () => FluidSystem;
  getActiveTileBounds: () => FluidCellBounds;
  getContainers: () => ThrowableContainer[];
  getEnemies: () => Enemy<string>[];
  getSteamPuff: () => SteamPuffManager;
}

export class ItemWorldContainerFluidRuntime {
  private dirty = false;

  constructor(private readonly deps: ItemWorldContainerFluidRuntimeDeps) {}

  paintImpact(kind: ThrowableContainer['kind'], gx: number, gy: number, quantity: number): void {
    const grid = this.deps.getFullGrid();
    const tile = this.tileForContainer(kind);
    if (tile > 0 && quantity > 0) {
      this.paintFluidCells(grid, gx, gy, tile, quantity);
    }

    if (tile === 6) {
      this.igniteAroundMagmaPaint(grid, gx, gy, quantity);
    }
    if (kind === 'MagmaCrucible') {
      this.deps.getSteamPuff().spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 1.6);
    }
    if (kind === 'WaterBarrel') {
      this.solidifyImpactMagma(grid, gx, gy);
    }
    if (kind === 'AcidVial') {
      this.applyAcidContainerChain(gx, gy);
    }

    if (tile === 2 || tile === 6 || tile === 11 || tile === 13) {
      this.dirty = true;
    }
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.deps.getFluidSystem().refreshFromGrid(
      this.deps.getFullGrid(),
      this.deps.getActiveTileBounds(),
    );
  }

  applyContainerEffect(container: ThrowableContainer): void {
    if (
      container.kind === 'OilDrum' ||
      container.kind === 'WaterBarrel' ||
      container.kind === 'Crate' ||
      container.kind === 'MetalCrate'
    ) return;

    const grid = this.deps.getFullGrid();
    const left = Math.floor(container.colX / 16);
    const right = Math.floor((container.colX + container.colW - 1) / 16);
    const foot = Math.floor((container.colY + container.colH) / 16);
    let changed = false;
    let shocked = false;

    for (let gy = foot - 1; gy <= foot; gy++) {
      for (let gx = left; gx <= right; gx++) {
        const row = grid[gy];
        if (!row) continue;
        const tile = row[gx] ?? -1;
        if (!this.isFluidTile(tile)) continue;

        switch (container.kind) {
          case 'MagmaCrucible':
            this.igniteContainerContact(grid, gx, gy);
            break;
          case 'AcidVial':
            this.deps.getSteamPuff().spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 0.8, PUFF_TINT_TOXIC);
            break;
          case 'ChargedCrate':
          case 'ChargedCell':
            if (this.deps.getTileMutator().applyThunderChain(grid, gx, gy) === 0 && tile === 11) {
              this.deps.getTileMutator().onElectricInsulated?.(gx, gy);
            }
            shocked = true;
            break;
          case 'CyroCanister':
            changed = this.freezeConnectedFluidFrom(grid, gx, gy) || changed;
            break;
        }
      }
    }

    if (changed) this.dirty = true;
    if (changed && container.kind === 'CyroCanister') this.freezeEnemiesInFrozenCells(4000);
    void shocked;
  }

  private tileForContainer(kind: ThrowableContainer['kind']): number {
    switch (kind) {
      case 'OilDrum': return 11;
      case 'WaterBarrel': return 2;
      case 'MagmaCrucible': return 6;
      case 'AcidVial': return 13;
      case 'ChargedCrate':
      case 'ChargedCell':
        return 8;
      case 'CyroCanister': return 20;
      case 'Crate':
      case 'MetalCrate':
        return 0;
    }
  }

  private paintFluidCells(grid: number[][], gx: number, gy: number, tile: number, quantity: number): void {
    const width = grid[0]?.length ?? 0;
    if (!width) return;

    const key = (x: number, y: number) => y * width + x;
    const visited = new Set<number>();
    const queue: Array<[number, number]> = [[gx, gy]];
    visited.add(key(gx, gy));
    let painted = 0;

    while (queue.length > 0 && painted < quantity) {
      const [x, y] = queue.shift()!;
      const row = grid[y];
      if (!row) continue;
      const currentTile = row[x] ?? -1;
      if (currentTile === 0 || currentTile === 16 || this.isFluidTile(currentTile)) {
        row[x] = tile;
        painted++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          const nextKey = key(nx, ny);
          if (!visited.has(nextKey)) {
            visited.add(nextKey);
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  private igniteAroundMagmaPaint(grid: number[][], gx: number, gy: number, quantity: number): void {
    const radius = Math.max(2, Math.ceil(Math.sqrt(quantity)) + 1);
    const tileMutator = this.deps.getTileMutator();
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        tileMutator.tryIgnite(grid, gx + dx, gy + dy);
      }
    }
  }

  private solidifyImpactMagma(grid: number[][], gx: number, gy: number): void {
    let solidified = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (grid[ny]?.[nx] === 6) {
          grid[ny][nx] = 1;
          this.deps.getTileMutator().onWallTileChanged?.(nx, ny, 6);
          solidified++;
        }
      }
    }
    if (solidified <= 0) return;
    this.deps.getSteamPuff().spawn((gx + 0.5) * 16, (gy + 0.5) * 16, 2.0);
    this.deps.game.camera.shake(4);
    this.dirty = true;
  }

  private applyAcidContainerChain(gx: number, gy: number): void {
    const reachSq = 32 * 32;
    const cx = (gx + 0.5) * 16;
    const cy = (gy + 0.5) * 16;
    for (const other of this.deps.getContainers()) {
      if (other.destroyed) continue;
      const dx = (other.colX + other.colW / 2) - cx;
      const dy = (other.colY + other.colH / 2) - cy;
      if (dx * dx + dy * dy < reachSq) {
        other.acidExposureMs += 1000;
      }
    }
  }

  private igniteContainerContact(grid: number[][], gx: number, gy: number): void {
    const tileMutator = this.deps.getTileMutator();
    tileMutator.tryIgniteOverlayOnly(gx, gy, 1800);
    tileMutator.tryIgnite(grid, gx, gy);
    tileMutator.tryIgnite(grid, gx + 1, gy);
    tileMutator.tryIgnite(grid, gx - 1, gy);
    tileMutator.tryIgnite(grid, gx, gy + 1);
    tileMutator.tryIgnite(grid, gx, gy - 1);
  }

  private freezeConnectedFluidFrom(grid: number[][], sx: number, sy: number): boolean {
    const seed = grid[sy]?.[sx] ?? -1;
    if (!this.isFluidTile(seed)) return false;

    const width = grid[0]?.length ?? 0;
    if (!width) return false;
    const visited = new Set<number>();
    const queue: Array<[number, number]> = [[sx, sy]];
    const key = (gx: number, gy: number) => gy * width + gx;
    const tileMutator = this.deps.getTileMutator();
    let changed = false;

    while (queue.length) {
      const [gx, gy] = queue.shift()!;
      const cellKey = key(gx, gy);
      if (visited.has(cellKey)) continue;
      visited.add(cellKey);
      if ((grid[gy]?.[gx] ?? -1) !== seed) continue;
      changed = tileMutator.tryFreeze(grid, gx, gy) || changed;
      queue.push([gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]);
    }
    return changed;
  }

  private freezeEnemiesInFrozenCells(durationMs: number): void {
    const tileMutator = this.deps.getTileMutator();
    for (const enemy of this.deps.getEnemies()) {
      if (!enemy.alive || enemy.hp <= 0) continue;
      if (!tileMutator.aabbHasOverlay(enemy.x, enemy.y, enemy.width, enemy.height, 'frozen')) continue;
      enemy.frozenRemainingMs = Math.max(enemy.frozenRemainingMs ?? 0, durationMs);
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.showHpBarFlash();
    }
  }

  private isFluidTile(tile: number): boolean {
    return tile === 2 || tile === 6 || tile === 8 || tile === 11 || tile === 13 || tile === 20;
  }
}
