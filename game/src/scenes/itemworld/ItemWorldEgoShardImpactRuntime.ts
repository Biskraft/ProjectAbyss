import { Debug } from '@core/Debug';
import type { Player } from '@entities/Player';
import type { FluidCellBounds, FluidSystem } from '@effects/FluidSystem';
import type { FluidResidueManager } from '@effects/FluidResidue';
import type { GrassClumpFireSystem } from '@effects/GrassClumpFire';
import { PUFF_TINT_PLASMA, PUFF_TINT_TOXIC, type SteamPuffManager } from '@effects/SteamPuff';
import type { ShardElement } from '@effects/EgoShard';
import {
  EGO_SHARD_IMPACT_TILE_SIZE,
  applyEgoShardDebugIgniteAtPlayer,
  applyEgoShardDebugFreezeAtPlayer,
  applyEgoShardDebugThunderAtPlayer,
  applyEgoShardIceImpact,
  forEachEgoShardCellInAABB,
  getCellBounds,
  getEgoShardDebugAttackHitbox,
  getEgoShardFireImpactFootprint,
  getEgoShardImpactCells,
  growMagmaIntoAdjacentAir,
} from '@scenes/shared/EgoShardImpactHelpers';
import type { TileMutator } from '@systems/TileMutator';
import type { Game } from '../../Game';

interface ItemWorldEgoShardImpactRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getFluidSystem: () => FluidSystem;
  getActiveTileBounds: () => FluidCellBounds;
  getSteamPuff: () => SteamPuffManager;
  getFluidResidue: () => FluidResidueManager;
  getGrassClumpFire: () => GrassClumpFireSystem;
}

export class ItemWorldEgoShardImpactRuntime {
  constructor(private readonly deps: ItemWorldEgoShardImpactRuntimeDeps) {}

  handleImpact(px: number, py: number, element: ShardElement): void {
    const room = this.deps.getCollisionGrid();
    if (!room?.length) return;

    const cells = getEgoShardImpactCells(px, py);

    if (element === 'fire') {
      this.handleFireImpact(px, py, room);
    } else if (element === 'ice') {
      applyEgoShardIceImpact(room, cells, this.deps.getTileMutator());
    } else if (element === 'thunder') {
      this.handleThunderImpact(room, cells);
    }
  }

  debugIgniteAtPlayer(): void {
    const room = this.deps.getCollisionGrid();
    if (!room?.length) return;

    const { actions, burningCount, residueIgnited } = applyEgoShardDebugIgniteAtPlayer(
      room,
      this.deps.getPlayer(),
      this.deps.getTileMutator(),
      this.deps.getFluidSystem(),
      this.deps.getSteamPuff(),
      this.deps.getFluidResidue(),
    );
    Debug.log(`[DebugFire] actions=${actions} burning=${burningCount} residueIgnited=${residueIgnited}`);
  }

  debugFreezeAtPlayer(): void {
    const room = this.deps.getCollisionGrid();
    if (!room?.length) return;

    const { frozen, totalFrozen } = applyEgoShardDebugFreezeAtPlayer(
      room,
      this.deps.getPlayer(),
      this.deps.getTileMutator(),
    );
    Debug.log(`[DebugIce] frozen=${frozen} total=${totalFrozen}`);
  }

  debugThunderAtPlayer(): void {
    const room = this.deps.getCollisionGrid();
    if (!room?.length) return;

    const { totalLit, totalElectric } = applyEgoShardDebugThunderAtPlayer(
      room,
      this.deps.getPlayer(),
      this.deps.getTileMutator(),
    );
    Debug.log(`[DebugThunder] lit=${totalLit} electric=${totalElectric}`);
  }

  private handleFireImpact(px: number, py: number, room: number[][]): void {
    const fireFootprint = getEgoShardFireImpactFootprint(px, py, room);

    const tileMutator = this.deps.getTileMutator();
    const fluidSystem = this.deps.getFluidSystem();
    const steamPuff = this.deps.getSteamPuff();

    for (const [gx, gy] of fireFootprint.cells) {
      const tile = room[gy]?.[gx] ?? 0;
      if (tile === 7) {
        tileMutator.tryMeltIce(room, gx, gy);
      } else if (tile === 2 && room[gy]) {
        room[gy][gx] = 0;
        fluidSystem.removeCell(gx, gy);
        steamPuff.spawn((gx + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, (gy + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, 1.2);
      } else if (tile === 13 && room[gy]) {
        room[gy][gx] = 0;
        fluidSystem.removeCell(gx, gy);
        steamPuff.spawn((gx + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, (gy + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, 1.4, PUFF_TINT_TOXIC);
      } else if (tile === 6 && room[gy]) {
        growMagmaIntoAdjacentAir(room, gx, gy);
        fluidSystem.refreshFromGrid(room, this.deps.getActiveTileBounds());
      } else if (tile === 12) {
        tileMutator.tryIgniteOverlayOnly(gx, gy, 4000);
      } else {
        tileMutator.tryIgnite(room, gx, gy);
      }
    }

    this.deps.getFluidResidue().ignite(
      px - fireFootprint.hitHalf,
      py - fireFootprint.hitHalf,
      fireFootprint.hitSize,
      fireFootprint.hitSize,
    );
    this.igniteGrassClumps(fireFootprint.cells);
  }

  private handleThunderImpact(room: number[][], cells: Array<[number, number]>): void {
    const tileMutator = this.deps.getTileMutator();
    const steamPuff = this.deps.getSteamPuff();
    for (const [gx, gy] of cells) {
      const tile = room[gy]?.[gx] ?? 0;
      if (tile === 6) {
        steamPuff.spawn((gx + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, (gy + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, 2.0, PUFF_TINT_PLASMA);
        this.deps.game.camera.shake(4);
        tileMutator.applyThunderChain(room, gx, gy);
        continue;
      }
      if (tile === 7 && room[gy]) {
        room[gy][gx] = 0;
        tileMutator.clearFrozen(gx, gy);
        steamPuff.spawn((gx + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, (gy + 0.5) * EGO_SHARD_IMPACT_TILE_SIZE, 1.4);
        this.deps.game.camera.shake(2);
        continue;
      }
      if (tile === 15 || tile === 16) {
        tileMutator.giveElectricOverlay(gx, gy, 1500);
        continue;
      }
      if (tileMutator.isElectric(gx, gy)) continue;
      tileMutator.applyThunderChain(room, gx, gy);
    }
  }

  private igniteGrassClumps(cells: Array<[number, number]>): void {
    const bounds = getCellBounds(cells);
    if (!bounds) return;
    this.deps.getGrassClumpFire().igniteInCellAABB(bounds.minGx, bounds.minGy, bounds.maxGx, bounds.maxGy);
  }
}
