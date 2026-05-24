#!/usr/bin/env node
/**
 * rename-anvil-field.mjs
 *
 * LDtk Anvil entity 의 무명 `Boolean` field 를 `DisableAfterUse` 로 rename.
 * 동시에 'FirstAnvil' / 'Builder_Level_2' 의 anvil 인스턴스 값을 true 로 설정.
 *
 *   node game/scripts/rename-anvil-field.mjs --apply
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LDTK_PATH = path.resolve(__dirname, '..', 'public', 'assets', 'World_ProjectAbyss.ldtk');

const OLD_ID = 'Boolean';
const NEW_ID = 'DisableAfterUse';
const TRUE_LEVELS = new Set(['FirstAnvil', 'Builder_Level_2']);

const APPLY = process.argv.includes('--apply');
if (!APPLY) {
  console.error('Usage: --apply');
  process.exit(1);
}

const raw = fs.readFileSync(LDTK_PATH, 'utf8');
const data = JSON.parse(raw);

// 1) entity definition fieldDefs rename
let entityDefHit = 0;
for (const ed of data.defs.entities) {
  if (ed.identifier !== 'Anvil') continue;
  for (const fd of ed.fieldDefs) {
    if (fd.identifier === OLD_ID) {
      fd.identifier = NEW_ID;
      entityDefHit++;
    }
  }
}

// 2) instances rename + value set
let instRename = 0;
let instTrue = 0;
for (const w of data.worlds) {
  for (const lv of w.levels) {
    const shouldBeTrue = TRUE_LEVELS.has(lv.identifier);
    for (const layer of lv.layerInstances ?? []) {
      for (const ent of layer.entityInstances ?? []) {
        if (ent.__identifier !== 'Anvil') continue;
        for (const fi of ent.fieldInstances ?? []) {
          if (fi.__identifier === OLD_ID) {
            fi.__identifier = NEW_ID;
            instRename++;
            if (shouldBeTrue && fi.__value !== true) {
              fi.__value = true;
              instTrue++;
            }
          }
        }
      }
    }
  }
}

console.log(`entity-def renames:  ${entityDefHit}`);
console.log(`instance renames:    ${instRename}`);
console.log(`instances set true:  ${instTrue}`);

const backup = LDTK_PATH + '.bak-anvil-field';
if (!fs.existsSync(backup)) {
  fs.copyFileSync(LDTK_PATH, backup);
  console.log(`Backup written: ${backup}`);
}
const indent = raw.includes('\n\t') ? '\t' : 2;
fs.writeFileSync(LDTK_PATH, JSON.stringify(data, null, indent));
console.log('LDtk file written.');
