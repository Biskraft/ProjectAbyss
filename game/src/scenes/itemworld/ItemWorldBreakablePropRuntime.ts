import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { BreakableProp } from '@entities/BreakableProp';
import type { GoldPickup } from '@entities/GoldPickup';
import type { BreakableDestroySource } from '@scenes/shared/BreakableFeedbackHelpers';
import { applyBreakablePropBreakConsequences } from '@scenes/shared/BreakablePropDestructionHelpers';
import {
  addBreakablePropToRegistry,
  clearBreakableProps,
  updateBreakableProps,
} from '@scenes/shared/BreakablePropRegistryHelpers';
import type { Player } from '@entities/Player';
import type { HitSparkManager } from '@effects/HitSpark';
import type { PropShatterManager } from '@effects/PropShatter';
import { spawnBreakableProps } from '@systems/BreakablePropSpawner';
import type { TileMutator } from '@systems/TileMutator';
import { addCellExclusionRadius } from '@scenes/shared/CellExclusionHelpers';
import {
  IW_DOOR_FLOOR_ROW,
  IW_ROOM_H_TILES,
  IW_ROOM_W_TILES,
} from './ItemWorldMapController';

interface ItemWorldBreakablePropRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getRoomData: () => number[][];
  getEntityLayer: () => Container;
  getBreakableProps: () => BreakableProp[];
  addGoldPickup: (pickup: GoldPickup) => void;
  getPropShatter: () => PropShatterManager;
  getHitSparks: () => HitSparkManager;
  getTileMutator: () => TileMutator;
}

export class ItemWorldBreakablePropRuntime {
  constructor(private readonly deps: ItemWorldBreakablePropRuntimeDeps) {}

  update(dtMs: number): void {
    updateBreakableProps(this.deps.getBreakableProps(), dtMs);
  }

  resetAndSpawnProcedural(options: {
    currentStratumIndex: number;
    itemIdLength: number;
    currentCol: number;
    currentRow: number;
  }): void {
    const breakableProps = this.deps.getBreakableProps();
    clearBreakableProps(breakableProps);

    const seed = (options.currentStratumIndex + 1) * 0x1337 + options.itemIdLength * 7;
    const excludeCells = this.buildStartRoomExclusion(options.currentCol, options.currentRow);
    const spawned = spawnBreakableProps(this.deps.getRoomData(), seed, true, excludeCells);
    for (const prop of spawned) {
      addBreakablePropToRegistry(breakableProps, prop, this.deps.getEntityLayer());
      this.deps.getTileMutator().registerBurnable(prop);
    }
  }

  destroyWithEffects(prop: BreakableProp, source: BreakableDestroySource): void {
    const drop = prop.break();
    const player = this.deps.getPlayer();

    applyBreakablePropBreakConsequences({
      prop,
      drop,
      source,
      player,
      game: this.deps.game,
      propShatter: this.deps.getPropShatter(),
      hitSparks: this.deps.getHitSparks(),
      collisionGrid: this.deps.getRoomData(),
      addGoldPickup: this.deps.addGoldPickup,
    });

    prop.destroy();
  }

  private buildStartRoomExclusion(currentCol: number, currentRow: number): Set<string> {
    const exclude = new Set<string>();
    const radius = 8;
    const startCol = currentCol * IW_ROOM_W_TILES + Math.floor(IW_ROOM_W_TILES / 2);
    const startRow = currentRow * IW_ROOM_H_TILES + IW_DOOR_FLOOR_ROW;
    addCellExclusionRadius(exclude, startCol, startRow, radius);
    return exclude;
  }
}
