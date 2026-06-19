import { SWORD_DEFS, STARTER_ONLY_IDS, TEST_ONLY_IDS, type Rarity } from '@data/weapons';
import { createItem, type ItemInstance } from './ItemInstance';

/** Weapon defs eligible for random/reward drops (no starter/story, no dev test weapons). */
function isDroppable(id: string): boolean {
  return !STARTER_ONLY_IDS.has(id) && !TEST_ONLY_IDS.has(id);
}

export function createDungeonRewardItemByRarity(rarity: Rarity): ItemInstance {
  const def = SWORD_DEFS.find((weapon) => weapon.rarity === rarity && isDroppable(weapon.id))
    ?? SWORD_DEFS.find((weapon) => isDroppable(weapon.id))
    ?? SWORD_DEFS[0];
  return createItem(def, rarity);
}

export function createGoldenRewardItemByRarity(rarity: Rarity): ItemInstance {
  const def = SWORD_DEFS.find((weapon) => weapon.rarity === rarity && isDroppable(weapon.id))
    ?? SWORD_DEFS.find((weapon) => weapon.rarity === 'rare' && isDroppable(weapon.id))
    ?? SWORD_DEFS[2];
  return createItem(def, rarity);
}

export function createRandomRareOrBetterRewardItem(random: () => number = Math.random): ItemInstance {
  const pool = SWORD_DEFS.filter((weapon) => weapon.rarity !== 'normal' && isDroppable(weapon.id));
  const def = pool[Math.floor(random() * pool.length)] ?? SWORD_DEFS[0];
  return createItem(def, def.rarity);
}
