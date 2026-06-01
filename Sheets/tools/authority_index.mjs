#!/usr/bin/env node
// authority_index.mjs — 문서 권위 계층 역인덱스 + 전파 큐 (T-07 §7)
//
// 각 문서 헤더의 다음 선언을 파싱한다:
//   > **준거 상위 (Authority):** T-03, D-01, D-20
//
// 사용:
//   node Sheets/tools/authority_index.mjs            # 부모→자식 인덱스 + 선언 누락 경고
//   node Sheets/tools/authority_index.mjs --changed D-20 T-03   # 지정 상위의 재검증 큐
//   node Sheets/tools/authority_index.mjs --git      # git 변경 문서 기준 재검증 큐
//
// 출력: Layer 6(계층 정합) 검증 대상 목록. 의미 검증은 에이전트가 수행.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const DOCS = join(ROOT, 'Documents');
const ID_RE = /문서\s*ID[:：]\s*\**\s*([A-Z][A-Z0-9-]*)/;
const AUTH_RE = /준거\s*상위\s*\(Authority\)[:：]\s*\**\s*([^\n*]+)/;

// Document_Index 에서 path(Documents 기준) -> ID 매핑 (인라인 ID 헤더 없는 문서 보강)
function parseIndex() {
  const map = new Map();
  try {
    const idx = readFileSync(join(DOCS, 'Terms', 'Document_Index.md'), 'utf8');
    const re = /\|\s*~*\s*([A-Z][A-Z0-9-]+)\s*~*\s*\|[^|]*\|\s*`([^`]+\.md)`/g;
    let m;
    while ((m = re.exec(idx))) {
      map.set(m[2].replace(/^Documents\//, ''), m[1]);
    }
  } catch { /* ignore */ }
  return map;
}
const indexMap = parseIndex();

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '_archive' || name === '_Archive' || name === 'node_modules') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

// 1. 전 문서 파싱
const files = walk(DOCS);
const byId = new Map();      // id -> { id, path, parents:[] }
const noDecl = [];           // 선언 없는 문서
const pathToId = new Map();

for (const f of files) {
  const head = readFileSync(f, 'utf8').slice(0, 1500);
  const idM = head.match(ID_RE);
  const authM = head.match(AUTH_RE);
  const relDocs = relative(DOCS, f).replace(/\\/g, '/');
  const id = indexMap.get(relDocs) || (idM ? idM[1] : null);
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  const parents = authM
    ? authM[1].split(',').map((s) => s.trim().replace(/`/g, '')).filter(Boolean)
    : [];
  if (id) { byId.set(id, { id, path: rel, parents }); pathToId.set(rel, id); }
  if (!authM) noDecl.push({ id, path: rel });
}

// 2. 역인덱스 parent -> [children]
const children = new Map();
for (const { id, parents } of byId.values()) {
  for (const p of parents) {
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(id);
  }
}

// 3. 하위 트리 전개 (BFS)
function descendants(roots) {
  const seen = new Set(), queue = [...roots];
  while (queue.length) {
    const cur = queue.shift();
    for (const c of children.get(cur) || []) {
      if (!seen.has(c)) { seen.add(c); queue.push(c); }
    }
  }
  return [...seen];
}

const args = process.argv.slice(2);

if (args.includes('--git')) {
  let changed = [];
  try {
    changed = execSync('git diff --name-only HEAD', { cwd: ROOT })
      .toString().split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { /* ignore */ }
  const changedIds = changed.map((p) => pathToId.get(p)).filter(Boolean);
  const queue = descendants(changedIds);
  console.log('=== Layer 6 재검증 큐 (git 변경 상위 기준) ===');
  console.log('변경 상위:', changedIds.join(', ') || '(없음)');
  console.log('재검증 하위:', queue.join(', ') || '(없음)');
  process.exit(0);
}

const ci = args.indexOf('--changed');
if (ci >= 0) {
  const roots = args.slice(ci + 1).filter((a) => !a.startsWith('--'));
  const queue = descendants(roots);
  console.log('=== Layer 6 재검증 큐 ===');
  console.log('변경 상위:', roots.join(', '));
  console.log('재검증 하위:', queue.join(', ') || '(없음)');
  process.exit(0);
}

// 기본: 인덱스 + 누락 경고
console.log('=== 권위 역인덱스 (parent -> children) ===');
for (const [p, cs] of [...children.entries()].sort()) {
  console.log(`  ${p}  ->  ${cs.sort().join(', ')}`);
}
console.log(`\n=== 통계 ===`);
console.log(`  문서(ID 보유): ${byId.size}`);
console.log(`  준거 선언 보유: ${byId.size - [...byId.values()].filter((d) => d.parents.length === 0).length}`);
console.log(`  준거 선언 누락(권위 노드 제외 권장): ${noDecl.length}`);
const showMissing = noDecl.filter((d) => d.id && !/^(T-0[1-7]|CLAUDE)/.test(d.id)).slice(0, 30);
if (showMissing.length) {
  console.log('  -- 선언 누락 문서(상위 30) --');
  for (const d of showMissing) console.log(`     ${d.id || '(ID없음)'}  ${d.path}`);
}
