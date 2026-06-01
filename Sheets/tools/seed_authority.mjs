#!/usr/bin/env node
// seed_authority.mjs — 미선언 문서에 준거 상위(Authority) 선언 일괄 시딩 (T-07 §10 단계 2)
// 기본: 드라이런(목록만). --apply: 실제 파일 수정.
// 제외: Research(RES-*), _archive, ~~폐기~~ ID, 이미 선언된 문서.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DOCS = join(ROOT, 'Documents');
const APPLY = process.argv.includes('--apply');

// ID 접두사 → 권위 부모 (T-03 Glossary 는 보편 부모)
function parentsFor(id) {
  const b = ['T-03'];
  if (id.startsWith('SYS-WLD')) return [...b, 'D-20', 'D-04'];
  if (id.startsWith('SYS-IW') || id.startsWith('SYS-INC')) return [...b, 'D-05'];
  if (id.startsWith('SYS-CMB') || id.startsWith('SYS-MON') || id.startsWith('SYS-3C') || id.startsWith('SYS-PLR')) return [...b, 'D-09'];
  if (id.startsWith('SYS-LVL') || id.startsWith('SYS-EQP')) return [...b, 'D-11'];
  if (id.startsWith('SYS-ECO')) return [...b, 'D-07'];
  if (id.startsWith('SYS-MP') || id.startsWith('SYS-COOP')) return [...b, 'D-06'];
  if (id.startsWith('CNT')) return [...b, 'D-20'];
  return b; // UI / SYS-TEC / SYS-TEL / D-* / 기타 → Glossary 만
}

// Document_Index 에서 활성 ID → path
const idx = readFileSync(join(DOCS, 'Terms', 'Document_Index.md'), 'utf8');
const re = /\|\s*(~~)?\s*([A-Z][A-Z0-9-]+)\s*(~~)?\s*\|[^|]*\|\s*`([^`]+\.md)`/g;
const seen = new Set();
const targets = [];
let m;
while ((m = re.exec(idx))) {
  const archived = !!m[1];
  const id = m[2];
  const p = m[4].replace(/^Documents\//, '');
  if (archived || id.startsWith('RES')) continue;
  if (p.includes('_archive') || p.includes('_Archive')) continue;
  if (seen.has(id)) continue;
  seen.add(id);
  const full = join(DOCS, p);
  if (!existsSync(full)) continue;
  targets.push({ id, p, full });
}

let seeded = 0, skipped = 0;
const scope = [];
for (const t of targets) {
  const txt = readFileSync(t.full, 'utf8');
  if (/준거\s*상위\s*\(Authority\)/.test(txt)) { skipped++; continue; }
  const parents = parentsFor(t.id).filter((x) => x !== t.id);
  if (parents.length === 0) { skipped++; continue; } // 최상위(T-03 등)는 부모 없음
  const line = `> **준거 상위 (Authority):** ${parents.join(', ')}`;
  const lines = txt.split('\n');
  const ti = lines.findIndex((l) => /^#\s/.test(l));
  if (ti < 0) { skipped++; continue; }
  let j = ti + 1;
  while (j < lines.length && lines[j].trim() === '') j++;
  if (j < lines.length && lines[j].startsWith('> ')) lines.splice(j, 0, line);
  else lines.splice(ti + 1, 0, '', line);
  scope.push(`  ${t.id}  <-  ${parents.join(', ')}`);
  if (APPLY) writeFileSync(t.full, lines.join('\n'));
  seeded++;
}

console.log((APPLY ? '[APPLIED]' : '[DRY RUN]') + ` seed=${seeded}  skip(declared)=${skipped}  targets=${targets.length}`);
console.log(scope.join('\n'));
