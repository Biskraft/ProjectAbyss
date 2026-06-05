import { GoldPickup } from '@entities/GoldPickup';

export interface GoldPickupBurstInput {
  x: number;
  y: number;
  amount: number;
  collisionGrid: number[][];
}

export function bindGoldPickupCollisionGrid(pickup: GoldPickup, collisionGrid: number[][]): void {
  pickup.enableTerrainPhysics(collisionGrid);
}

export function spawnGoldPickupBurst(input: GoldPickupBurstInput): GoldPickup[] {
  const pickups = GoldPickup.spawnBurst(input.x, input.y, input.amount);
  for (const pickup of pickups) {
    bindGoldPickupCollisionGrid(pickup, input.collisionGrid);
  }
  return pickups;
}
