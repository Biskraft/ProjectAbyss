import { GoldPickup } from '@entities/GoldPickup';
import type { Enemy } from '@entities/Enemy';
import { createEmberShard, createForgeEmber, type HealingPickup } from '@entities/HealingPickup';
import { spawnGoldPickupBurst } from './GoldPickupSpawnHelpers';

export interface EnemyDropCoordinates {
  isGolden: boolean;
  dropX: number;
  dropY: number;
}

export function getEnemyBottomLeftDropCoordinates(enemy: Enemy<string>): { dropX: number; dropY: number } {
  return {
    dropX: enemy.x + enemy.width / 2 - 8,
    dropY: enemy.y + enemy.height,
  };
}

const GOLD_BASE_EXP = 40;
const BASE_GOLD_MULTIPLIER = 0.1;
const GOLD_ELITE_MULTIPLIER = 3;
const FORGE_EMBER_CHANCE = 0.5;
const SHARD_DROP_CHANCE = 0.2;

export interface GoldDropInput extends EnemyDropCoordinates {
  baseExp: number;
  collisionGrid: number[][];
}

export interface EnemyDropDependencies {
  addGoldPickup: (pickup: GoldPickup) => void;
}

type EnemyDropKind = 'gold' | 'healing';

interface SpawnEnemyDropsInput extends GoldDropInput {
  dropOrder: readonly EnemyDropKind[];
}

interface SpawnEnemyDropsDeps {
  rollDrop: () => number;
  getPlayerMaxHp: () => number;
  addHealingPickup: (pickup: HealingPickup) => void;
  addGoldPickup: (pickup: GoldPickup) => void;
}

export const spawnGoldDropForEnemy = (
  input: GoldDropInput,
  deps: EnemyDropDependencies,
): void => {
  const baseGold = Math.floor((input.baseExp > 0 ? input.baseExp : GOLD_BASE_EXP) * BASE_GOLD_MULTIPLIER);
  const goldAmount = input.isGolden ? baseGold * GOLD_ELITE_MULTIPLIER : baseGold;
  if (goldAmount <= 0) return;

  for (const pickup of spawnGoldPickupBurst({
    x: input.dropX,
    y: input.dropY,
    amount: goldAmount,
    collisionGrid: input.collisionGrid,
  })) {
    deps.addGoldPickup(pickup);
  }
};

export const spawnHealingDropForEnemy = (
  input: EnemyDropCoordinates,
  deps: {
    rollDrop: () => number;
    getPlayerMaxHp: () => number;
    addHealingPickup: (pickup: HealingPickup) => void;
  },
): void => {
  if (input.isGolden && deps.rollDrop() < FORGE_EMBER_CHANCE) {
    deps.addHealingPickup(createForgeEmber(input.dropX, input.dropY, deps.getPlayerMaxHp()));
    return;
  }

  if (!input.isGolden && deps.rollDrop() < SHARD_DROP_CHANCE) {
    deps.addHealingPickup(createEmberShard(input.dropX, input.dropY, deps.getPlayerMaxHp()));
  }
};

export const spawnEnemyDrops = (
  input: SpawnEnemyDropsInput,
  deps: SpawnEnemyDropsDeps,
): void => {
  for (const dropKind of input.dropOrder) {
    if (dropKind === 'gold') {
      spawnGoldDropForEnemy(input, {
        addGoldPickup: deps.addGoldPickup,
      });
      continue;
    }

    spawnHealingDropForEnemy(input, {
      rollDrop: deps.rollDrop,
      getPlayerMaxHp: deps.getPlayerMaxHp,
      addHealingPickup: deps.addHealingPickup,
    });
  }
};
