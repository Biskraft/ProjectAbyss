import type { ItemInstance } from '@items/ItemInstance';
import { STRATA_BY_RARITY } from '@data/StrataConfig';
import { archetypeFor } from '@level/RoomGraphArchetypes';
import { generateUnifiedGridFromGraph } from '@level/RoomGraphAdapter';
import type { UnifiedGridData } from '@level/RoomGrid';

export function buildInventoryStratumUnified(
  item: ItemInstance,
  cache: Map<string, UnifiedGridData | null>,
): UnifiedGridData | null {
  const key = `${item.uid}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  const cfg = STRATA_BY_RARITY[item.rarity];
  if (!cfg?.strata?.length) {
    cache.set(key, null);
    return null;
  }

  try {
    const arch = archetypeFor(item.def.temperamentPrimary, item.def.temperamentSecondary);
    const { unifiedGrid } = generateUnifiedGridFromGraph(
      cfg.strata,
      item.uid,
      item.def.topologyOverride,
      arch,
    );
    cache.set(key, unifiedGrid);
    return unifiedGrid;
  } catch {
    cache.set(key, null);
    return null;
  }
}
