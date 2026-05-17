/**
 * ItemWorldFluidMapping — Resolves generic IntGrid fluid markers (17/18/19)
 * into concrete fluid tile values based on the dive weapon's temperament.
 *
 * Data SSoT (mirror this when changing values):
 *   Sheets/Content_ItemWorld_FluidMapping.csv
 *
 * Why this exists:
 *   ItemWorld room templates paint FluidGeneric_A/B/C IntGrid cells (17/18/19)
 *   instead of concrete water(2)/magma(6)/oil(11)/acid(13). A single template
 *   can then represent different elemental themes depending on the diving
 *   weapon's temperament. This module performs the in-place substitution
 *   BEFORE FluidSystem.attachGrid so flood-fill sees the resolved values.
 *
 * Spec: Documents/System/System_World_Fluid.md §3.4
 */

import { TILE_WATER, TILE_MAGMA, TILE_OIL, TILE_ACID, TILE_ICE, TILE_CHARGED } from '../core/Physics';

/** Generic fluid IntGrid value (LDtk Collisions layer). Mirrors World_ProjectAbyss.ldtk. */
export const TILE_FLUID_GENERIC_A = 17;
export const TILE_FLUID_GENERIC_B = 18;
export const TILE_FLUID_GENERIC_C = 19;

/**
 * Lowercase to match weapons.ts ItemDef temperament field
 * (`temperamentPrimary?: 'forge' | 'iron' | 'rust' | 'spark' | 'shadow'`).
 */
export type Temperament = 'forge' | 'iron' | 'rust' | 'spark' | 'shadow';

export interface FluidMapping {
  /** IntGrid tile value to substitute for FluidGeneric_A (primary). */
  slotA: number;
  /** IntGrid tile value to substitute for FluidGeneric_B (secondary). */
  slotB: number;
  /** IntGrid tile value to substitute for FluidGeneric_C (accent). */
  slotC: number;
  /** Container pool id for ContainerSpawner — must match System_World_Container.md §12.4. */
  containerPoolId: string;
}

/**
 * 5-temperament x 3-slot mapping. Mirrors Content_ItemWorld_FluidMapping.csv.
 * When tuning, update CSV first and regenerate this table (manual sync until
 * a build-time CSV loader exists).
 *
 * V3 (2026-05-13) — 위협 곡선 + 단조성 동시 회수:
 *   - slot_a = water 모든 기질 통일 (unified base)
 *   - slot_b = 각 기질의 시그니처 hazard (magma/ice/acid/charged/oil) — 정체성 직매핑
 *   - slot_c = slot_b 와 상호작용 가능한 시너지 fluid
 *   - spark slot_b 가 TILE_CHARGED — charged 가 fluid 화 되기 전엔 정적 hazard 셀로
 *     작동 (FluidSystem 의 flood-fill 에서 빠짐, TileHazards 의 DOT 1%/0.5s 발현).
 *     향후 charged fluid 화 spec 확정 후 자동 흡수.
 * 참조: Design_ItemWorld_Themes.md V3 + memory/wiki/decisions/DEC-V3-fluid-mapping.md
 */
const FLUID_MAPPING: Record<Temperament, FluidMapping> = {
  forge:  { slotA: TILE_WATER, slotB: TILE_MAGMA,   slotC: TILE_OIL,   containerPoolId: 'ItemWorld_Forge'  },
  iron:   { slotA: TILE_WATER, slotB: TILE_ICE,     slotC: TILE_ACID,  containerPoolId: 'ItemWorld_Iron'   },
  rust:   { slotA: TILE_WATER, slotB: TILE_ACID,    slotC: TILE_OIL,   containerPoolId: 'ItemWorld_Rust'   },
  spark:  { slotA: TILE_WATER, slotB: TILE_CHARGED, slotC: TILE_ACID,  containerPoolId: 'ItemWorld_Spark'  },
  shadow: { slotA: TILE_WATER, slotB: TILE_OIL,     slotC: TILE_MAGMA, containerPoolId: 'ItemWorld_Shadow' },
};

/** Used when a weapon has no temperament tag (e.g., test items, ancient legacy items). */
const DEFAULT_TEMPERAMENT: Temperament = 'forge';

/** Reverse map — TILE_* numeric value -> fluid type string identifier used by FluidSpawner. */
const TILE_TO_FLUID_TYPE_STR: Record<number, 'water' | 'magma' | 'oil' | 'acid' | 'charged'> = {
  [TILE_WATER]:   'water',
  [TILE_MAGMA]:   'magma',
  [TILE_OIL]:     'oil',
  [TILE_ACID]:    'acid',
  [TILE_CHARGED]: 'charged',
};

/**
 * Resolve a generic fluid spawner slot (`generic_a` / `generic_b` / `generic_c`)
 * to the concrete fluid type identifier for the given temperament. Used by
 * FluidSpawner.readFluidSpawnerEntities when the LDtk entity's `Type` field is
 * one of the Generic markers.
 *
 * @returns 'water' / 'magma' / 'oil' / 'acid' — falls back to 'water' if mapping
 *          resolution somehow yields an unsupported tile value.
 */
export function resolveGenericFluidType(
  slotKey: 'generic_a' | 'generic_b' | 'generic_c',
  temperament: string | null | undefined,
): 'water' | 'magma' | 'oil' | 'acid' | 'charged' {
  const m = resolveFluidMapping(temperament);
  const tile = slotKey === 'generic_a' ? m.slotA
             : slotKey === 'generic_b' ? m.slotB
             :                           m.slotC;
  return TILE_TO_FLUID_TYPE_STR[tile] ?? 'water';
}

export function resolveFluidMapping(temperament: string | null | undefined): FluidMapping {
  if (temperament && (temperament as Temperament) in FLUID_MAPPING) {
    return FLUID_MAPPING[temperament as Temperament];
  }
  return FLUID_MAPPING[DEFAULT_TEMPERAMENT];
}

/**
 * In-place substitute FluidGeneric_A/B/C cells (17/18/19) with the concrete
 * fluid tile values for the given temperament. Must be called BEFORE
 * FluidSystem.attachGrid / attach so the flood-fill picks up resolved values.
 *
 * Cells that are not generic markers are untouched.
 *
 * @param grid `roomData` / `fullGrid` (mutated in place)
 * @param temperament Weapon's `temperamentPrimary` (lowercased), or null for default
 */
export function applyFluidGenericResolution(
  grid: number[][],
  temperament: string | null | undefined,
): void {
  const mapping = resolveFluidMapping(temperament);
  const rows = grid.length;
  for (let gy = 0; gy < rows; gy++) {
    const row = grid[gy];
    if (!row) continue;
    for (let gx = 0; gx < row.length; gx++) {
      const v = row[gx];
      if (v === TILE_FLUID_GENERIC_A) row[gx] = mapping.slotA;
      else if (v === TILE_FLUID_GENERIC_B) row[gx] = mapping.slotB;
      else if (v === TILE_FLUID_GENERIC_C) row[gx] = mapping.slotC;
    }
  }
}
