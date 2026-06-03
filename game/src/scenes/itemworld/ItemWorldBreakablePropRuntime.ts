import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { SFX } from '@audio/Sfx';
import { BreakableProp } from '@entities/BreakableProp';
import { GoldPickup } from '@entities/GoldPickup';
import type { Player } from '@entities/Player';
import type { HitSparkManager } from '@effects/HitSpark';
import type { PropShatterManager } from '@effects/PropShatter';
import { spawnBreakableProps } from '@systems/BreakablePropSpawner';
import type { TileMutator } from '@systems/TileMutator';
import {
  IW_DOOR_FLOOR_ROW,
  IW_ROOM_H_TILES,
  IW_ROOM_W_TILES,
} from './ItemWorldMapController';

export type ItemWorldBreakablePropDestroySource = 'sword' | 'fire';

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

  resetAndSpawnProcedural(options: {
    currentStratumIndex: number;
    itemIdLength: number;
    currentCol: number;
    currentRow: number;
  }): void {
    const breakableProps = this.deps.getBreakableProps();
    for (const prop of breakableProps) prop.destroy();
    breakableProps.length = 0;

    const seed = (options.currentStratumIndex + 1) * 0x1337 + options.itemIdLength * 7;
    const excludeCells = this.buildStartRoomExclusion(options.currentCol, options.currentRow);
    const spawned = spawnBreakableProps(this.deps.getRoomData(), seed, true, excludeCells);
    for (const prop of spawned) {
      breakableProps.push(prop);
      this.deps.getEntityLayer().addChild(prop.container);
      this.deps.getTileMutator().registerBurnable(prop);
    }
  }

  destroyWithEffects(prop: BreakableProp, source: ItemWorldBreakablePropDestroySource): void {
    const drop = prop.break();
    const player = this.deps.getPlayer();

    if (source === 'sword') {
      this.deps.game.hitstopFrames += 4;
      this.deps.game.camera.shake(4);
    }

    this.deps.getPropShatter().spawn(
      prop.x,
      prop.y,
      prop.width,
      prop.height,
      prop.getParticleColor(),
      prop.getAccentColor(),
      prop.getArtifactTexture(),
    );
    SFX.play('breakable_destroy', 0, { speed: 1 / (1 + Math.random() * 0.5) });

    if (source === 'sword') {
      this.deps.getHitSparks().spawn(
        prop.x + prop.width / 2,
        prop.y + prop.height / 2,
        false,
        player.facingRight ? 1 : -1,
      );
    }

    if (drop.type === 'gold' && drop.amount > 0) {
      this.spawnGoldBurst(prop, drop.amount);
    } else if (drop.type === 'flask') {
      player.flaskCharges = Math.min(player.flaskCharges + 1, player.flaskMaxCharges);
    }

    prop.destroy();
  }

  private spawnGoldBurst(prop: BreakableProp, amount: number): void {
    const burstX = prop.x + prop.width / 2 - 8;
    const burstY = prop.y + prop.height;
    for (const pickup of GoldPickup.spawnBurst(burstX, burstY, amount)) {
      pickup.roomData = this.deps.getRoomData();
      this.deps.addGoldPickup(pickup);
    }
  }

  private buildStartRoomExclusion(currentCol: number, currentRow: number): Set<string> {
    const exclude = new Set<string>();
    const radius = 8;
    const startCol = currentCol * IW_ROOM_W_TILES + Math.floor(IW_ROOM_W_TILES / 2);
    const startRow = currentRow * IW_ROOM_H_TILES + IW_DOOR_FLOOR_ROW;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        exclude.add(`${startCol + dc},${startRow + dr}`);
      }
    }
    return exclude;
  }
}
