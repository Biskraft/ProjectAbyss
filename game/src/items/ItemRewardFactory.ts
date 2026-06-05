import { SWORD_DEFS, STARTER_ONLY_IDS, type Rarity } from '@data/weapons';
import { createItem, type ItemInstance } from './ItemInstance';

export function createDungeonRewardItemByRarity(rarity: Rarity): ItemInstance {
  const def = SWORD_DEFS.find((weapon) => weapon.rarity === rarity && !STARTER_ONLY_IDS.has(weapon.id))
    ?? SWORD_DEFS.find((weapon) => !STARTER_ONLY_IDS.has(weapon.id))
    ?? SWORD_DEFS[0];
  return createItem(def, rarity);
}

export function createGoldenRewardItemByRarity(rarity: Rarity): ItemInstance {
  const def = SWORD_DEFS.find((weapon) => weapon.rarity === rarity && !STARTER_ONLY_IDS.has(weapon.id))
    ?? SWORD_DEFS.find((weapon) => weapon.rarity === 'rare' && !STARTER_ONLY_IDS.has(weapon.id))
    ?? SWORD_DEFS[2];
  return createItem(def, rarity);
}

export function createRandomRareOrBetterRewardItem(random: () => number = Math.random): ItemInstance {
  const pool = SWORD_DEFS.filter((weapon) => weapon.rarity !== 'normal');
  const def = pool[Math.floor(random() * pool.length)] ?? SWORD_DEFS[0];
  return createItem(def, def.rarity);
}
