import type { Enemy } from '@entities/Enemy';
import { ThrowableContainer } from '@entities/ThrowableContainer';
import { PUFF_TINT_TOXIC, type SteamPuffManager } from '@effects/SteamPuff';
import type { TileMutator } from '@systems/TileMutator';
import { isContainerFluidTile } from './ContainerTileRules';
import { getDistanceSquared } from './DistanceHelpers';

const TILE_SIZE = 16;

interface ContainerFluidContactDeps {
  grid: number[][];
  tileMutator: TileMutator;
  steamPuff: SteamPuffManager;
  enemies: readonly Enemy<string>[];
}

interface ContainerFluidImpactSideEffectDeps {
  grid: number[][];
  tileMutator: TileMutator;
  steamPuff: SteamPuffManager;
  containers: readonly ThrowableContainer[];
  shakeCamera: (intensity: number) => void;
}

export function getContainerFluidTile(kind: ThrowableContainer['kind']): number {
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

export interface PaintContainerFluidCellsResult {
  count: number;
  cells: Array<[number, number]>;
}

export function paintContainerFluidCells(
  grid: number[][],
  sx: number,
  sy: number,
  tile: number,
  quantity: number,
): PaintContainerFluidCellsResult {
  if (quantity <= 0) return { count: 0, cells: [] };
  const width = grid[0]?.length ?? 0;
  if (!width) return { count: 0, cells: [] };

  const key = (x: number, y: number) => y * width + x;
  const visited = new Set<number>();
  const queue: Array<[number, number]> = [[sx, sy]];
  const cells: Array<[number, number]> = [];
  visited.add(key(sx, sy));

  while (queue.length > 0 && cells.length < quantity) {
    const [x, y] = queue.shift()!;
    const row = grid[y];
    if (!row) continue;
    const currentTile = row[x] ?? -1;
    if (currentTile === 0 || currentTile === 16 || isContainerFluidTile(currentTile)) {
      row[x] = tile;
      cells.push([x, y]);
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

  return { count: cells.length, cells };
}

export function applyContainerFluidImpactSideEffects(
  kind: ThrowableContainer['kind'],
  gx: number,
  gy: number,
  deps: ContainerFluidImpactSideEffectDeps,
): boolean {
  if (kind === 'MagmaCrucible') {
    deps.steamPuff.spawn((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, 1.6);
  }

  if (kind === 'AcidVial') {
    applyAcidExposureToNearbyContainers(deps.containers, gx, gy);
  }

  if (kind !== 'WaterBarrel') return false;
  const solidified = solidifyImpactMagma(deps.grid, gx, gy, deps.tileMutator);
  if (solidified <= 0) return false;
  deps.steamPuff.spawn((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, 2.0);
  deps.shakeCamera(4);
  return true;
}

export function applyContainerFluidContactEffects(
  container: ThrowableContainer,
  deps: ContainerFluidContactDeps,
): boolean {
  if (
    container.kind === 'OilDrum' ||
    container.kind === 'WaterBarrel' ||
    container.kind === 'Crate' ||
    container.kind === 'MetalCrate'
  ) return false;

  const { grid, tileMutator, steamPuff, enemies } = deps;
  const left = Math.floor(container.colX / TILE_SIZE);
  const right = Math.floor((container.colX + container.colW - 1) / TILE_SIZE);
  const foot = Math.floor((container.colY + container.colH) / TILE_SIZE);
  let changed = false;

  for (let gy = foot - 1; gy <= foot; gy++) {
    for (let gx = left; gx <= right; gx++) {
      const row = grid[gy];
      if (!row) continue;
      const tile = row[gx] ?? -1;
      if (!isContainerFluidTile(tile)) continue;

      switch (container.kind) {
        case 'MagmaCrucible':
          igniteContainerFluidContact(grid, gx, gy, tileMutator);
          break;
        case 'AcidVial':
          steamPuff.spawn((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, 0.8, PUFF_TINT_TOXIC);
          break;
        case 'ChargedCrate':
        case 'ChargedCell':
          if (tileMutator.applyThunderChain(grid, gx, gy) === 0 && tile === 11) {
            tileMutator.onElectricInsulated?.(gx, gy);
          }
          break;
        case 'CyroCanister':
          changed = freezeConnectedContainerFluidFrom(grid, gx, gy, tileMutator) || changed;
          break;
      }
    }
  }

  if (changed && container.kind === 'CyroCanister') {
    freezeEnemiesInFrozenCells(enemies, tileMutator, 4000);
  }
  return changed;
}

export function solidifyImpactMagma(
  grid: number[][],
  gx: number,
  gy: number,
  tileMutator: TileMutator,
): number {
  let solidified = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (grid[ny]?.[nx] === 6) {
        grid[ny][nx] = 1;
        tileMutator.onWallTileChanged?.(nx, ny, 6);
        solidified++;
      }
    }
  }
  return solidified;
}

export function applyAcidExposureToNearbyContainers(
  containers: readonly ThrowableContainer[],
  gx: number,
  gy: number,
): void {
  const reachSq = 32 * 32;
  const cx = (gx + 0.5) * TILE_SIZE;
  const cy = (gy + 0.5) * TILE_SIZE;
  for (const other of containers) {
    if (other.destroyed) continue;
    if (getDistanceSquared(other.colX + other.colW / 2, other.colY + other.colH / 2, cx, cy) < reachSq) {
      other.acidExposureMs += 1000;
    }
  }
}

export function freezeConnectedContainerFluidFrom(
  grid: number[][],
  sx: number,
  sy: number,
  tileMutator: TileMutator,
): boolean {
  const seed = grid[sy]?.[sx] ?? -1;
  if (!isContainerFluidTile(seed)) return false;

  const width = grid[0]?.length ?? 0;
  if (!width) return false;
  const visited = new Set<number>();
  const queue: Array<[number, number]> = [[sx, sy]];
  const key = (gx: number, gy: number) => gy * width + gx;
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

function igniteContainerFluidContact(
  grid: number[][],
  gx: number,
  gy: number,
  tileMutator: TileMutator,
): void {
  tileMutator.tryIgniteOverlayOnly(gx, gy, 1800);
  tileMutator.tryIgnite(grid, gx, gy);
  tileMutator.tryIgnite(grid, gx + 1, gy);
  tileMutator.tryIgnite(grid, gx - 1, gy);
  tileMutator.tryIgnite(grid, gx, gy + 1);
  tileMutator.tryIgnite(grid, gx, gy - 1);
}

function freezeEnemiesInFrozenCells(
  enemies: readonly Enemy<string>[],
  tileMutator: TileMutator,
  durationMs: number,
): void {
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.hp <= 0) continue;
    if (!tileMutator.aabbHasOverlay(enemy.x, enemy.y, enemy.width, enemy.height, 'frozen')) continue;
    enemy.frozenRemainingMs = Math.max(enemy.frozenRemainingMs ?? 0, durationMs);
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.showHpBarFlash();
  }
}
