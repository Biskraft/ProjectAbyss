/**
 * loreWeapons.ts — Hand-placed lore weapon definitions.
 *
 * SSoT:
 *   - Sheets/Content_Stats_Weapon_Lore.csv  (stats/meta)
 *   - Sheets/LoreTexts/{weaponId}.md        (prose, frontmatter + body)
 *
 * Rationale: Sheets_Writing_Rules mandate CSV for structured data.  The
 * long-form lore prose doesn't fit a CSV cell (multi-paragraph, quotes,
 * italics), so we keep it alongside as sibling MD files referenced by
 * LorePath. Vite `import.meta.glob('?raw')` bundles them at build time.
 *
 * CSV columns:
 *   WeaponID,Name,Type,Rarity,BaseATK,AreaID,InnocentSeed,LorePath,Description
 */

import csvText from '../../../Sheets/Content_Stats_Weapon_Lore.csv?raw';
import type { Rarity } from './weapons';
import { SWORD_DEFS, type WeaponDef } from './weapons';

// Eagerly bundle every lore MD file so resolution is synchronous.
const loreMarkdownBundle = import.meta.glob(
  '../../../Sheets/LoreTexts/*.md',
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

export type WeaponType = 'Sword' | 'GS' | 'Dagger' | 'Bow' | 'Staff';

export interface LoreWeaponDef {
  id: string;
  name: string;
  type: WeaponType;
  rarity: Rarity;
  baseAtk: number;
  areaId: string;
  innocentSeed: string;
  lorePath: string;
  description: string;
  /** Raw markdown body (frontmatter stripped). Null if no MD found. */
  lore: string | null;
}

export const LORE_WEAPONS: Map<string, LoreWeaponDef> = new Map();

// ---------------------------------------------------------------------------
// Simple CSV line splitter (no quoted fields in this sheet, but safe).
// ---------------------------------------------------------------------------
function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; continue; }
    if (c === ',' && !inQuote) { cols.push(cur); cur = ''; continue; }
    cur += c;
  }
  cols.push(cur);
  return cols;
}

/** Strip YAML frontmatter from a markdown file, return body only. */
function stripFrontmatter(md: string): string {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  if (end < 0) return md;
  return md.slice(end + 4).replace(/^\s*\n/, '');
}

/** Resolve a Sheets-relative lore path to its bundled markdown body. */
function resolveLoreBody(lorePath: string): string | null {
  // lorePath is e.g. "LoreTexts/shaft_survey_compass.md" (relative to Sheets/).
  // Glob keys look like "../../../Sheets/LoreTexts/shaft_survey_compass.md".
  const key = Object.keys(loreMarkdownBundle).find(k => k.endsWith('/' + lorePath));
  if (!key) return null;
  return stripFrontmatter(loreMarkdownBundle[key]);
}

const lines = csvText.trim().split(/\r?\n/);
for (let i = 1; i < lines.length; i++) {
  const cols = splitCsvLine(lines[i]);
  if (cols.length < 9) continue;
  const id = cols[0].trim();
  const lorePath = cols[7].trim();
  LORE_WEAPONS.set(id, {
    id,
    name: cols[1].trim(),
    type: cols[2].trim() as WeaponType,
    rarity: cols[3].trim().toLowerCase() as Rarity,
    baseAtk: parseFloat(cols[4]) || 0,
    areaId: cols[5].trim(),
    innocentSeed: cols[6].trim(),
    lorePath,
    description: cols[8].trim(),
    lore: resolveLoreBody(lorePath),
  });
}

/** Lookup a lore weapon by ID. Throws if unknown. */
export function getLoreWeapon(id: string): LoreWeaponDef {
  const entry = LORE_WEAPONS.get(id);
  if (!entry) throw new Error(`loreWeapons: unknown WeaponID "${id}"`);
  return entry;
}

/** All lore weapons — useful for debug listings or inventory tooling. */
export function allLoreWeapons(): LoreWeaponDef[] {
  return Array.from(LORE_WEAPONS.values());
}

// ---------------------------------------------------------------------------
// Interop with the generic weapons pipeline
// ---------------------------------------------------------------------------

/**
 * Convert a LoreWeaponDef into a WeaponDef usable by `createItem` /
 * combat / inventory. Combat stats (atkSpeed/range/hitbox) inherit from the
 * matching-rarity sword template since the Lore CSV intentionally only
 * tracks narrative + baseAtk. Lore weapons override `id`, `name`, `baseAtk`,
 * and `rarity`.
 */
export function loreWeaponToWeaponDef(lore: LoreWeaponDef): WeaponDef {
  const template = SWORD_DEFS.find(d => d.rarity === lore.rarity) ?? SWORD_DEFS[0];
  return {
    id: lore.id,
    name: lore.name,
    rarity: lore.rarity,
    baseAtk: lore.baseAtk,
    atkSpeed: template.atkSpeed,
    range: template.range,
    hitboxW: template.hitboxW,
    hitboxH: template.hitboxH,
  };
}
