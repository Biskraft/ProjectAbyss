import type { GoldPickup } from '@entities/GoldPickup';
import type { Player } from '@entities/Player';
import { spawnGoldPickupBurst } from './GoldPickupSpawnHelpers';

interface BreakableDropCarrier {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BreakableDrop {
  type: string;
  amount?: number;
}

interface ApplyBreakableDropInput {
  prop: BreakableDropCarrier;
  drop: BreakableDrop;
  player: Player;
  collisionGrid: number[][];
  addGoldPickup: (pickup: GoldPickup) => void;
}

export function applyBreakableDrop(input: ApplyBreakableDropInput): void {
  const { prop, drop, player } = input;
  if (drop.type === 'gold' && (drop.amount ?? 0) > 0) {
    const burstX = prop.x + prop.width / 2 - 8;
    const burstY = prop.y + prop.height;
    for (const pickup of spawnGoldPickupBurst({
      x: burstX,
      y: burstY,
      amount: drop.amount ?? 0,
      collisionGrid: input.collisionGrid,
    })) {
      input.addGoldPickup(pickup);
    }
  } else if (drop.type === 'flask') {
    player.flaskCharges = Math.min(player.flaskCharges + 1, player.flaskMaxCharges);
  }
}
