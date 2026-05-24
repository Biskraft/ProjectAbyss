/**
 * loreWeapons.ts — Hand-placed lore weapon definitions.
 *
 * SSoT:
 *   - Sheets/Content_Stats_Weapon_Lore.csv      (stats/meta)
 *   - Sheets/LoreTexts/Weapons/{weaponId}.md    (prose, frontmatter + body)
 *
 * 2026-05-24: LoreTexts 정리에 따라 Lore 무기 MD 는 `LoreTexts/Weapons/` 하위로 이동.
 *   - 같은 LoreTexts 상위 폴더의 `Fragments/` 는 DEC-046 Memory Fragment 시스템 전용
 *     (fragments.ts 가 별도 로드). 두 종류는 *컨벤션이 다르므로* 디렉토리로 분리.
 *
 * Rationale: Sheets_Writing_Rules mandate CSV for structured data. The
 * long-form lore prose doesn't fit a CSV cell (multi-paragraph, quotes,
 * italics), so we keep it alongside as sibling MD files referenced by
 * LorePath. Vite `import.meta.glob('?raw')` bundles them at build time.
 *
 * CSV columns (post LOC-04):
 *   WeaponID,NameKey,Type,Rarity,BaseATK,AreaID,MemoryShardSeed,LorePath,DescKey
 *
 * NameKey/DescKey resolve through Sheets/Content_Localization.csv via t().
 * Strings live there as the SSoT; this CSV only carries structure + keys.
 */

import csvText from '../../../Sheets/Content_Stats_Weapon_Lore.csv?raw';
import type { Rarity, WeaponType } from './weapons';
import { SWORD_DEFS, STARTER_ONLY_IDS, type WeaponDef } from './weapons';
import { t } from '@i18n';

// Eagerly bundle every lore weapon MD file under LoreTexts/Weapons/.
// Note: Sibling LoreTexts/Fragments/ 는 DEC-046 fragments.ts 가 별도 로드 (의도된 분리).
const loreMarkdownBundle = import.meta.glob(
  '../../../Sheets/LoreTexts/Weapons/*.md',
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

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
  // lorePath is e.g. "LoreTexts/Weapons/shaft_survey_compass.md" (relative to Sheets/).
  // Glob keys look like "../../../Sheets/LoreTexts/Weapons/shaft_survey_compass.md".
  const key = Object.keys(loreMarkdownBundle).find(k => k.endsWith('/' + lorePath));
  if (!key) return null;
  return stripFrontmatter(loreMarkdownBundle[key]);
}

const lines = csvText.trim().split(/\r?\n/);
for (let i = 1; i < lines.length; i++) {
  const cols = splitCsvLine(lines[i]);
  if (cols.length < 9) continue;
  const id = cols[0].trim();
  const nameKey = cols[1].trim();
  const lorePath = cols[7].trim();
  const descKey = cols[8].trim();
  LORE_WEAPONS.set(id, {
    id,
    name: t(nameKey),
    type: cols[2].trim() as WeaponType,
    rarity: cols[3].trim().toLowerCase() as Rarity,
    baseAtk: parseFloat(cols[4]) || 0,
    areaId: cols[5].trim(),
    innocentSeed: cols[6].trim(),
    lorePath,
    description: t(descKey),
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
  const template = SWORD_DEFS.find(d => d.rarity === lore.rarity && !STARTER_ONLY_IDS.has(d.id))
    ?? SWORD_DEFS.find(d => !STARTER_ONLY_IDS.has(d.id))
    ?? SWORD_DEFS[0];
  return {
    id: lore.id,
    name: lore.name,
    type: lore.type,
    rarity: lore.rarity,
    baseAtk: lore.baseAtk,
    atkSpeed: template.atkSpeed,
    range: template.range,
    hitboxW: template.hitboxW,
    hitboxH: template.hitboxH,
    themeId: template.themeId,
    weaponHandleX: template.weaponHandleX,
    weaponHandleY: template.weaponHandleY,
  };
}
