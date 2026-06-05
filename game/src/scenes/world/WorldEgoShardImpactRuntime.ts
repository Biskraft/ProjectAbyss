import { Debug } from '@core/Debug';
import type { Player } from '@entities/Player';
import type { FluidResidueManager } from '@effects/FluidResidue';
import type { FluidSystem } from '@effects/FluidSystem';
import type { ShardElement } from '@effects/EgoShard';
import { PUFF_TINT_PLASMA, PUFF_TINT_TOXIC, type SteamPuffManager } from '@effects/SteamPuff';
import { t } from '@i18n';
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

interface WorldEgoShardImpactRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getRoom: () => number[][] | null;
  getCollisionGrid: () => number[][];
  getTileMutator: () => TileMutator;
  getFluidSystem: () => FluidSystem;
  getFluidResidue: () => FluidResidueManager;
  getSteamPuff: () => SteamPuffManager;
  igniteGrassInCellAABB: (minGx: number, minGy: number, maxGx: number, maxGy: number) => number;
  showToast: (message: string, color: number) => void;
}

export class WorldEgoShardImpactRuntime {
  constructor(private readonly deps: WorldEgoShardImpactRuntimeDeps) {}

  handleImpact(px: number, py: number, element: ShardElement): void {
    const room = this.deps.getRoom();
    if (!room) return;

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
    const room = this.deps.getRoom();
    if (!room) return;

    const { hitbox, actions, burningCount, residueIgnited } = applyEgoShardDebugIgniteAtPlayer(
      room,
      this.deps.getPlayer(),
      this.deps.getTileMutator(),
      this.deps.getFluidSystem(),
      this.deps.getSteamPuff(),
      this.deps.getFluidResidue(),
    );
    Debug.log(
      `[DebugFire] hitbox=(${hitbox.ax},${hitbox.ay},${hitbox.aw},${hitbox.ah}) actions=${actions} burning=${burningCount} residueIgnited=${residueIgnited}`,
    );
    this.deps.showToast(t('toast.debug_fire', { count: actions }), 0xff8844);
  }

  debugFreezeAtPlayer(): void {
    const room = this.deps.getRoom();
    if (!room) return;

    const { hitbox, frozen, totalFrozen } = applyEgoShardDebugFreezeAtPlayer(
      room,
      this.deps.getPlayer(),
      this.deps.getTileMutator(),
    );
    Debug.log(
      `[DebugIce] hitbox=(${hitbox.ax},${hitbox.ay},${hitbox.aw},${hitbox.ah}) frozen=${frozen} total=${totalFrozen}`,
    );
    this.deps.showToast(t('toast.debug_ice', { count: frozen }), 0x88ccff);
  }

  debugThunderAtPlayer(): void {
    const room = this.deps.getRoom();
    if (!room) return;

    const { hitbox, totalLit, totalElectric } = applyEgoShardDebugThunderAtPlayer(
      room,
      this.deps.getPlayer(),
      this.deps.getTileMutator(),
    );
    Debug.log(
      `[DebugThunder] hitbox=(${hitbox.ax},${hitbox.ay},${hitbox.aw},${hitbox.ah}) lit=${totalLit} electric=${totalElectric}`,
    );
    this.deps.showToast(t('toast.debug_thunder', { count: totalLit }), 0xffee44);
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
        fluidSystem.refreshFromGrid(this.deps.getCollisionGrid());
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
      if (tileMutator.isElectric(gx, gy)) continue;
      tileMutator.applyThunderChain(room, gx, gy);
    }
  }

  private igniteGrassClumps(cells: Array<[number, number]>): void {
    const bounds = getCellBounds(cells);
    if (!bounds) return;
    this.deps.igniteGrassInCellAABB(bounds.minGx, bounds.minGy, bounds.maxGx, bounds.maxGy);
  }
}
