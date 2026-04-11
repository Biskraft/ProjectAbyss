#!/usr/bin/env node
/**
 * merge-ldtk.mjs — Merge LAYOUT + ItemStratum LDtk projects into one multi-world project.
 *
 * Sources:
 *   game/public/assets/World_ProjectAbyss_Layout.ldtk       → World "Overworld"
 *   game/public/assets/World_ProjectAbyss_ItemStratum.ldtk  → World "ItemStratum"
 *
 * Output:
 *   game/public/assets/World_ProjectAbyss.ldtk
 *
 * Strategy:
 *   - LAYOUT is the base project (more content, more entity defs).
 *   - STRATUM defs are merged in:
 *     * Layers/tilesets: identical uids → skip.
 *     * Entity defs: merge unique uids; for shared uids, warn on drift (LAYOUT wins).
 *       STRATUM has 0 entity instances in its levels, so drift is cosmetic.
 *     * Enum uid=74 collision: LAYOUT.ItemId stays; STRATUM.ItemType reassigned uid=1074.
 *     * Enum uid=98 RoomType: values unioned (string refs are preserved).
 *     * LevelFields: keep both (LAYOUT.roomType uid=99 scalar + STRATUM.RoomType uid=194 array).
 *   - Levels: LAYOUT → worlds[0] "Overworld", STRATUM → worlds[1] "ItemStratum".
 *   - Root levels[] set to [] (multi-world mode).
 *
 * Usage:
 *   node tools/merge-ldtk.mjs
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

// Resolve project root from this script's location (script lives in `tools/`).
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const ASSETS = resolve(ROOT, 'game/public/assets');
const LAYOUT_PATH = resolve(ASSETS, 'World_ProjectAbyss_Layout.ldtk');
const STRATUM_PATH = resolve(ASSETS, 'World_ProjectAbyss_ItemStratum.ldtk');
const OUTPUT_PATH = resolve(ASSETS, 'World_ProjectAbyss.ldtk');

const STRATUM_ITEMTYPE_NEW_UID = 1074;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function read(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function line(s = '') { console.log(s); }
function info(s) { console.log('  ' + s); }
function ok(s) { console.log('  ✓ ' + s); }
function warn(s) { console.log('  ⚠ ' + s); }

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function stableStripEntity(e) {
  const x = deepClone(e);
  delete x.uid;
  if (Array.isArray(x.fieldDefs)) {
    x.fieldDefs = x.fieldDefs
      .map((f) => { const g = { ...f }; delete g.uid; return g; })
      .sort((p, q) => p.identifier.localeCompare(q.identifier));
  }
  return x;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

line('=== LDtk Multi-World Merge ===\n');
line('Sources:');
info('LAYOUT:   ' + relative(ROOT, LAYOUT_PATH) + '  (' + (statSync(LAYOUT_PATH).size / 1024 / 1024).toFixed(2) + ' MB)');
info('STRATUM:  ' + relative(ROOT, STRATUM_PATH) + '  (' + (statSync(STRATUM_PATH).size / 1024 / 1024).toFixed(2) + ' MB)');
line('');

const layout = read(LAYOUT_PATH);
const strata = read(STRATUM_PATH);
info('LAYOUT:  ' + layout.levels.length + ' levels, ' + layout.defs.entities.length + ' entities, ' + layout.defs.enums.length + ' enums');
info('STRATUM: ' + strata.levels.length + ' levels, ' + strata.defs.entities.length + ' entities, ' + strata.defs.enums.length + ' enums');
line('');

// Start from a deep clone of LAYOUT
const merged = deepClone(layout);

// ---------------------------------------------------------------------------
// 1. Layers — verify all STRATUM layers match LAYOUT
// ---------------------------------------------------------------------------
line('[1/6] Layers');
const layoutLayerUids = new Map(merged.defs.layers.map((l) => [l.uid, l.identifier]));
for (const l of strata.defs.layers) {
  if (!layoutLayerUids.has(l.uid)) {
    throw new Error('Unexpected unique layer in STRATUM: ' + l.identifier + ' (uid=' + l.uid + ')');
  }
  if (layoutLayerUids.get(l.uid) !== l.identifier) {
    warn('layer uid=' + l.uid + ' identifier drift: LAYOUT="' + layoutLayerUids.get(l.uid) + '" STRATUM="' + l.identifier + '"');
  }
}
ok('All ' + strata.defs.layers.length + ' STRATUM layers match LAYOUT');

// ---------------------------------------------------------------------------
// 2. Tilesets — merge unique
// ---------------------------------------------------------------------------
line('\n[2/6] Tilesets');
const layoutTilesetUids = new Set(merged.defs.tilesets.map((t) => t.uid));
let addedTilesets = 0;
for (const t of strata.defs.tilesets) {
  if (layoutTilesetUids.has(t.uid)) continue;
  merged.defs.tilesets.push(deepClone(t));
  layoutTilesetUids.add(t.uid);
  addedTilesets++;
  info('+ added tileset "' + t.identifier + '" (uid=' + t.uid + ')');
}
ok(addedTilesets === 0 ? 'No new tilesets (all identical)' : addedTilesets + ' tileset(s) added');

// ---------------------------------------------------------------------------
// 3. Entity defs
// ---------------------------------------------------------------------------
line('\n[3/6] Entity defs');
const layoutEntityByUid = new Map(merged.defs.entities.map((e) => [e.uid, e]));
let entAdded = 0;
let entDrift = 0;
for (const stratEnt of strata.defs.entities) {
  const existing = layoutEntityByUid.get(stratEnt.uid);
  if (!existing) {
    merged.defs.entities.push(deepClone(stratEnt));
    layoutEntityByUid.set(stratEnt.uid, stratEnt);
    entAdded++;
    info('+ ' + stratEnt.identifier + ' (uid=' + stratEnt.uid + ')');
    continue;
  }
  if (existing.identifier !== stratEnt.identifier) {
    warn('entity uid=' + stratEnt.uid + ' identifier collision: LAYOUT="' + existing.identifier + '" STRATUM="' + stratEnt.identifier + '" — keeping LAYOUT');
    entDrift++;
    continue;
  }
  if (!deepEqual(stableStripEntity(existing), stableStripEntity(stratEnt))) {
    warn('entity "' + existing.identifier + '" (uid=' + existing.uid + ') has field drift — keeping LAYOUT (STRATUM has 0 instances, cosmetic)');
    entDrift++;
  }
}
ok(entAdded + ' added, ' + entDrift + ' drift warning(s)');

// ---------------------------------------------------------------------------
// 4. Enums — handle uid=74 rename + uid=98 union
// ---------------------------------------------------------------------------
line('\n[4/6] Enums');
const layoutEnumByUid = new Map(merged.defs.enums.map((e) => [e.uid, e]));
let enumAdded = 0;
let enumUnioned = 0;
let enumRemapped = 0;
for (const stratEnum of strata.defs.enums) {
  const existing = layoutEnumByUid.get(stratEnum.uid);
  if (!existing) {
    merged.defs.enums.push(deepClone(stratEnum));
    layoutEnumByUid.set(stratEnum.uid, stratEnum);
    enumAdded++;
    info('+ ' + stratEnum.identifier + ' (uid=' + stratEnum.uid + ')');
    continue;
  }
  if (existing.identifier === stratEnum.identifier) {
    // Same name + uid → union values
    const existingIds = new Set(existing.values.map((v) => v.id));
    const newValues = stratEnum.values.filter((v) => !existingIds.has(v.id));
    if (newValues.length > 0) {
      existing.values.push(...newValues.map(deepClone));
      info('∪ ' + existing.identifier + ' (uid=' + existing.uid + '): +[' + newValues.map((v) => v.id).join(', ') + ']');
      enumUnioned++;
    } else {
      info('= ' + existing.identifier + ' (uid=' + existing.uid + '): values already identical');
    }
    continue;
  }
  // uid collision with different identifiers → rename STRATUM's with new uid
  if (stratEnum.uid === 74 && stratEnum.identifier === 'ItemType' && existing.identifier === 'ItemId') {
    const clone = deepClone(stratEnum);
    clone.uid = STRATUM_ITEMTYPE_NEW_UID;
    merged.defs.enums.push(clone);
    layoutEnumByUid.set(clone.uid, clone);
    info('↪ renamed STRATUM.ItemType uid 74 → ' + STRATUM_ITEMTYPE_NEW_UID + ' (identifier unchanged)');
    enumRemapped++;
    continue;
  }
  throw new Error('Unhandled enum uid collision: LAYOUT.' + existing.identifier + '(uid=' + existing.uid + ') vs STRATUM.' + stratEnum.identifier + '(uid=' + stratEnum.uid + ')');
}
ok(enumAdded + ' added, ' + enumUnioned + ' unioned, ' + enumRemapped + ' remapped');

// ---------------------------------------------------------------------------
// 5. LevelFields — keep both (different identifiers and uids)
// ---------------------------------------------------------------------------
line('\n[5/6] LevelFields');
merged.defs.levelFields = merged.defs.levelFields || [];
const layoutLevelFieldUids = new Set(merged.defs.levelFields.map((f) => f.uid));
let lfAdded = 0;
for (const stratField of strata.defs.levelFields || []) {
  if (layoutLevelFieldUids.has(stratField.uid)) {
    info('= levelField uid=' + stratField.uid + ' already present');
    continue;
  }
  merged.defs.levelFields.push(deepClone(stratField));
  layoutLevelFieldUids.add(stratField.uid);
  lfAdded++;
  info('+ ' + stratField.identifier + ' (uid=' + stratField.uid + ', type=' + stratField.__type + ')');
}
ok(lfAdded + ' added');

// ---------------------------------------------------------------------------
// 6. Build worlds[] and clear root levels[]
// ---------------------------------------------------------------------------
line('\n[6/6] Worlds');

function worldEntryFrom(project, identifier, iid) {
  return {
    iid,
    identifier,
    defaultLevelWidth: project.defaultLevelWidth,
    defaultLevelHeight: project.defaultLevelHeight,
    worldGridWidth: project.worldGridWidth,
    worldGridHeight: project.worldGridHeight,
    worldLayout: project.worldLayout,
    levels: deepClone(project.levels),
  };
}

// CRITICAL: Overworld must reuse LAYOUT's dummyWorldIid so the existing
// `toc` (table of contents) entity references remain valid after the merge.
// If we generate a new iid here, every toc entry's worldIid will be stale
// and LDtk's editor will refuse to open the project.
const overworldIid = layout.dummyWorldIid;
const itemStratumIid = randomUUID();

merged.worlds = [
  worldEntryFrom(layout, 'Overworld', overworldIid),
  worldEntryFrom(strata, 'ItemStratum', itemStratumIid),
];
merged.levels = [];

// Multi-world mode: root layout/grid fields must be cleared so LDtk uses
// per-world settings instead of root settings. Each world entry already
// carries its own worldLayout/worldGridWidth/worldGridHeight.
merged.worldLayout = null;
merged.worldGridWidth = -1;
merged.worldGridHeight = -1;

// Enable the MultiWorlds flag so LDtk recognises this as a multi-world project.
merged.flags = merged.flags || [];
if (!merged.flags.includes('MultiWorlds')) {
  merged.flags.push('MultiWorlds');
}

info('World 0: Overworld   — ' + merged.worlds[0].levels.length + ' levels, worldLayout=' + merged.worlds[0].worldLayout);
info('World 1: ItemStratum — ' + merged.worlds[1].levels.length + ' levels, worldLayout=' + merged.worlds[1].worldLayout);
ok('Multi-world structure built');

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
line('\nWriting output...');
const json = JSON.stringify(merged);
writeFileSync(OUTPUT_PATH, json);
const sizeMB = (statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2);
ok('Wrote ' + relative(ROOT, OUTPUT_PATH) + ' (' + sizeMB + ' MB)');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
line('\n=== Merge Summary ===');
info('Entities:     +' + entAdded + ' added, ' + entDrift + ' drift warning(s)');
info('Enums:        +' + enumAdded + ' added, ' + enumUnioned + ' unioned, ' + enumRemapped + ' remapped');
info('LevelFields:  +' + lfAdded + ' added');
info('Tilesets:     +' + addedTilesets + ' added');
info('Worlds:       ' + merged.worlds.length + ' (' + merged.worlds.reduce((s, w) => s + w.levels.length, 0) + ' total levels)');
info('Output size:  ' + sizeMB + ' MB');
line('');
line('Next steps:');
info('1. Open the merged file in LDtk editor to verify both worlds load.');
info('2. Update LdtkLoader + scenes to use the merged file (Phase 3).');
line('');
