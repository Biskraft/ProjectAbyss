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

// ---------------------------------------------------------------------------
// Hard-required AreaIDs (keep in sync with LdtkWorldScene.ts / ItemWorldScene.ts)
// ---------------------------------------------------------------------------
const REQUIRED_AREA_IDS = [
  'world_shaft_bg',
  'world_shaft_wall',
  'iw_normal_bg',    'iw_normal_wall',
  'iw_magic_bg',     'iw_magic_wall',
  'iw_rare_bg',      'iw_rare_wall',
  'iw_legendary_bg', 'iw_legendary_wall',
  'iw_ancient_bg',   'iw_ancient_wall',
];

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
// Report
// ---------------------------------------------------------------------------
const hdr = (s) => `\n===== ${s} =====`;
console.log(hdr('Sheets validate.mjs'));
console.log(`  CSV:      ${CSV_PATH}`);
console.log(`  Atlas:    ${ATLAS_DIR}`);
console.log(`  LDtk:     ${LDTK_PATH}`);

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
