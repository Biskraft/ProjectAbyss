import { SWORD_DEFS } from '@data/weapons';
import { createItem, type ItemInstance } from '@items/ItemInstance';

export function createBrokenSwordStarterItem(): ItemInstance {
  const def = SWORD_DEFS.find((weapon) => weapon.id === 'sword_broken') ?? SWORD_DEFS[0];
  return createItem(def);
}

export function createRustbornStarterItem(): ItemInstance {
  const def = SWORD_DEFS.find((weapon) => weapon.id === 'sword_rustborn') ?? SWORD_DEFS[0];
  return createItem(def, 'normal');
}
