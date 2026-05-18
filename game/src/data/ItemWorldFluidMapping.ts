/**
 * ItemWorldFluidMapping — Resolves generic IntGrid markers into concrete
 * tile values based on the dive weapon's temperament.
 *
 * Two generic families (2026-05-18 V2.4 — SolidGeneric_A/B 추가):
 *   - FluidGeneric_A/B/C  (17/18/19)  →  fluid tiles per slot_a/b/c
 *   - SolidGeneric_A/B    (20/21)     →  solid tiles per solid_a/b
 *
 * Data SSoT (mirror this when changing values):
 *   Sheets/Content_ItemWorld_FluidMapping.csv
 *
 * Why this exists:
 *   ItemWorld room templates paint Generic_* IntGrid cells instead of
 *   concrete tile values. A single template can then represent different
 *   elemental themes depending on the diving weapon's temperament. This
 *   module performs the in-place substitution BEFORE FluidSystem.attachGrid
 *   so flood-fill (and physics) see the resolved values.
 *
 * Spec: Documents/System/System_World_Fluid.md §3.4
 */

import {
  TILE_WATER, TILE_MAGMA, TILE_OIL, TILE_ACID, TILE_ICE, TILE_CHARGED, TILE_CYRO,
  TILE_METAL, TILE_WOOD, TILE_BREAKABLE,
} from '../core/Physics';
import type { LdtkTile } from '../level/LdtkLoader';

/** Generic fluid IntGrid value (LDtk Collisions layer). Mirrors World_ProjectAbyss.ldtk. */
export const TILE_FLUID_GENERIC_A = 17;
export const TILE_FLUID_GENERIC_B = 18;
export const TILE_FLUID_GENERIC_C = 19;
/** Generic solid IntGrid value (V2.4 2026-05-18). Mirrors LDtk Collisions layer.
 *  LDtk SSoT: SolidGeneric_A=21, SolidGeneric_B=22 (cyro 가 20 점유). */
export const TILE_SOLID_GENERIC_A = 21;
export const TILE_SOLID_GENERIC_B = 22;

/**
 * World_01 tileset 의 단일-셀 솔리드 sprite 위치 (px). LDtk 의 `Solid` group
 * auto-tile rule 에서 추출 (tileRectsIds 246/244/253/252). 단일-셀 row 15
 * (y=240) 에 4종 솔리드가 좌→우로 배치됨.
 *
 * SolidGeneric_A/B 셀의 wallTile sprite 를 *resolved 솔리드 타입* 에 맞춰 런타임
 * 치환할 때 참조. theme tileset 가 swap 되어도 같은 row 15 위치가 각 theme PNG
 * 에 그려져 있어야 한다 (사용자 보장: "전부 world_01 에 그려져 있음").
 */
export const SOLID_SPRITE_SRC: Record<number, [number, number]> = {
  [TILE_METAL]:     [96, 240],
  [TILE_WOOD]:      [64, 240],
  [TILE_ICE]:       [208, 240],
  [TILE_BREAKABLE]: [192, 240],
};

/**
 * Lowercase to match weapons.ts ItemDef temperament field
 * (`temperamentPrimary?: 'forge' | 'iron' | 'rust' | 'spark' | 'shadow'`).
 */
export type Temperament = 'forge' | 'iron' | 'rust' | 'spark' | 'shadow';

export interface FluidMapping {
  /** IntGrid tile value to substitute for FluidGeneric_A (primary fluid). */
  slotA: number;
  /** IntGrid tile value to substitute for FluidGeneric_B (secondary fluid). */
  slotB: number;
  /** IntGrid tile value to substitute for FluidGeneric_C (accent fluid). */
  slotC: number;
  /** IntGrid tile value to substitute for SolidGeneric_A (signature solid). */
  solidA: number;
  /** IntGrid tile value to substitute for SolidGeneric_B (secondary/setup solid). */
  solidB: number;
  /** Container pool id for ContainerSpawner — must match System_World_Container.md §12.4. */
  containerPoolId: string;
}

/**
 * 5-temperament generic mapping. Mirrors Content_ItemWorld_FluidMapping.csv.
 * When tuning, update CSV first and regenerate this table (manual sync until
 * a build-time CSV loader exists).
 *
 * Fluid slots (V2.3 2026-05-18 iron slot_b=ice → cyro 통합 — "Generic = 항상 fluid"):
 *   - slot_a = primary fluid signature (room first-impression dominant)
 *   - slot_b = signature 와 시너지 producing fluid
 *   - slot_c = signature trigger / reaction base fluid
 *
 * Solid slots (V2.4 2026-05-18 추가):
 *   - solid_a = theme primary solid signature (room 의 "wow path" 솔리드)
 *   - solid_b = theme secondary 솔리드 (텍스처/위험/setup 변주)
 *
 * Solid 매핑 근거:
 *   - forge  metal/wood:     R-NEW-016 Smelt (path open) + oil-fueled wood chain
 *   - iron   ice/metal:      visual cyro identity + R-NEW-017 Brittle Metal shatter
 *   - rust   metal/wood:     R-003 Corrode (hidden path) + R-NEW-026 Acid Eats Wood
 *   - spark  metal/breakable: R-030 Thunder Chain conductor + capacitor pop
 *   - shadow wood/breakable: Oil-soaked plank trap + crumbling ruin aesthetic
 */
const FLUID_MAPPING: Record<Temperament, FluidMapping> = {
  forge:  {
    slotA: TILE_MAGMA,   slotB: TILE_OIL,      slotC: TILE_WATER,
    solidA: TILE_METAL,  solidB: TILE_WOOD,
    containerPoolId: 'ItemWorld_Forge',
  },
  iron:   {
    slotA: TILE_CYRO,    slotB: TILE_CYRO,     slotC: TILE_WATER,
    solidA: TILE_ICE,    solidB: TILE_METAL,
    containerPoolId: 'ItemWorld_Iron',
  },
  rust:   {
    slotA: TILE_ACID,    slotB: TILE_OIL,      slotC: TILE_WATER,
    solidA: TILE_METAL,  solidB: TILE_WOOD,
    containerPoolId: 'ItemWorld_Rust',
  },
  spark:  {
    slotA: TILE_CHARGED, slotB: TILE_WATER,    slotC: TILE_ACID,
    solidA: TILE_METAL,  solidB: TILE_BREAKABLE,
    containerPoolId: 'ItemWorld_Spark',
  },
  shadow: {
    slotA: TILE_OIL,     slotB: TILE_ACID,     slotC: TILE_MAGMA,
    solidA: TILE_WOOD,   solidB: TILE_BREAKABLE,
    containerPoolId: 'ItemWorld_Shadow',
  },
};

/** Used when a weapon has no temperament tag (e.g., test items, ancient legacy items). */
const DEFAULT_TEMPERAMENT: Temperament = 'forge';

/** Reverse map — TILE_* numeric value -> fluid type string identifier used by FluidSpawner. */
const TILE_TO_FLUID_TYPE_STR: Record<number, 'water' | 'magma' | 'oil' | 'acid' | 'charged' | 'cyro'> = {
  [TILE_WATER]:   'water',
  [TILE_MAGMA]:   'magma',
  [TILE_OIL]:     'oil',
  [TILE_ACID]:    'acid',
  [TILE_CHARGED]: 'charged',
  [TILE_CYRO]:    'cyro',
};

/**
 * Resolve a generic fluid spawner slot (`generic_a` / `generic_b` / `generic_c`)
 * to the concrete fluid type identifier for the given temperament. Used by
 * FluidSpawner.readFluidSpawnerEntities when the LDtk entity's `Type` field is
 * one of the Generic markers.
 *
 * @returns 'water' / 'magma' / 'oil' / 'acid' / 'charged' / 'cyro' — falls back
 *          to the temperament's slotA fluid if slot resolves to a non-fluid
 *          (예: 잘못된 매핑 안전망).
 */
export function resolveGenericFluidType(
  slotKey: 'generic_a' | 'generic_b' | 'generic_c',
  temperament: string | null | undefined,
): 'water' | 'magma' | 'oil' | 'acid' | 'charged' | 'cyro' {
  const m = resolveFluidMapping(temperament);
  const tile = slotKey === 'generic_a' ? m.slotA
             : slotKey === 'generic_b' ? m.slotB
             :                           m.slotC;
  // 2026-05-18: 슬롯이 non-fluid 로 resolve 되면 FluidSpawner 가 emit 할 수 없다.
  // 무지성 'water' fallback 대신 *해당 temperament 의 primary fluid (slotA)* 로 회수
  // — slotA 는 5종 temperament 에서 모두 fluid 인 invariant.
  return TILE_TO_FLUID_TYPE_STR[tile]
      ?? TILE_TO_FLUID_TYPE_STR[m.slotA]
      ?? 'water';
}

export function resolveFluidMapping(temperament: string | null | undefined): FluidMapping {
  if (temperament && (temperament as Temperament) in FLUID_MAPPING) {
    return FLUID_MAPPING[temperament as Temperament];
  }
  return FLUID_MAPPING[DEFAULT_TEMPERAMENT];
}

/**
 * In-place substitute Generic_* cells with the concrete tile values for the
 * given temperament. Must be called BEFORE FluidSystem.attachGrid so the
 * flood-fill picks up resolved values; also before physics evaluation so the
 * resolved solid cells participate in collision correctly.
 *
 * Resolved markers:
 *   - FluidGeneric_A/B/C (17/18/19) → slotA/B/C (fluid tiles)
 *   - SolidGeneric_A/B   (20/21)    → solidA/B  (solid tiles)
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
      if      (v === TILE_FLUID_GENERIC_A) row[gx] = mapping.slotA;
      else if (v === TILE_FLUID_GENERIC_B) row[gx] = mapping.slotB;
      else if (v === TILE_FLUID_GENERIC_C) row[gx] = mapping.slotC;
      else if (v === TILE_SOLID_GENERIC_A) row[gx] = mapping.solidA;
      else if (v === TILE_SOLID_GENERIC_B) row[gx] = mapping.solidB;
    }
  }
}

/**
 * Return a *new* wallTiles array where SolidGeneric_A/B cell sprites have been
 * substituted with the resolved solid type's sprite (from SOLID_SPRITE_SRC).
 * Source array is not mutated — LDtk template's canonical wallTiles is shared
 * across multiple room loads, so we operate on a copy.
 *
 * Must be called with the *pre-resolution* collisionGrid (where 21/22 are still
 * intact) so we can identify which cells need substitution.
 *
 * @param wallTiles  LDtk auto-baked wallTile list (read-only here)
 * @param collisionGrid  per-room 또는 unified grid, 해석 *전* 상태
 * @param temperament  weapon's temperamentPrimary
 * @returns 새 wallTiles 배열 (substituted entries 가 새 객체로, 나머지는 원본 참조)
 */
export function substituteSolidGenericSprites(
  wallTiles: readonly LdtkTile[],
  collisionGrid: number[][],
  temperament: string | null | undefined,
): LdtkTile[] {
  const mapping = resolveFluidMapping(temperament);
  const srcA = SOLID_SPRITE_SRC[mapping.solidA];
  const srcB = SOLID_SPRITE_SRC[mapping.solidB];
  const out: LdtkTile[] = [];
  for (const tile of wallTiles) {
    const gx = Math.floor(tile.px[0] / 16);
    const gy = Math.floor(tile.px[1] / 16);
    const v = collisionGrid[gy]?.[gx];
    if (v === TILE_SOLID_GENERIC_A && srcA) {
      // tile 객체 자체는 freeze 가능성 있어 안전하게 shallow clone + src 교체.
      out.push({ ...tile, src: [srcA[0], srcA[1]] });
    } else if (v === TILE_SOLID_GENERIC_B && srcB) {
      out.push({ ...tile, src: [srcB[0], srcB[1]] });
    } else {
      out.push(tile);
    }
  }
  return out;
}
