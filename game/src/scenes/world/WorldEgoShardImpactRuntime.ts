import { Debug } from '@core/Debug';
import { getTile, isIce, isWater, TILE_AIR } from '@core/Physics';
import type { Player } from '@entities/Player';
import type { FluidResidueManager } from '@effects/FluidResidue';
import type { FluidSystem } from '@effects/FluidSystem';
import type { ShardElement } from '@effects/EgoShard';
import { PUFF_TINT_PLASMA, PUFF_TINT_TOXIC, type SteamPuffManager } from '@effects/SteamPuff';
import { t } from '@i18n';
import type { TileMutator } from '@systems/TileMutator';
import type { Game } from '../../Game';

const TILE_SIZE = 16;

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

    const ax = Math.round(px / TILE_SIZE);
    const ay = Math.round(py / TILE_SIZE);
    const cells: Array<[number, number]> = [
      [ax - 1, ay - 1], [ax, ay - 1],
      [ax - 1, ay],     [ax, ay],
    ];

    if (element === 'fire') {
      this.handleFireImpact(px, py, room);
    } else if (element === 'ice') {
      this.handleIceImpact(room, cells);
    } else if (element === 'thunder') {
      this.handleThunderImpact(room, cells);
    }
  }

  debugIgniteAtPlayer(): void {
    const room = this.deps.getRoom();
    if (!room) return;

    const hitbox = this.getDebugAttackHitbox();
    let actions = 0;
    this.forEachCellInAABB(hitbox.ax, hitbox.ay, hitbox.aw, hitbox.ah, (gx, gy) => {
      const tile = getTile(room, gx, gy);
      if (isIce(tile)) {
        if (this.deps.getTileMutator().tryMeltIce(room, gx, gy)) actions++;
      } else if (isWater(tile)) {
        if (room[gy]) {
          room[gy][gx] = TILE_AIR;
          this.deps.getFluidSystem().removeCell(gx, gy);
          this.deps.getSteamPuff().spawn((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, 1.2);
          actions++;
        }
      } else if (this.deps.getTileMutator().tryIgnite(room, gx, gy)) {
        actions++;
      }
    });

    const residueIgnited = this.deps.getFluidResidue().ignite(hitbox.ax, hitbox.ay, hitbox.aw, hitbox.ah);
    actions += residueIgnited;
    Debug.log(
      `[DebugFire] hitbox=(${hitbox.ax},${hitbox.ay},${hitbox.aw},${hitbox.ah}) actions=${actions} burning=${this.deps.getTileMutator().burningCount} residueIgnited=${residueIgnited}`,
    );
    this.deps.showToast(t('toast.debug_fire', { count: actions }), 0xff8844);
  }

  debugFreezeAtPlayer(): void {
    const room = this.deps.getRoom();
    if (!room) return;

    const hitbox = this.getDebugAttackHitbox();
    let frozen = 0;
    this.forEachCellInAABB(hitbox.ax, hitbox.ay, hitbox.aw, hitbox.ah, (gx, gy) => {
      if (this.deps.getTileMutator().tryFreeze(room, gx, gy)) frozen++;
    });
    Debug.log(
      `[DebugIce] hitbox=(${hitbox.ax},${hitbox.ay},${hitbox.aw},${hitbox.ah}) frozen=${frozen} total=${this.deps.getTileMutator().frozenCount}`,
    );
    this.deps.showToast(t('toast.debug_ice', { count: frozen }), 0x88ccff);
  }

  debugThunderAtPlayer(): void {
    const room = this.deps.getRoom();
    if (!room) return;

    const hitbox = this.getDebugAttackHitbox();
    let totalLit = 0;
    this.forEachCellInAABB(hitbox.ax, hitbox.ay, hitbox.aw, hitbox.ah, (gx, gy) => {
      if (this.deps.getTileMutator().isElectric(gx, gy)) return;
      totalLit += this.deps.getTileMutator().applyThunderChain(room, gx, gy);
    });
    Debug.log(
      `[DebugThunder] hitbox=(${hitbox.ax},${hitbox.ay},${hitbox.aw},${hitbox.ah}) lit=${totalLit} electric=${this.deps.getTileMutator().electricCount}`,
    );
    this.deps.showToast(t('toast.debug_thunder', { count: totalLit }), 0xffee44);
  }

  private handleFireImpact(px: number, py: number, room: number[][]): void {
    const fireHitSize = 24;
    const fireHalf = fireHitSize / 2;
    const fireCells: Array<[number, number]> = [];
    this.forEachCellInAABB(px - fireHalf, py - fireHalf, fireHitSize, fireHitSize, (gx, gy) => {
      if (room[gy]?.[gx] === undefined) return;
      fireCells.push([gx, gy]);
    });

    const tileMutator = this.deps.getTileMutator();
    const fluidSystem = this.deps.getFluidSystem();
    const steamPuff = this.deps.getSteamPuff();

    for (const [gx, gy] of fireCells) {
      const tile = room[gy]?.[gx] ?? 0;
      if (tile === 7) {
        tileMutator.tryMeltIce(room, gx, gy);
      } else if (tile === 2 && room[gy]) {
        room[gy][gx] = 0;
        fluidSystem.removeCell(gx, gy);
        steamPuff.spawn((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, 1.2);
      } else if (tile === 13 && room[gy]) {
        room[gy][gx] = 0;
        fluidSystem.removeCell(gx, gy);
        steamPuff.spawn((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, 1.4, PUFF_TINT_TOXIC);
      } else if (tile === 6 && room[gy]) {
        this.growMagmaIntoAir(room, gx, gy);
        fluidSystem.refreshFromGrid(this.deps.getCollisionGrid());
      } else if (tile === 12) {
        tileMutator.tryIgniteOverlayOnly(gx, gy, 4000);
      } else {
        tileMutator.tryIgnite(room, gx, gy);
      }
    }

    this.deps.getFluidResidue().ignite(px - fireHalf, py - fireHalf, fireHitSize, fireHitSize);
    this.igniteGrassClumps(fireCells);
  }

  private handleIceImpact(room: number[][], cells: Array<[number, number]>): void {
    const tileMutator = this.deps.getTileMutator();
    for (const [gx, gy] of cells) {
      const tile = room[gy]?.[gx] ?? 0;
      if (tile === 12) tileMutator.tryFreezeMetal(room, gx, gy);
      else tileMutator.tryFreeze(room, gx, gy);
    }
  }

  private handleThunderImpact(room: number[][], cells: Array<[number, number]>): void {
    const tileMutator = this.deps.getTileMutator();
    const steamPuff = this.deps.getSteamPuff();
    for (const [gx, gy] of cells) {
      const tile = room[gy]?.[gx] ?? 0;
      if (tile === 6) {
        steamPuff.spawn((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, 2.0, PUFF_TINT_PLASMA);
        this.deps.game.camera.shake(4);
        tileMutator.applyThunderChain(room, gx, gy);
        continue;
      }
      if (tile === 7 && room[gy]) {
        room[gy][gx] = 0;
        tileMutator.clearFrozen(gx, gy);
        steamPuff.spawn((gx + 0.5) * TILE_SIZE, (gy + 0.5) * TILE_SIZE, 1.4);
        this.deps.game.camera.shake(2);
        continue;
      }
      if (tileMutator.isElectric(gx, gy)) continue;
      tileMutator.applyThunderChain(room, gx, gy);
    }
  }

  private growMagmaIntoAir(room: number[][], gx: number, gy: number): void {
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

  private igniteGrassClumps(cells: Array<[number, number]>): void {
    if (cells.length === 0) return;

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
    this.deps.igniteGrassInCellAABB(minGx, minGy, maxGx, maxGy);
  }

  private getDebugAttackHitbox(): { ax: number; ay: number; aw: number; ah: number } {
    const player = this.deps.getPlayer();
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

  private forEachCellInAABB(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    callback: (gx: number, gy: number) => void,
  ): void {
    const left = Math.floor(ax / TILE_SIZE);
    const right = Math.floor((ax + aw - 1) / TILE_SIZE);
    const top = Math.floor(ay / TILE_SIZE);
    const bottom = Math.floor((ay + ah - 1) / TILE_SIZE);
    for (let gy = top; gy <= bottom; gy++) {
      for (let gx = left; gx <= right; gx++) callback(gx, gy);
    }
  }
}
