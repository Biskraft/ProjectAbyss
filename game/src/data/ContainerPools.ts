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
import type { ContainerKind } from '../entities/ThrowableContainer';
import { resolveFluidMapping } from './ItemWorldFluidMapping';

/** Default temperament when a Generic_A/B/C container marker is placed in a
 *  scene that has no dive-weapon context (e.g., World rooms). Mirrors
 *  ItemWorldFluidMapping.ts default. */
const DEFAULT_TEMPERAMENT = 'forge';

type SlotKey = 'generic_a' | 'generic_b' | 'generic_c';

/**
 * 5-temperament × 3-slot Container kind pools. Mirror of
 * Design_ItemWorld_Themes.md §2.2 (slot-based decomposition).
 *
 * Slot semantics (matches FluidSpawner Generic_A/B/C tone):
 *   slot_a — primary signature kind (room first-impression dominant)
 *   slot_b — secondary kind set (signature 와 synergize)
 *   slot_c — accent kind set (잔존물 / 액센트)
 *
 * Each slot is itself a small weighted PoolEntry list — designers express
 * room tone by placing more spawners of one slot than others. To override,
 * use an explicit `Kind` value (Crate/MetalCrate/...) on the Container
 * entity instead of Generic_A/B/C.
 */
const CONTAINER_SLOT_POOLS: Record<string, Record<SlotKey, PoolEntry[]>> = {
  forge: {
    generic_a: [{ kind: 'MagmaCrucible', weight: 4 }],
    generic_b: [{ kind: 'OilDrum',       weight: 2 }, { kind: 'MetalCrate', weight: 3 }],
    generic_c: [{ kind: 'Crate',         weight: 1 }],
  },
  iron: {
    // V2.2 (2026-05-17) — Iron primary signature 가 cyro fluid 로 승격되며
    // Generic_A 도 CyroCanister (청백 액화 질소 통) 으로 매핑. 깨지면 cyro 풀
    // (TILE=14) spawn → FluidSystem 자동 흡수 + Frozen 상태이상 (-60% 2s) 발현.
    generic_a: [{ kind: 'CyroCanister',  weight: 4 }],
    generic_b: [{ kind: 'MetalCrate',    weight: 5 }],
    generic_c: [{ kind: 'WaterBarrel',   weight: 2 }, { kind: 'Crate', weight: 3 }],
  },
  rust: {
    generic_a: [{ kind: 'AcidVial',      weight: 4 }],
    generic_b: [{ kind: 'MetalCrate',    weight: 5 }],
    generic_c: [{ kind: 'Crate',         weight: 2 }],
  },
  spark: {
    // V2.2 (2026-05-17) — Spark primary signature 가 charged 로 승격되며
    // Generic_A 도 ChargedCell (보라 배터리 통, LDtk 명명 고정) 으로 매핑.
    // 깨지면 charged 풀 (TILE=8) spawn → FluidSystem 자동 흡수 + Arc Scan
    // Cycle 즉시 발현 + 인접 water 자동 Wet-Conductor Spread 전도화.
    generic_a: [{ kind: 'ChargedCell',   weight: 4 }],
    generic_b: [{ kind: 'WaterBarrel',   weight: 3 }],
    generic_c: [{ kind: 'MetalCrate',    weight: 3 }, { kind: 'Crate', weight: 2 }],
  },
  shadow: {
    generic_a: [{ kind: 'OilDrum',       weight: 3 }],
    generic_b: [{ kind: 'AcidVial',      weight: 2 }, { kind: 'MagmaCrucible', weight: 1 }],
    generic_c: [{ kind: 'Crate',         weight: 4 }],
  },
};

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
    // V2.2 (2026-05-17) — CyroCanister primary signature 추가 (액화 질소 시그니처).
    { kind: 'CyroCanister',  weight: 4 },
    { kind: 'MetalCrate',    weight: 5 },
    { kind: 'Crate',         weight: 3 },
    { kind: 'WaterBarrel',   weight: 2 },
  ],
  ItemWorld_Rust:   [
    { kind: 'AcidVial',      weight: 4 },
    { kind: 'MetalCrate',    weight: 5 },
    { kind: 'Crate',         weight: 2 },
  ],
  ItemWorld_Spark:  [
    // V2.2 (2026-05-17) — ChargedCell primary signature (LDtk 명명 고정).
    // WaterBarrel (전도 base) secondary, OilDrum 절연 흔적 가중치 감소.
    { kind: 'ChargedCell',   weight: 4 },
    { kind: 'WaterBarrel',   weight: 3 },
    { kind: 'MetalCrate',    weight: 3 },
    { kind: 'OilDrum',       weight: 1 },
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

/**
 * Resolve a Generic_A/B/C container marker to a concrete ContainerKind by
 * sampling from the temperament's slot pool. Used by Container entity
 * processing in ItemWorldScene / LdtkWorldScene when the entity's `Kind`
 * field is one of the Generic markers.
 *
 * @param slot one of 'generic_a' / 'generic_b' / 'generic_c' (lowercased)
 * @param temperament dive-weapon `temperamentPrimary` (lowercased), or null
 *                    for default (forge)
 * @param rand        optional RNG (`() => number` in [0,1)). Defaults to
 *                    Math.random for per-room variety.
 * @returns concrete ContainerKind, or null if the slot/temperament unknown
 */
export function resolveContainerSlotKind(
  slot: SlotKey | string,
  temperament: string | null | undefined,
  rand: () => number = Math.random,
): ContainerKind | null {
  const slotKey = (slot.toLowerCase() as SlotKey);
  if (slotKey !== 'generic_a' && slotKey !== 'generic_b' && slotKey !== 'generic_c') return null;
  const tempKey = (temperament && CONTAINER_SLOT_POOLS[temperament])
    ? temperament
    : DEFAULT_TEMPERAMENT;
  const pool = CONTAINER_SLOT_POOLS[tempKey]?.[slotKey];
  if (!pool || pool.length === 0) return null;
  let total = 0;
  for (const e of pool) total += e.weight;
  if (total <= 0) return null;
  let r = rand() * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e.kind;
  }
  return pool[pool.length - 1].kind;
}
