#!/usr/bin/env node
/**
 * Sheets/tools/generate_ldtk_external_enums.mjs
 *
 * Generates game/public/assets/World_ProjectAbyss_ExternalEnums.json from CSV
 * content sheets used as the project SSoT.
 *
 * Sources:
 *   - Sheets/Content_Item_Master.csv column ItemID -> ItemId
 *   - Sheets/Content_Enemy.csv column Type -> MonsterType
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const ITEM_MASTER_CSV = resolve(ROOT, 'Sheets', 'Content_Item_Master.csv');
const ENEMY_CSV = resolve(ROOT, 'Sheets', 'Content_Enemy.csv');
const OUT_PATH = resolve(ROOT, 'game', 'public', 'assets', 'World_ProjectAbyss_ExternalEnums.json');

function splitCsvLine(line) {
  const cols = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      continue;
    }
    if (c === ',' && !inQuote) {
      cols.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  cols.push(cur);
  return cols;
}

function parseCsvRows(path) {
  if (!existsSync(path)) {
    console.error(`[ldtk-enums] CSV not found: ${path}`);
    process.exit(1);
  }

  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    console.error(`[ldtk-enums] CSV is empty: ${path}`);
    process.exit(1);
  }

  const header = splitCsvLine(lines[0]).map((value) => value.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row = {};
    header.forEach((key, index) => {
      row[key] = (cols[index] ?? '').trim();
    });
    rows.push(row);
  }
  return { header, rows };
}

function readUniqueColumn(path, columnName) {
  const { header, rows } = parseCsvRows(path);
  if (!header.includes(columnName)) {
    console.error(`[ldtk-enums] Missing column "${columnName}" in ${path}`);
    process.exit(1);
  }

  const values = [];
  const seen = new Set();
  let duplicates = 0;
  for (const row of rows) {
    const value = row[columnName];
    if (!value || value.startsWith('#')) continue;
    if (seen.has(value)) {
      console.error(`[ldtk-enums] Duplicate ${columnName}: "${value}" in ${path}`);
      duplicates++;
      continue;
    }
    seen.add(value);
    values.push(value);
  }

  if (duplicates > 0) {
    console.error(`[ldtk-enums] Aborting due to ${duplicates} duplicate value(s).`);
    process.exit(1);
  }

  return values;
}

const externalEnums = {
  ItemId: readUniqueColumn(ITEM_MASTER_CSV, 'ItemID'),
  MonsterType: readUniqueColumn(ENEMY_CSV, 'Type'),
};

writeFileSync(OUT_PATH, JSON.stringify(externalEnums, null, 2) + '\n', 'utf8');
console.log(
  `[ldtk-enums] wrote ${OUT_PATH} (${externalEnums.ItemId.length} ItemId, ${externalEnums.MonsterType.length} MonsterType)`,
);
