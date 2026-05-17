/**
 * ContainerPools — Catalog of ThrowableContainer kind+weight pools used by
 * ContainerSpawner. Mirror of System_World_Container.md §12.4.
 *
 * Each pool id maps to a weighted list of ContainerKind. ContainerSpawner's
 * `Pool` field can be either an inline array of `"Kind:weight"` strings
 * (explicit) OR omitted (in which case ItemWorldScene falls back to the
 * pool associated with the dive weapon's temperament — see
 * `lookupPoolByTemperament` below).
 *
 * When adding a new pool here, also update:
 *   - Documents/System/System_World_Container.md §12.4 (catalog table)
 *   - Sheets/Content_ItemWorld_FluidMapping.csv (if the pool is referenced
 *     by a new temperament row's `container_pool_id`)
 */

import type { PoolEntry } from '../systems/ContainerSpawner';
import { resolveFluidMapping } from './ItemWorldFluidMapping';

export const CONTAINER_POOLS: Record<string, PoolEntry[]> = {
  // ── Temperament-bound pools (ItemWorld primary use) ──
  ItemWorld_Forge:  [
    { kind: 'MagmaCrucible', weight: 4 },
    { kind: 'OilDrum',       weight: 2 },
    { kind: 'Crate',         weight: 1 },
    { kind: 'MetalCrate',    weight: 3 },
  ],
  // V2 (2026-05-17) — Design_ItemWorld_Themes.md §2.2 비평 회수:
  //   Iron MetalCrate 4→5 (Brittle setup 강화, ice 위 MetalCrate × Physical 1hit)
  //   Spark + OilDrum:2 (절연체로 회로 단절 퍼즐)
  //   Shadow + MagmaCrucible:1 (작은 vent 의외성 함정)
  ItemWorld_Iron:   [
    { kind: 'Crate',         weight: 3 },
    { kind: 'MetalCrate',    weight: 5 },
    { kind: 'WaterBarrel',   weight: 2 },
  ],
  ItemWorld_Rust:   [
    { kind: 'AcidVial',      weight: 4 },
    { kind: 'MetalCrate',    weight: 5 },
    { kind: 'Crate',         weight: 2 },
  ],
  ItemWorld_Spark:  [
    { kind: 'WaterBarrel',   weight: 3 },
    { kind: 'OilDrum',       weight: 2 },
    { kind: 'MetalCrate',    weight: 3 },
    { kind: 'Crate',         weight: 2 },
  ],
  ItemWorld_Shadow: [
    { kind: 'Crate',         weight: 4 },
    { kind: 'OilDrum',       weight: 3 },
    { kind: 'AcidVial',      weight: 2 },
    { kind: 'MagmaCrucible', weight: 1 },
  ],

  // ── World / generic-use pools (LdtkWorldScene rooms, themed but
  //    not temperament-bound) ──
  Warehouse_Generic: [
    { kind: 'Crate',         weight: 6 },
    { kind: 'MetalCrate',    weight: 2 },
    { kind: 'OilDrum',       weight: 1 },
    { kind: 'WaterBarrel',   weight: 1 },
  ],
  Workshop_Hazard: [
    { kind: 'Crate',         weight: 3 },
    { kind: 'OilDrum',       weight: 3 },
    { kind: 'MagmaCrucible', weight: 2 },
    { kind: 'MetalCrate',    weight: 2 },
  ],
  Lab_Acid: [
    { kind: 'Crate',         weight: 2 },
    { kind: 'AcidVial',      weight: 5 },
    { kind: 'MetalCrate',    weight: 3 },
  ],
  Empty_Decor: [
    { kind: 'Crate',         weight: 10 },
  ],
};

/**
 * Look up the pool for a temperament via ItemWorldFluidMapping. Used by
 * ContainerSpawner when the LDtk entity's `Pool` field is empty.
 *
 * @returns the pool entries, or an empty array if temperament has no mapping
 */
export function lookupPoolByTemperament(temperament: string | null | undefined): PoolEntry[] {
  if (!temperament) return [];
  const mapping = resolveFluidMapping(temperament);
  return CONTAINER_POOLS[mapping.containerPoolId] ?? [];
}
