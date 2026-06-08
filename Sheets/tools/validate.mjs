#!/usr/bin/env node
/**
 * Sheets/tools/validate.mjs
 *
 * Pre-build CSV integrity validator. Wired as `prebuild` in game/package.json.
 *
 * Scope (2026-04-21): Content_System_Area_Palette.csv ↔ code ↔ atlas files ↔ LDtk.
 *   V1 (P0): CSV must contain every AreaID the scenes hard-require.
 *   V2 (P0): CSV Tileset column values must resolve to real PNG files.
 *   V3 (warn): LDtk __tilesetRelPath set should not diverge from CSV Tileset set.
 *
 * LOC-10 (2026-05-08): i18n NameKey/DescKey ↔ Content_Localization.csv coverage.
 *   V4 (P0): every NameKey/DescKey referenced by Item_Master.csv
 *            and Content_MemoryShards.csv must
 *            exist as a Key in Content_Localization.csv.
 *
 * Exit code: 0 = pass / warn, 1 = P0 failure. Build aborts on non-zero.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CSV_PATH = resolve(ROOT, 'Sheets', 'Content_System_Area_Palette.csv');
const ATLAS_DIR = resolve(ROOT, 'game', 'public', 'assets', 'atlas');
const LDTK_PATH = resolve(ROOT, 'game', 'public', 'assets', 'World_ProjectAbyss.ldtk');
const LOCALIZATION_CSV = resolve(ROOT, 'Sheets', 'Content_Localization.csv');
const ITEM_MASTER_CSV = resolve(ROOT, 'Sheets', 'Content_Item_Master.csv');
const WEAPON_LIST_CSV = resolve(ROOT, 'Sheets', 'Content_Stats_Weapon_List.csv');
const MEMORY_SHARDS_CSV = resolve(ROOT, 'Sheets', 'Content_MemoryShards.csv');

// ---------------------------------------------------------------------------
// Hard-required AreaIDs (keep in sync with LdtkWorldScene.ts / ItemWorldScene.ts)
// ---------------------------------------------------------------------------
const REQUIRED_AREA_IDS = [
  'world_shaft_bg',
  'world_shaft_wall',
  // 5 temperament theme pairs (6 generic themes 제거 2026-05-31: habitat/security/
  // biozone/archive/logistics/breach → foundry/command/malfunction/coolant/echo 치환).
  'iw_foundry_bg',      'iw_foundry_wall',
  'iw_command_bg',      'iw_command_wall',
  'iw_malfunction_bg',  'iw_malfunction_wall',
  'iw_coolant_bg',      'iw_coolant_wall',
  'iw_echo_bg',         'iw_echo_wall',
];

// LDtk-authored override tilesets are intentionally not represented as area
// palette rows. Scenes preserve and preload these paths directly instead of
// retagging them through Content_System_Area_Palette.csv.
const AUTHORED_LDTK_TILESET_PATHS = new Set([
  'sprites/builder_sprite_01.png',
  'atlas/builder_01.png',
  'atlas/world_interior_01.png',
  'atlas/itemstratum_01.png',
]);

// ---------------------------------------------------------------------------
// CSV parser — quoted-field aware (Stops column contains embedded commas)
// ---------------------------------------------------------------------------
function splitCsvLine(line) {
  const cols = [];
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

function parseAreaPaletteCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = splitCsvLine(lines[0]).map(s => s.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row = {};
    header.forEach((h, j) => { row[h] = (cols[j] ?? '').trim(); });
    rows.push(row);
  }
  return { header, rows };
}

// ---------------------------------------------------------------------------
// Report accumulator
// ---------------------------------------------------------------------------
const errors = [];
const warnings = [];
const pushErr = (layer, msg) => errors.push(`[${layer}] ${msg}`);
const pushWarn = (layer, msg) => warnings.push(`[${layer}] ${msg}`);

// ---------------------------------------------------------------------------
// Load CSV
// ---------------------------------------------------------------------------
if (!existsSync(CSV_PATH)) {
  pushErr('V0', `CSV not found: ${CSV_PATH}`);
} else {
  const csvText = readFileSync(CSV_PATH, 'utf8');
  const { header, rows } = parseAreaPaletteCsv(csvText);
  const expectedCols = [
    'AreaID','Name','Layer','Brightness','Tint',
    'DepthBias','DepthCenter','Stops','Description','Tileset',
  ];
  for (const c of expectedCols) {
    if (!header.includes(c)) pushErr('V0', `missing CSV column "${c}"`);
  }

  // ------- V1: required AreaID coverage -------
  const csvIds = new Set(rows.map(r => r.AreaID));
  for (const need of REQUIRED_AREA_IDS) {
    if (!csvIds.has(need)) {
      pushErr('V1', `required AreaID missing from CSV: "${need}"`);
    }
  }
  // also flag duplicates
  const seen = new Set();
  for (const r of rows) {
    if (!r.AreaID) { pushErr('V1', `row has empty AreaID`); continue; }
    if (seen.has(r.AreaID)) pushErr('V1', `duplicate AreaID: "${r.AreaID}"`);
    seen.add(r.AreaID);
  }

  // ------- V2: CSV Tileset → PNG file must exist -------
  const csvTilesets = new Set();
  for (const r of rows) {
    const t = r.Tileset;
    if (!t) continue; // empty tileset is valid (no atlas)
    csvTilesets.add(t);
    const pngPath = resolve(ATLAS_DIR, `${t}.png`);
    if (!existsSync(pngPath)) {
      pushErr('V2', `CSV Tileset "${t}" (row AreaID=${r.AreaID}) → missing file: ${pngPath}`);
    }
  }

  // ------- V3 (warn): LDtk __tilesetRelPath diff vs CSV -------
  if (!existsSync(LDTK_PATH)) {
    pushWarn('V3', `LDtk not found (skipped): ${LDTK_PATH}`);
  } else {
    try {
      const ldtk = JSON.parse(readFileSync(LDTK_PATH, 'utf8'));
      const ldtkPaths = new Set();
      const worlds = ldtk.worlds?.length ? ldtk.worlds : [ldtk];
      for (const w of worlds) {
        for (const lv of w.levels ?? []) {
          for (const li of lv.layerInstances ?? []) {
            if (li.__tilesetRelPath) ldtkPaths.add(li.__tilesetRelPath);
          }
        }
      }
      // Normalize CSV values to "atlas/{name}.png"
      const csvAsPaths = new Set([...csvTilesets].map(t => `atlas/${t}.png`));
      for (const p of ldtkPaths) {
        if (!csvAsPaths.has(p)) {
          if (AUTHORED_LDTK_TILESET_PATHS.has(p)) {
            const assetPath = resolve(ROOT, 'game', 'public', 'assets', p);
            if (!existsSync(assetPath)) {
              pushErr('V3', `LDtk authored tileset "${p}" is allowlisted but missing file: ${assetPath}`);
            }
            continue;
          }
          pushWarn('V3', `LDtk uses "${p}" but no CSV row declares it (code retag will override — verify intent)`);
        }
      }
      for (const p of csvAsPaths) {
        if (!ldtkPaths.has(p)) {
          pushWarn('V3', `CSV declares "${p}" but no LDtk layer authored against it (harmless if BG/WALL split; verify)`);
        }
      }
    } catch (e) {
      pushWarn('V3', `LDtk parse failed: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// V4 (LOC-10): NameKey/DescKey coverage in Content_Localization.csv
// ---------------------------------------------------------------------------
function parseSimpleCsv(text) {
  const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  const header = splitCsvLine(lines[0]).map((s) => s.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const row = {};
    header.forEach((h, j) => { row[h] = (cols[j] ?? '').trim(); });
    rows.push(row);
  }
  return { header, rows };
}

function collectKeysFromCsv(path, columns) {
  if (!existsSync(path)) {
    pushWarn('V4', `referenced CSV not found (skipped): ${path}`);
    return [];
  }
  const text = readFileSync(path, 'utf8');
  const { header, rows } = parseSimpleCsv(text);
  const refs = [];
  for (const col of columns) {
    if (!header.includes(col)) {
      pushWarn('V4', `${path} has no column "${col}" (skipped)`);
      continue;
    }
    for (const row of rows) {
      const v = row[col];
      if (v) refs.push({ key: v, col, where: path });
    }
  }
  return refs;
}

const EN_TEXT_FORBIDDEN_CHARS = [
  { re: /\uFFFD/, label: 'replacement character U+FFFD' },
  { re: /[\u2018\u2019]/, label: 'smart apostrophe' },
  { re: /[\u201C\u201D]/, label: 'smart quote' },
  { re: /\u2026/, label: 'ellipsis character' },
  { re: /[\u2013\u2014]/, label: 'en/em dash' },
];

function validateLocalizationNotes(rows) {
  let brokenCount = 0;
  for (const row of rows) {
    const key = row.Key;
    if (!key || key.startsWith('#')) continue;
    const note = row.Note ?? '';
    if (note.includes('\uFFFD') || note.includes('??')) brokenCount++;
  }
  if (brokenCount > 0) {
    pushWarn('V4', `Content_Localization.csv has ${brokenCount} suspicious Note value(s) containing replacement/question artifacts`);
  }
}

function validateEnglishLocalizationText(rows) {
  for (const row of rows) {
    const key = row.Key;
    if (!key || key.startsWith('#')) continue;
    const value = row.en ?? '';
    for (const rule of EN_TEXT_FORBIDDEN_CHARS) {
      if (rule.re.test(value)) {
        pushErr('V4', `Content_Localization.csv en "${key}" contains forbidden ${rule.label}; use ASCII punctuation`);
      }
    }
  }
}

function looksLikeBrokenKoreanLocalization(value) {
  if (!value) return false;
  if (value.includes('\uFFFD') || value.includes('�')) return true;
  if (/[ìíëê媛吏留紐癤]/.test(value) && /[?�?]/.test(value)) return true;
  return false;
}

function looksLikeQuestionMarkDamagedKo(value, englishValue) {
  if (!value) return false;
  const questionCount = value.match(/\?/g)?.length ?? 0;
  if (questionCount < 2) return false;
  if (/^\?+$/.test(value.trim()) && /^\?+$/.test((englishValue ?? '').trim())) return false;
  const compactLength = value.replace(/\s/g, '').length;
  if (compactLength === 0 || questionCount / compactLength < 0.25) return false;
  if (!/[A-Za-z0-9\uAC00-\uD7A3]/.test(value)) return false;
  return true;
}

function validateKoreanLocalizationText(rows) {
  let brokenCount = 0;
  for (const row of rows) {
    const key = row.Key;
    if (!key || key.startsWith('#')) continue;
    if (looksLikeBrokenKoreanLocalization(row.ko ?? '') || looksLikeQuestionMarkDamagedKo(row.ko ?? '', row.en ?? '')) brokenCount++;
  }
  if (brokenCount > 0) {
    pushWarn('V4', `Content_Localization.csv has ${brokenCount} mojibake ko value(s); csv_to_locale omits them so runtime falls back to en`);
  }
}

if (!existsSync(LOCALIZATION_CSV)) {
  pushErr('V4', `Content_Localization.csv not found: ${LOCALIZATION_CSV}`);
} else {
  const locText = readFileSync(LOCALIZATION_CSV, 'utf8');
  const { header: locHeader, rows: locRows } = parseSimpleCsv(locText);
  if (!locHeader.includes('Key')) {
    pushErr('V4', 'Content_Localization.csv missing "Key" column');
  } else {
    validateEnglishLocalizationText(locRows);
    validateKoreanLocalizationText(locRows);
    validateLocalizationNotes(locRows);
    const definedKeys = new Set();
    for (const row of locRows) {
      const k = row.Key;
      if (k && !k.startsWith('#')) definedKeys.add(k);
    }
    const refs = [
      ...collectKeysFromCsv(ITEM_MASTER_CSV, ['NameKey', 'DescKey']),
      ...collectKeysFromCsv(WEAPON_LIST_CSV, ['NameKey']),
      ...collectKeysFromCsv(MEMORY_SHARDS_CSV, ['NameKey', 'DescKey']),
    ];
    const missing = new Map();
    for (const ref of refs) {
      if (!definedKeys.has(ref.key)) {
        const list = missing.get(ref.key) ?? [];
        list.push(`${ref.col} @ ${ref.where.split(/[\\/]/).slice(-1)[0]}`);
        missing.set(ref.key, list);
      }
    }
    for (const [key, sources] of missing) {
      pushErr('V4', `i18n key "${key}" referenced by ${sources.join(', ')} but missing from Content_Localization.csv`);
    }
  }
}

// ---------------------------------------------------------------------------
// V5 (LOC-11) — 코드의 t('key') 호출이 Content_Localization.csv 에 존재하는지 검사.
// V6 — CSV value 의 {placeholder} 와 t() 호출 vars 객체 키 일치 여부 검사.
// 둘 다 P0 (ERROR). 빌드 차단으로 raw key 노출 / raw {n} 노출 재발 방지.
// ---------------------------------------------------------------------------
import { readdirSync, statSync } from 'node:fs';

const SRC_DIR = resolve(ROOT, 'game', 'src');

/** Recursively collect every .ts file under dir. */
function walkTs(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = resolve(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkTs(p, acc);
    else if (p.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

/**
 * Parse t() calls. Captures key + (optional) vars literal as raw text.
 * Skips dynamic keys (template literals with ${...}). String concat skipped too.
 * Format covered: t('foo.bar'), t("foo.bar", { name: x }), t(`foo.bar`).
 */
const T_CALL_RE = /\bt\(\s*(['"`])([a-zA-Z0-9_.\-]+)\1\s*(?:,\s*(\{[^{}]*\}))?\s*\)/g;
/** Object key names — supports `name:`, `'name':`, and shorthand `{ name }`. */
const VARS_KEY_RE = /[,{]\s*['"`]?([a-zA-Z_][a-zA-Z0-9_]*)['"`]?\s*(?=[:,}])/g;
/** Placeholder tokens inside CSV value. */
const PLACEHOLDER_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

function extractCallsFromFile(file) {
  const text = readFileSync(file, 'utf8');
  const calls = [];
  let m;
  T_CALL_RE.lastIndex = 0;
  while ((m = T_CALL_RE.exec(text)) !== null) {
    const key = m[2];
    const varsRaw = m[3] ?? '';
    const varNames = new Set();
    if (varsRaw) {
      let vm;
      VARS_KEY_RE.lastIndex = 0;
      while ((vm = VARS_KEY_RE.exec(varsRaw)) !== null) varNames.add(vm[1]);
    }
    // Compute line number from index.
    const upto = text.slice(0, m.index);
    const line = upto.split(/\r?\n/).length;
    calls.push({ file, line, key, vars: varNames });
  }
  return calls;
}

if (existsSync(LOCALIZATION_CSV)) {
  const locText = readFileSync(LOCALIZATION_CSV, 'utf8');
  const { header: locHeader, rows: locRows } = parseSimpleCsv(locText);
  if (locHeader.includes('Key')) {
    // Build key → placeholder set map. Use 'en' column primarily, fall back to 'ko'.
    const definedKeys = new Map();
    for (const row of locRows) {
      const k = row.Key;
      if (!k || k.startsWith('#')) continue;
      const val = row.en || row.ko || '';
      const placeholders = new Set();
      let pm;
      PLACEHOLDER_RE.lastIndex = 0;
      while ((pm = PLACEHOLDER_RE.exec(val)) !== null) placeholders.add(pm[1]);
      definedKeys.set(k, placeholders);
    }

    const tsFiles = walkTs(SRC_DIR);
    const allCalls = [];
    for (const f of tsFiles) allCalls.push(...extractCallsFromFile(f));

    // V5 — missing keys.
    for (const c of allCalls) {
      if (!definedKeys.has(c.key)) {
        const rel = c.file.replace(ROOT + (process.platform === 'win32' ? '\\' : '/'), '');
        pushErr('V5', `t("${c.key}") used at ${rel}:${c.line} but missing from Content_Localization.csv`);
      }
    }

    // V6 — placeholder mismatch (only when key exists).
    for (const c of allCalls) {
      const placeholders = definedKeys.get(c.key);
      if (!placeholders) continue;
      // Required placeholder absent from call vars
      for (const ph of placeholders) {
        if (!c.vars.has(ph)) {
          const rel = c.file.replace(ROOT + (process.platform === 'win32' ? '\\' : '/'), '');
          pushErr('V6', `t("${c.key}") at ${rel}:${c.line} missing var "${ph}" — CSV uses {${ph}}`);
        }
      }
      // Extra vars supplied but not used by template — warn only (forward-compat).
      for (const v of c.vars) {
        if (!placeholders.has(v)) {
          const rel = c.file.replace(ROOT + (process.platform === 'win32' ? '\\' : '/'), '');
          pushWarn('V6', `t("${c.key}") at ${rel}:${c.line} passes var "${v}" but CSV value has no {${v}} token`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// V7 — Content_System_FluidTypes.csv shape check.
// foam_color is a valid #RRGGBB hex, foam_density ∈ [0,1].
// FluidSpawner crest foam relies on these — broken values would silently
// produce invisible foam or runtime NaN tint.
// ---------------------------------------------------------------------------
const FLUID_TYPES_CSV = resolve(ROOT, 'Sheets', 'Content_System_FluidTypes.csv');
if (existsSync(FLUID_TYPES_CSV)) {
  const text = readFileSync(FLUID_TYPES_CSV, 'utf8');
  const { header, rows } = parseSimpleCsv(text);
  const required = ['foam_color', 'foam_density'];
  for (const col of required) {
    if (!header.includes(col)) {
      pushErr('V7', `Content_System_FluidTypes.csv missing required column "${col}"`);
    }
  }
  const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
  for (const row of rows) {
    const id = row.id || '(no id)';
    if (header.includes('foam_color')) {
      const v = (row.foam_color || '').trim();
      if (!HEX_RE.test(v)) {
        pushErr('V7', `FluidTypes "${id}" foam_color="${v}" — expected #RRGGBB`);
      }
    }
    if (header.includes('foam_density')) {
      const raw = (row.foam_density || '').trim();
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        pushErr('V7', `FluidTypes "${id}" foam_density="${raw}" — expected number in [0,1]`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// V8 — Content_Stats_Enemy.csv Attribute column.
// "모든 몬스터는 속성을 가진다" (System_Enemy_MonsterArchetype.md §1.1 명제 2 / §1.3 제약 5).
// Attribute 컬럼 필수. 값은 6 fluid 중 하나이거나 blank(빈 값 = 지층 테마 폴백).
// ---------------------------------------------------------------------------
const ENEMY_CSV = resolve(ROOT, 'Sheets', 'Content_Stats_Enemy.csv');
if (existsSync(ENEMY_CSV)) {
  const { header, rows } = parseSimpleCsv(readFileSync(ENEMY_CSV, 'utf8'));
  if (!header.includes('Attribute')) {
    pushErr('V8', 'Content_Stats_Enemy.csv missing required "Attribute" column (모든 몬스터는 속성을 가진다 — §1.1 명제 2)');
  } else {
    const VALID_FLUIDS = new Set(['water', 'magma', 'oil', 'acid', 'charged', 'cyro']);
    for (const row of rows) {
      const id = `${row.Type || '(no type)'}:${row.Level || '?'}`;
      const v = (row.Attribute || '').trim().toLowerCase();
      if (v !== '' && !VALID_FLUIDS.has(v)) {
        pushErr('V8', `Enemy "${id}" Attribute="${v}" — expected water/magma/oil/acid/charged/cyro or blank(theme fallback)`);
      }
    }
  }
} else {
  pushWarn('V8', `Content_Stats_Enemy.csv not found (skipped): ${ENEMY_CSV}`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const hdr = (s) => `\n===== ${s} =====`;
console.log(hdr('Sheets validate.mjs'));
console.log(`  CSV:      ${CSV_PATH}`);
console.log(`  Atlas:    ${ATLAS_DIR}`);
console.log(`  LDtk:     ${LDTK_PATH}`);
console.log(`  Locale:   ${LOCALIZATION_CSV}`);

if (warnings.length) {
  console.log(hdr(`Warnings (${warnings.length})`));
  for (const w of warnings) console.log('  ' + w);
}

if (errors.length) {
  console.log(hdr(`Errors (${errors.length})`));
  for (const e of errors) console.log('  ' + e);
  console.log('\n[FAIL] CSV integrity check failed. Build aborted.');
  process.exit(1);
}

console.log(`\n[OK] CSV integrity check passed (${warnings.length} warning${warnings.length === 1 ? '' : 's'}).`);
process.exit(0);
