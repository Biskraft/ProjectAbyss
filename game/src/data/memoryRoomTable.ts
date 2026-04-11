/**
 * memoryRoomTable.ts — Maps (WeaponID, StratumIndex) → LDtk Memory room level name.
 *
 * SSoT: Sheets/Content_ItemWorld_MemoryRooms.csv
 *
 * The Memory Room feature inserts a "lore pause" level into the item world's
 * procedural grid for specific weapons + strata. See Documents/Plan/Plan_MemoryRoom_Phase0.md.
 */

import csvText from '../../../Sheets/Content_ItemWorld_MemoryRooms.csv?raw';

/** Indexed by "weaponId:stratumIndex" → LDtk level identifier */
const TABLE = new Map<string, string>();

const lines = csvText.trim().split('\n');
for (let i = 1; i < lines.length; i++) { // skip header
  const cols = lines[i].split(',').map((s) => s.trim());
  if (cols.length < 3) continue;
  const [weaponId, stratumStr, roomName] = cols;
  if (!weaponId || !roomName) continue;
  const stratumIndex = parseInt(stratumStr, 10);
  if (Number.isNaN(stratumIndex)) continue;
  TABLE.set(`${weaponId}:${stratumIndex}`, roomName);
}

/** Returns the Memory room level name for a given weapon + stratum, or null. */
export function getMemoryRoom(weaponId: string, stratumIndex: number): string | null {
  return TABLE.get(`${weaponId}:${stratumIndex}`) ?? null;
}

/** True if this weapon has any memory room configured in any stratum. */
export function hasAnyMemoryRoomForWeapon(weaponId: string): boolean {
  for (const key of TABLE.keys()) {
    if (key.startsWith(weaponId + ':')) return true;
  }
  return false;
}
