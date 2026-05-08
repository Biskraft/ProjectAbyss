#!/usr/bin/env node
/**
 * Sheets/tools/csv_to_locale.mjs
 *
 * Converts Sheets/Content_Localization.csv → game/src/i18n/locales/{en,ko}.json.
 * Wired as `predev` and the first step of `prebuild` in game/package.json.
 *
 * CSV schema: Key, en, ko, Note
 *   - Key: dot-separated identifier (e.g., ego.wake.0)
 *   - en/ko: display string. Empty cell = missing translation (runtime fallback).
 *   - Note: optional translator context, ignored at build.
 *
 * Output JSON: { [key]: string } per locale. Empty cells are omitted so the
 * runtime t() fallback chain (active → en → key) works correctly.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CSV_PATH = resolve(ROOT, 'Sheets', 'Content_Localization.csv');
const OUT_DIR = resolve(ROOT, 'game', 'src', 'i18n', 'locales');

// ---------------------------------------------------------------------------
// CSV parser — quoted-field aware, tolerant of \r\n line endings.
// ---------------------------------------------------------------------------
function splitCsvLine(line) {
  const cols = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      // Handle "" as a literal " inside a quoted field
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQuote = !inQuote;
      continue;
    }
    if (c === ',' && !inQuote) { cols.push(cur); cur = ''; continue; }
    cur += c;
  }
  cols.push(cur);
  return cols;
}

function parseCsv(text) {
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

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
if (!existsSync(CSV_PATH)) {
  console.error(`[i18n] CSV not found: ${CSV_PATH}`);
  process.exit(1);
}

const text = readFileSync(CSV_PATH, 'utf8');
const { header, rows } = parseCsv(text);

for (const required of ['Key', 'en', 'ko']) {
  if (!header.includes(required)) {
    console.error(`[i18n] CSV missing required column "${required}". Header: ${header.join(', ')}`);
    process.exit(1);
  }
}

const en = {};
const ko = {};
const seenKeys = new Set();
let dupCount = 0;
for (const row of rows) {
  const key = row.Key;
  if (!key || key.startsWith('#')) continue;
  if (seenKeys.has(key)) {
    console.error(`[i18n] duplicate key: "${key}"`);
    dupCount++;
    continue;
  }
  seenKeys.add(key);
  if (row.en) en[key] = row.en;
  if (row.ko) ko[key] = row.ko;
}

if (dupCount > 0) {
  console.error(`[i18n] aborting due to ${dupCount} duplicate key(s).`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'en.json'), JSON.stringify(en, null, 2) + '\n', 'utf8');
writeFileSync(resolve(OUT_DIR, 'ko.json'), JSON.stringify(ko, null, 2) + '\n', 'utf8');

const total = seenKeys.size;
const missingKo = total - Object.keys(ko).length;
const missingEn = total - Object.keys(en).length;
console.log(`[i18n] ${total} keys → en (${Object.keys(en).length}, ${missingEn} missing), ko (${Object.keys(ko).length}, ${missingKo} missing)`);
