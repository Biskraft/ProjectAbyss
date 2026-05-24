#!/usr/bin/env node
/**
 * remove-anvil-disable-after-use.mjs
 *
 * LDtk Anvil entity 의 DisableAfterUse field 를 entity def + 모든 instance 에서
 * 제거. Builder_Level_2 의 RetireAfterFirstBoss 를 true 로 이전.
 *
 *   node game/scripts/remove-anvil-disable-after-use.mjs --apply
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LDTK_PATH = path.resolve(__dirname, '..', 'public', 'assets', 'World_ProjectAbyss.ldtk');

const OBSOLETE = 'DisableAfterUse';
const RETIRE = 'RetireAfterFirstBoss';
const SET_RETIRE_TRUE = new Set(['Builder_Level_2']);

if (!process.argv.includes('--apply')) {
  console.error('Usage: --apply');
  process.exit(1);
}

const raw = fs.readFileSync(LDTK_PATH, 'utf8');
const data = JSON.parse(raw);

// 1) entity def 에서 DisableAfterUse fieldDef 제거
let defRemoved = 0;
for (const ed of data.defs.entities) {
  if (ed.identifier !== 'Anvil') continue;
  const before = ed.fieldDefs.length;
  ed.fieldDefs = ed.fieldDefs.filter(fd => fd.identifier !== OBSOLETE);
  defRemoved += before - ed.fieldDefs.length;
}

// 2) 모든 instance: DisableAfterUse fi 제거 + (요청 레벨이면) RetireAfterFirstBoss=true
let instRemoved = 0;
let retireSetTrue = 0;
for (const w of data.worlds) {
  for (const lv of w.levels) {
    const shouldRetire = SET_RETIRE_TRUE.has(lv.identifier);
    for (const layer of lv.layerInstances ?? []) {
      for (const ent of layer.entityInstances ?? []) {
        if (ent.__identifier !== 'Anvil') continue;
        const before = ent.fieldInstances.length;
        ent.fieldInstances = ent.fieldInstances.filter(fi => fi.__identifier !== OBSOLETE);
        instRemoved += before - ent.fieldInstances.length;
        if (shouldRetire) {
          const retireFi = ent.fieldInstances.find(fi => fi.__identifier === RETIRE);
          if (retireFi && retireFi.__value !== true) {
            retireFi.__value = true;
            retireSetTrue++;
          }
        }
      }
    }
  }
}

console.log(`entity-def fields removed: ${defRemoved}`);
console.log(`instance fields removed:   ${instRemoved}`);
console.log(`retire set true:           ${retireSetTrue}`);

const backup = LDTK_PATH + '.bak-remove-disable';
if (!fs.existsSync(backup)) {
  fs.copyFileSync(LDTK_PATH, backup);
  console.log(`Backup written: ${backup}`);
}
const indent = raw.includes('\n\t') ? '\t' : 2;
fs.writeFileSync(LDTK_PATH, JSON.stringify(data, null, indent));
console.log('LDtk file written.');
