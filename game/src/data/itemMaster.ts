/**
 * itemMaster.ts — Unified item registry loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_Item_Master.csv
 *   Schema (post LOC-04):
 *     ItemID, Category, NameKey, SourceSheet, SourceKey, Rarity, DescKey
 *   Display strings (NameKey/DescKey) resolve through Content_Localization.csv
 *   via t(). The CSV only carries structure + locale-key references.
 *
 * Every droppable item in the game has a unique ItemID registered here.
 * Other systems (SecretWall, LDtk Item entities, rollDrop, shops) reference
 * items by ItemID. The SourceSheet + SourceKey fields point to where the
 * detailed stats live (Weapon_List, Weapon_Lore, etc).
 */

import csvText from '../../../Sheets/Content_Item_Master.csv?raw';
import { t } from '@i18n';

export type ItemCategory = 'weapon' | 'currency' | 'consumable' | 'material';

export interface MasterItem {
  itemId: string;
  category: ItemCategory;
  name: string;
  sourceSheet: string;
  sourceKey: string;
  rarity: string;
  description: string;
  /**
   * DEC-046 Name Evolution — 5단계 이름 (Stage 0~4).
   * 모든 5칸이 채워져 있어야 함. 비어있으면 Stage 4 진명으로 fallback.
   * Tutorial / Lore weapons는 5단계 모두 동일 (변화 없음).
   */
  nameStages: [string, string, string, string, string];
  /**
   * DEC-046 인물 카테고리 (Identity Category).
   * Surveyor / BulkheadRepairman / CableBearer / DraftingArchivist / AbyssDiver / ... / Tutorial / LoreWeapon
   */
  identityCategory: string;
}

export const ITEM_MASTER: Map<string, MasterItem> = new Map();

/** All registered ItemIDs, useful for LDtk enum generation / validation. */
export const ALL_ITEM_IDS: string[] = [];

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

function parseMasterCSV(raw: string): void {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 7) continue;

    const nameKey = cols[2].trim();
    const descKey = cols[6].trim();
    const stage0Key = (cols[7] ?? '').trim();
    const stage1Key = (cols[8] ?? '').trim();
    const stage2Key = (cols[9] ?? '').trim();
    const stage3Key = (cols[10] ?? '').trim();
    const stage4Key = (cols[11] ?? '').trim();
    const identityCategory = (cols[12] ?? '').trim() || 'Unknown';

    const fallback = t(nameKey);
    const nameStages: [string, string, string, string, string] = [
      stage0Key ? t(stage0Key) : fallback,
      stage1Key ? t(stage1Key) : fallback,
      stage2Key ? t(stage2Key) : fallback,
      stage3Key ? t(stage3Key) : fallback,
      stage4Key ? t(stage4Key) : fallback,
    ];

    const entry: MasterItem = {
      itemId: cols[0].trim(),
      category: cols[1].trim() as ItemCategory,
      name: fallback,
      sourceSheet: cols[3].trim(),
      sourceKey: cols[4].trim(),
      rarity: cols[5].trim(),
      description: t(descKey),
      nameStages,
      identityCategory,
    };

    ITEM_MASTER.set(entry.itemId, entry);
    ALL_ITEM_IDS.push(entry.itemId);
  }
}

parseMasterCSV(csvText);

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Get a master item by ItemID. Returns undefined if not found. */
export function getMasterItem(itemId: string): MasterItem | undefined {
  return ITEM_MASTER.get(itemId);
}

/** Get all items of a specific category. */
export function getItemsByCategory(category: ItemCategory): MasterItem[] {
  const results: MasterItem[] = [];
  for (const item of ITEM_MASTER.values()) {
    if (item.category === category) results.push(item);
  }
  return results;
}

/** Get all weapon items of a specific rarity. */
export function getWeaponsByRarity(rarity: string): MasterItem[] {
  const results: MasterItem[] = [];
  for (const item of ITEM_MASTER.values()) {
    if (item.category === 'weapon' && item.rarity === rarity) results.push(item);
  }
  return results;
}
