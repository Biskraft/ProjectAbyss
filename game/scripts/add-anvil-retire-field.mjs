#!/usr/bin/env node
/**
 * add-anvil-retire-field.mjs
 *
 * LDtk Anvil entity 에 새 Bool field `RetireAfterFirstBoss` 추가.
 * FirstAnvil 인스턴스만 true, 나머지는 false.
 *
 *   node game/scripts/add-anvil-retire-field.mjs --apply
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LDTK_PATH = path.resolve(__dirname, '..', 'public', 'assets', 'World_ProjectAbyss.ldtk');

const NEW_FIELD = 'RetireAfterFirstBoss';
const TRUE_LEVELS = new Set(['FirstAnvil']);

if (!process.argv.includes('--apply')) {
  console.error('Usage: --apply');
  process.exit(1);
}

const raw = fs.readFileSync(LDTK_PATH, 'utf8');
const data = JSON.parse(raw);

// 전역 max uid 계산 (충돌 회피용)
function collectUids(node, out) {
  if (Array.isArray(node)) { for (const c of node) collectUids(c, out); return; }
  if (node && typeof node === 'object') {
    if (typeof node.uid === 'number') out.push(node.uid);
    for (const k of Object.keys(node)) collectUids(node[k], out);
  }
}
const uids = [];
collectUids(data, uids);
const newUid = Math.max(...uids) + 1;
console.log(`Allocating new uid: ${newUid}`);

// 1) entity def 에 field 추가
let defAdded = false;
for (const ed of data.defs.entities) {
  if (ed.identifier !== 'Anvil') continue;
  if (ed.fieldDefs.some(fd => fd.identifier === NEW_FIELD)) {
    console.log('Field already exists in entity def, skipping def add.');
    break;
  }
  ed.fieldDefs.push({
    identifier: NEW_FIELD,
    doc: 'true 이면 첫 IW 보스 클리어 후 영구 retire',
    __type: 'Bool',
    uid: newUid,
    type: 'F_Bool',
    isArray: false,
    canBeNull: false,
    arrayMinLength: null,
    arrayMaxLength: null,
    editorDisplayMode: 'Hidden',
    editorDisplayScale: 1,
    editorDisplayPos: 'Above',
    editorLinkStyle: 'StraightArrow',
    editorDisplayColor: null,
    editorAlwaysShow: false,
    editorShowInWorld: true,
    editorCutLongValues: true,
    editorTextSuffix: null,
    editorTextPrefix: null,
    useForSmartColor: false,
    exportToToc: false,
    searchable: false,
    min: null,
    max: null,
    regex: null,
    acceptFileTypes: null,
    defaultOverride: null,
    textLanguageMode: null,
    symmetricalRef: false,
    autoChainRef: true,
    allowOutOfLevelRef: true,
    allowedRefs: 'OnlySame',
    allowedRefsEntityUid: null,
    allowedRefTags: [],
    tilesetUid: null,
  });
  defAdded = true;
}
console.log(`entity-def field added: ${defAdded}`);

// 2) 모든 anvil instance 에 field 추가
let instAdded = 0;
let instTrue = 0;
for (const w of data.worlds) {
  for (const lv of w.levels) {
    const shouldBeTrue = TRUE_LEVELS.has(lv.identifier);
    for (const layer of lv.layerInstances ?? []) {
      for (const ent of layer.entityInstances ?? []) {
        if (ent.__identifier !== 'Anvil') continue;
        if (ent.fieldInstances.some(fi => fi.__identifier === NEW_FIELD)) continue;
        ent.fieldInstances.push({
          __identifier: NEW_FIELD,
          __type: 'Bool',
          __value: shouldBeTrue,
          __tile: null,
          defUid: newUid,
          realEditorValues: [],
        });
        instAdded++;
        if (shouldBeTrue) instTrue++;
      }
    }
  }
}
console.log(`instance field added: ${instAdded}`);
console.log(`instances set true:   ${instTrue}`);

const backup = LDTK_PATH + '.bak-anvil-retire';
if (!fs.existsSync(backup)) {
  fs.copyFileSync(LDTK_PATH, backup);
  console.log(`Backup written: ${backup}`);
}
const indent = raw.includes('\n\t') ? '\t' : 2;
fs.writeFileSync(LDTK_PATH, JSON.stringify(data, null, indent));
console.log('LDtk file written.');
