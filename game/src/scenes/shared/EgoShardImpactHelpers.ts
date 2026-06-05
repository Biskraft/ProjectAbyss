import type { Player } from '@entities/Player';
import { getTile, isIce, isWater, TILE_AIR } from '@core/Physics';
import type { FluidResidueManager } from '@effects/FluidResidue';
import type { FluidSystem } from '@effects/FluidSystem';
import type { SteamPuffManager } from '@effects/SteamPuff';
import type { TileMutator } from '@systems/TileMutator';

export const EGO_SHARD_IMPACT_TILE_SIZE = 16;

export interface CellAabb {
  ax: number;
  ay: number;
  aw: number;
  ah: number;
}

export function getEgoShardImpactCells(px: number, py: number): Array<[number, number]> {
  const ax = Math.round(px / EGO_SHARD_IMPACT_TILE_SIZE);
  const ay = Math.round(py / EGO_SHARD_IMPACT_TILE_SIZE);
  return [
    [ax - 1, ay - 1], [ax, ay - 1],
    [ax - 1, ay],     [ax, ay],
  ];
}

export interface EgoShardFireImpactFootprint {
  hitSize: number;
  hitHalf: number;
  cells: Array<[number, number]>;
}

export function getEgoShardFireImpactFootprint(
  px: number,
  py: number,
  room: number[][],
): EgoShardFireImpactFootprint {
  const hitSize = 24;
  const hitHalf = hitSize / 2;
  const cells: Array<[number, number]> = [];
  forEachEgoShardCellInAABB(px - hitHalf, py - hitHalf, hitSize, hitSize, (gx, gy) => {
    if (room[gy]?.[gx] === undefined) return;
    cells.push([gx, gy]);
  });
  return { hitSize, hitHalf, cells };
}

export function getEgoShardDebugAttackHitbox(player: Player): CellAabb {
  const reach = 24;
  const expand = 8;
  const ax = player.facingRight
    ? player.x - expand
    : player.x - expand - reach;
  return {
    ax,
    ay: player.y - expand,
    aw: player.width + expand * 2 + reach,
    ah: player.height + expand * 2 + 8,
  };
}

export function applyEgoShardDebugIgniteAtPlayer(
  room: number[][],
  player: Player,
  tileMutator: TileMutator,
  fluidSystem: FluidSystem,
  steamPuff: SteamPuffManager,
  fluidResidue: FluidResidueManager,
): { hitbox: CellAabb; actions: number; burningCount: number; residueIgnited: number } {
  const hitbox = getEgoShardDebugAttackHitbox(player);
  let actions = 0;
  forEachEgoShardCellInAABB(hitbox.ax, hitbox.ay, hitbox.aw, hitbox.ah, (gx, gy) => {
    const tile = getTile(room, gx, gy);
    if (isIce(tile)) {
      if (tileMutator.tryMeltIce(room, gx, gy)) actions++;
    } else if (isWater(tile)) {
      if (room[gy]) {
        room[gy][gx] = TILE_AIR;
        fluidSystem.removeCell(gx, gy);
        steamPuff.spawn((gx + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, (gy + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, 1.2);
        actions++;
      }
    } else if (tileMutator.tryIgnite(room, gx, gy)) {
      actions++;
    }
  });

  const residueIgnited = fluidResidue.ignite(hitbox.ax, hitbox.ay, hitbox.aw, hitbox.ah);
  actions += residueIgnited;
  return { hitbox, actions, burningCount: tileMutator.burningCount, residueIgnited };
}

export function applyEgoShardDebugFreezeAtPlayer(
  room: number[][],
  player: Player,
  tileMutator: TileMutator,
): { hitbox: CellAabb; frozen: number; totalFrozen: number } {
  const hitbox = getEgoShardDebugAttackHitbox(player);
  let frozen = 0;
  forEachEgoShardCellInAABB(hitbox.ax, hitbox.ay, hitbox.aw, hitbox.ah, (gx, gy) => {
    if (tileMutator.tryFreeze(room, gx, gy)) frozen++;
  });
  return { hitbox, frozen, totalFrozen: tileMutator.frozenCount };
}

export function applyEgoShardDebugThunderAtPlayer(
  room: number[][],
  player: Player,
  tileMutator: TileMutator,
): { hitbox: CellAabb; totalLit: number; totalElectric: number } {
  const hitbox = getEgoShardDebugAttackHitbox(player);
  let totalLit = 0;
  forEachEgoShardCellInAABB(hitbox.ax, hitbox.ay, hitbox.aw, hitbox.ah, (gx, gy) => {
    if (tileMutator.isElectric(gx, gy)) return;
    totalLit += tileMutator.applyThunderChain(room, gx, gy);
  });
  return { hitbox, totalLit, totalElectric: tileMutator.electricCount };
}

export function applyEgoShardIceImpact(
  room: number[][],
  cells: Array<[number, number]>,
  tileMutator: TileMutator,
): void {
  for (const [gx, gy] of cells) {
    const tile = room[gy]?.[gx] ?? 0;
    if (tile === 12) tileMutator.tryFreezeMetal(room, gx, gy);
    else tileMutator.tryFreeze(room, gx, gy);
  }
}

export function forEachEgoShardCellInAABB(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  callback: (gx: number, gy: number) => void,
): void {
  const left = Math.floor(ax / EGO_SHARD_IMPACT_TILE_SIZE);
  const right = Math.floor((ax + aw - 1) / EGO_SHARD_IMPACT_TILE_SIZE);
  const top = Math.floor(ay / EGO_SHARD_IMPACT_TILE_SIZE);
  const bottom = Math.floor((ay + ah - 1) / EGO_SHARD_IMPACT_TILE_SIZE);
  for (let gy = top; gy <= bottom; gy++) {
    for (let gx = left; gx <= right; gx++) callback(gx, gy);
  }
}

export function growMagmaIntoAdjacentAir(room: number[][], gx: number, gy: number): void {
  const neighbors: Array<[number, number]> = [
    [gx + 1, gy], [gx - 1, gy],
    [gx, gy + 1], [gx, gy - 1],
  ];
  for (const [nx, ny] of neighbors) {
    if ((room[ny]?.[nx] ?? -1) === 0 && Math.random() < 0.40) {
      room[ny][nx] = 6;
    }
  }
}

export function getCellBounds(cells: Array<[number, number]>): {
  minGx: number;
  minGy: number;
  maxGx: number;
  maxGy: number;
} | null {
  if (cells.length === 0) return null;

  let minGx = cells[0][0];
  let maxGx = cells[0][0];
  let minGy = cells[0][1];
  let maxGy = cells[0][1];
  for (const [gx, gy] of cells) {
    minGx = Math.min(minGx, gx);
    maxGx = Math.max(maxGx, gx);
    minGy = Math.min(minGy, gy);
    maxGy = Math.max(maxGy, gy);
  }
  return { minGx, minGy, maxGx, maxGy };
}
