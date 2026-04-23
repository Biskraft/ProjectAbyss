/**
 * itemMaster.ts — Unified item registry loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_Item_Master.csv
 *
 * Every droppable item in the game has a unique ItemID registered here.
 * Other systems (SecretWall, LDtk Item entities, rollDrop, shops) reference
 * items by ItemID. The SourceSheet + SourceKey fields point to where the
 * detailed stats live (Weapon_List, Weapon_Lore, etc).
 */

import csvText from '../../../Sheets/Content_Item_Master.csv?raw';

export type ItemCategory = 'weapon' | 'currency' | 'consumable' | 'material';

export interface MasterItem {
  itemId: string;
  category: ItemCategory;
  name: string;
  sourceSheet: string;
  sourceKey: string;
  rarity: string;
  description: string;
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

    const entry: MasterItem = {
      itemId: cols[0].trim(),
      category: cols[1].trim() as ItemCategory,
      name: cols[2].trim(),
      sourceSheet: cols[3].trim(),
      sourceKey: cols[4].trim(),
      rarity: cols[5].trim(),
      description: cols[6].trim(),
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
