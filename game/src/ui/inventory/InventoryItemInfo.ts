import type { ItemInstance } from '@items/ItemInstance';
import { getIdentityCategory } from '@items/ItemInstance';
import { RARITY_DISPLAY_NAME } from '@data/weapons';
import { t } from '@i18n';

export function getInventoryCategoryLabel(item: ItemInstance): string {
  const category = getIdentityCategory(item);
  return category === 'Unknown'
    ? t('ui.inventory.recovery_unknown')
    : t(`ui.category.${category.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase()}`);
}

export function getInventoryRecoveryMeta(item: ItemInstance): string {
  const rarityName = RARITY_DISPLAY_NAME[item.rarity] ?? item.rarity;
  const categoryLabel = getInventoryCategoryLabel(item);
  const recoveryPct = Math.floor(item.memoryRecovery);
  return t('ui.inventory.recovery_meta', {
    rarity: rarityName,
    category: categoryLabel,
    pct: recoveryPct,
  });
}

export function getFragmentStagesForRarity(item: ItemInstance): number[] {
  if (item.rarity === 'normal') return [4];
  if (item.rarity === 'magic') return [2, 4];
  if (item.rarity === 'rare') return [1, 2, 4];
  return [1, 2, 3, 4];
}

export function getTotalFragmentsForRarity(item: ItemInstance): number {
  return { normal: 1, magic: 2, rare: 3, legendary: 4, ancient: 4 }[item.rarity] ?? 1;
}
