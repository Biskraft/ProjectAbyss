/**
 * playerStats.ts — Player base stats loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_Stats_Character_Base.csv
 * CSV columns: Level,HP,ATK,DEF,INT,ExpToNext
 */

import csvText from '../../../Sheets/Content_Stats_Character_Base.csv?raw';

export interface PlayerStatEntry {
  level: number;
  hp: number;
  atk: number;
  def: number;
  expToNext: number;
}

const PLAYER_STATS = new Map<number, PlayerStatEntry>();

const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length < 6) continue;
  const entry: PlayerStatEntry = {
    level: parseInt(cols[0]),
    hp: parseInt(cols[1]),
    atk: parseInt(cols[2]),
    def: parseInt(cols[3]),
    expToNext: parseInt(cols[5]),
  };
  PLAYER_STATS.set(entry.level, entry);
}

/** Get player base stats for a given level. Falls back to Lv1. */
export function getPlayerBaseStats(level: number): PlayerStatEntry {
  return PLAYER_STATS.get(level)
    ?? PLAYER_STATS.get(1)
    ?? { level: 1, hp: 100, atk: 10, def: 5, expToNext: 100 };
}
