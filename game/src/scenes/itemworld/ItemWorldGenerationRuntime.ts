import { Debug } from '@core/Debug';
import { buildPrologueDive } from '@level/PrologueDive';
import { generateUnifiedGridFromGraph } from '@level/RoomGraphAdapter';
import type { RoomGraphData } from '@level/RoomGraph';
import { archetypeFor, type Archetype } from '@level/RoomGraphArchetypes';
import type { UnifiedGridData } from '@level/RoomGrid';
import type { LdtkLevel } from '@level/LdtkLoader';
import { STRATA_BY_RARITY, TOPOLOGY_VALUES, type StrataConfig, type TopologyKind } from '@data/StrataConfig';
import type { ItemInstance } from '@items/ItemInstance';

const DEBUG_ARCHETYPES: Archetype[] = [
  'direct',
  'zigzag',
  'switchback',
  'spiral',
  'wide_sprawl',
  'crooked',
  'branchy_maze',
];

interface InitialGenerationOptions {
  item: ItemInstance;
  strataConfig: StrataConfig;
  templates: LdtkLevel[];
  forcePrologue: boolean;
}

interface InitialGenerationResult {
  unifiedGrid: UnifiedGridData;
  graphs: RoomGraphData[];
  topologyOverride: TopologyKind | undefined;
  forcedPlacements: Map<string, LdtkLevel> | null;
}

interface DebugGenerationOptions {
  itemUid: number;
  templates: LdtkLevel[];
}

export interface ItemWorldDebugGenerationResult {
  strataConfig: StrataConfig;
  unifiedGrid: UnifiedGridData;
  graphs: RoomGraphData[];
  debugSeed: number;
  debugGenerationSeedOffset: number;
  rarity: keyof typeof STRATA_BY_RARITY;
  strataDepth: number;
  archetype: Archetype;
  topology: TopologyKind;
}

export class ItemWorldGenerationRuntime {
  generateInitial(options: InitialGenerationOptions): InitialGenerationResult {
    const urlTopology = this.resolveUrlTopology();
    if (urlTopology) Debug.log(`[ItemWorld] URL topology override: ${urlTopology}`);

    const archetype = this.resolveInitialArchetype(options.item);
    Debug.log(`[ItemWorld] archetype: ${archetype} (primary=${options.item.def.temperamentPrimary ?? '-'} secondary=${options.item.def.temperamentSecondary ?? '-'})`);

    const forcedDive = options.forcePrologue ? buildPrologueDive(options.templates) : null;
    if (forcedDive) {
      Debug.log('[ItemWorld] PROLOGUE forced dive (01->02->03->04)');
      return {
        unifiedGrid: forcedDive.unifiedGrid,
        graphs: forcedDive.graphs,
        topologyOverride: urlTopology,
        forcedPlacements: forcedDive.placements,
      };
    }

    const adapterResult = generateUnifiedGridFromGraph(
      options.strataConfig.strata,
      options.item.uid,
      urlTopology ?? options.item.def.topologyOverride,
      archetype,
      options.templates,
    );

    return {
      unifiedGrid: adapterResult.unifiedGrid,
      graphs: adapterResult.graphs,
      topologyOverride: urlTopology,
      forcedPlacements: null,
    };
  }

  generateDebug(options: DebugGenerationOptions): ItemWorldDebugGenerationResult | null {
    const rarityKeys = Object.keys(STRATA_BY_RARITY)
      .filter((key) => STRATA_BY_RARITY[key as keyof typeof STRATA_BY_RARITY]?.strata?.length > 0) as Array<keyof typeof STRATA_BY_RARITY>;
    if (rarityKeys.length === 0) return null;

    const rarity = rarityKeys[Math.floor(Math.random() * rarityKeys.length)];
    const baseConfig = STRATA_BY_RARITY[rarity];
    const strataDepth = 1 + Math.floor(Math.random() * baseConfig.strata.length);
    const strataConfig = {
      ...baseConfig,
      strata: baseConfig.strata.slice(0, strataDepth),
    };
    const archetype = DEBUG_ARCHETYPES[Math.floor(Math.random() * DEBUG_ARCHETYPES.length)];
    const debugGenerationSeedOffset = Math.floor(Math.random() * 1_000_000) + (Date.now() % 1_000_000);
    const debugSeed = options.itemUid + debugGenerationSeedOffset;
    const topology: TopologyKind = 'horizontal_descent';

    const adapterResult = generateUnifiedGridFromGraph(
      strataConfig.strata,
      debugSeed,
      topology,
      archetype,
      options.templates,
    );

    return {
      strataConfig,
      unifiedGrid: adapterResult.unifiedGrid,
      graphs: adapterResult.graphs,
      debugSeed,
      debugGenerationSeedOffset,
      rarity,
      strataDepth,
      archetype,
      topology,
    };
  }

  private resolveUrlTopology(): TopologyKind | undefined {
    const urlTopologyRaw = new URLSearchParams(window.location.search)
      .get('topology')?.trim().toLowerCase() ?? '';
    return TOPOLOGY_VALUES.has(urlTopologyRaw as TopologyKind)
      ? (urlTopologyRaw as TopologyKind)
      : undefined;
  }

  private resolveInitialArchetype(item: ItemInstance): Archetype {
    const urlArchRaw = new URLSearchParams(window.location.search)
      .get('archetype')?.trim().toLowerCase() ?? '';
    if (DEBUG_ARCHETYPES.includes(urlArchRaw as Archetype)) {
      return urlArchRaw as Archetype;
    }
    return archetypeFor(item.def.temperamentPrimary, item.def.temperamentSecondary);
  }
}
