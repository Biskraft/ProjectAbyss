/**
 * rarityConfig.ts — Rarity-level constants loaded from CSV.
 *
 * SSoT: Sheets/Content_Rarity.csv
 * Centralizes: multiplier, slot split (identity + memory), color, bare-hand ATK, spawn/drop chances.
 * Slot model per DEC-036 (2026-04-28): identity slots (Core Memory only) + memory slots (free Active/Passive).
 */

import csvText from '../../../Sheets/Content_Rarity.csv?raw';
import type { Rarity } from './weapons';
import { ItemConst } from '@data/constData';

export interface RarityEntry {
  multiplier: number;
  /** Identity slots — Core Memory (boss drop) only. = number of strata in the weapon. */
  identitySlots: number;
  /** Memory slots — free Active/Passive shards. */
  memorySlots: number;
  /** Total slots = identitySlots + memorySlots. Preserves legacy total count. */
  totalSlots: number;
  color: number;
  bareHandAtk: number;
  /** Per-floor chance that a Forgotten Memory Shard NPC spawns. */
  shardSpawnChance: number;
  dropChance: number;
  /** Slash FX tint (0xRRGGBB). Multiplied with the weapon-type base color. */
  fxTint: number;
}

const RARITY_MAP = new Map<string, RarityEntry>();

/** Parse "0xRRGGBB" or "RRGGBB" (hex) to number. */
function parseHex(s: string): number {
  const v = s.trim();
  if (v.startsWith('0x') || v.startsWith('0X')) return parseInt(v.slice(2), 16);
  // Fall back to raw hex parse.
  const h = parseInt(v, 16);
  return Number.isNaN(h) ? parseInt(v) : h;
}

const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 10) continue;
  const rarity = cols[0].trim().toLowerCase();
  RARITY_MAP.set(rarity, {
    multiplier: parseFloat(cols[1]),
    identitySlots: parseInt(cols[2]),
    memorySlots: parseInt(cols[3]),
    totalSlots: parseInt(cols[4]),
    color: parseHex(cols[5]),
    bareHandAtk: parseInt(cols[6]),
    shardSpawnChance: parseFloat(cols[7]),
    dropChance: parseFloat(cols[8]),
    fxTint: parseHex(cols[9]),
  });
}

export function getRarityConfig(rarity: Rarity): RarityEntry {
  return RARITY_MAP.get(rarity) ?? {
    multiplier: 1, identitySlots: 2, memorySlots: 0, totalSlots: 2, color: 0xffffff,
    bareHandAtk: ItemConst.BareHandAtk,
    shardSpawnChance: ItemConst.DefaultShardSpawnChance,
    dropChance: ItemConst.DefaultDropChance,
    fxTint: 0xffffff,
  };
}

/** Convenience: get bare-hand ATK (same across all rarities in current CSV). */
export const BARE_HAND_ATK = getRarityConfig('normal').bareHandAtk;

/** Convenience: get drop chance (same across all rarities in current CSV). */
export const DROP_CHANCE = getRarityConfig('normal').dropChance;
