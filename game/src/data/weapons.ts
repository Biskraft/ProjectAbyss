/**
 * weapons.ts — Weapon definitions loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_Stats_Weapon_List.csv
 * CSV columns: WeaponID,Name,Type,Rarity,BaseATK,AtkSpeed,Range,HitboxW,HitboxH,ThemeID,Topology
 *
 * Topology 칼럼(빈값 가능): Phase 4 매핑 — 무기별 Item World 그래프 토폴로지 강제.
 * 빈값이면 stratum 기본값(StratumDef.topology)을 사용한다.
 */

import csvText from '../../../Sheets/Content_Stats_Weapon_List.csv?raw';
import type { TopologyKind } from '@data/StrataConfig';

const TOPOLOGY_VALUES: ReadonlySet<string> = new Set<TopologyKind>([
  'hub_spoke', 'multi_hub',
  'linear_right',
  'y_fork', 't_junction', 'layer_cake', 'ring', 'spine_pockets',
]);

export type Rarity = 'normal' | 'magic' | 'rare' | 'legendary' | 'ancient';

/**
 * Canonical weapon type taxonomy (DEC-026). SSoT for both procedural
 * (Content_Stats_Weapon_List.csv) and lore (Content_Stats_Weapon_Lore.csv)
 * weapons. Keep this list in sync with any Type column entries in those CSVs.
 */
export type WeaponType =
  | 'Blade'
  | 'Cleaver'
  | 'Shiv'
  | 'Harpoon'
  | 'Chain'
  | 'Railbow'
  | 'Emitter';

export const WEAPON_TYPES: readonly WeaponType[] = [
  'Blade', 'Cleaver', 'Shiv', 'Harpoon', 'Chain', 'Railbow', 'Emitter',
];

// RARITY_MULTIPLIER is now derived from Content_Rarity.csv via rarityConfig.ts.
// Kept here as a computed record for backward compatibility with existing imports.
import { getRarityConfig } from './rarityConfig';

export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  normal: getRarityConfig('normal').multiplier,
  magic: getRarityConfig('magic').multiplier,
  rare: getRarityConfig('rare').multiplier,
  legendary: getRarityConfig('legendary').multiplier,
  ancient: getRarityConfig('ancient').multiplier,
};

/** Diablo-style display names */
export const RARITY_DISPLAY_NAME: Record<Rarity, string> = {
  normal: 'Normal',
  magic: 'Magic',
  rare: 'Rare',
  legendary: 'Legendary',
  ancient: 'Ancient',
};

/** Rarity tier index (0=lowest, 4=highest) for numeric comparisons */
export const RARITY_TIER: Record<Rarity, number> = {
  normal: 0,
  magic: 1,
  rare: 2,
  legendary: 3,
  ancient: 4,
};

export interface WeaponDef {
  id: string;
  name: string;
  type: WeaponType;
  rarity: Rarity;
  baseAtk: number;
  atkSpeed: number;
  range: number;
  hitboxW: number;
  hitboxH: number;
  /** Item World visual theme. e.g. "T-HABITAT", "T-FOUNDRY" */
  themeId: string;
  /**
   * 무기별 Room Graph 토폴로지 강제 (Phase 4). 지정 시 모든 stratum 의
   * StratumDef.topology 를 오버라이드한다. 미지정 = stratum 기본값.
   * CSV 의 Topology 칼럼이 빈값일 때 undefined.
   */
  topologyOverride?: TopologyKind;
}

/**
 * Weapon IDs that are only usable as starter/story items — excluded from
 * random drop pools and rarity-template lookups.
 */
export const STARTER_ONLY_IDS: ReadonlySet<string> = new Set(['sword_broken']);

/** Sword weapon definitions — parsed from Content_Stats_Weapon_List.csv */
export const SWORD_DEFS: WeaponDef[] = [];

const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 9) continue;
  const topoRaw = (cols[10] ?? '').trim().toLowerCase();
  const topologyOverride = TOPOLOGY_VALUES.has(topoRaw)
    ? (topoRaw as TopologyKind)
    : undefined;
  SWORD_DEFS.push({
    id: cols[0].trim(),
    name: cols[1].trim(),
    type: cols[2].trim() as WeaponType,
    rarity: cols[3].trim().toLowerCase() as Rarity,
    baseAtk: parseFloat(cols[4]),
    atkSpeed: parseFloat(cols[5]),
    range: parseInt(cols[6]),
    hitboxW: parseInt(cols[7]),
    hitboxH: parseInt(cols[8]),
    themeId: (cols[9] ?? 'T-HABITAT').trim(),
    topologyOverride,
  });
}
