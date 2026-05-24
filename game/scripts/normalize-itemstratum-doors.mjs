#!/usr/bin/env node
/**
 * normalize-itemstratum-doors.mjs
 *
 * ItemStratum LDtk 입구를 6 cells 표준으로 일괄 정규화.
 *
 * 표준 좌표 (IW_DOOR_V_WIDTH=6, IW_DOOR_H_HEIGHT=6, IW_DOOR_FLOOR_ROW=18):
 *   - U (row 0):       cols 21-26 open, 나머지 wall(1)
 *   - D (row H-1):     cols 21-26 open
 *   - L (col 0):       rows 12-17 open
 *   - R (col W-1):     rows 12-17 open
 *
 * 어느 면에 입구가 있는지는 *기존 0-run* 으로 추론:
 *   - 0-run 길이 ≥ MIN_RUN(=3) → 입구로 간주 → 표준 위치로 정규화
 *   - 0-run 없음 → 닫힌 면, 그대로 유지
 *
 * autoLayerTiles 는 영향 영역(외곽 4 cells 내) 의 tile 을 제거.
 * 사용자가 LDtk Editor 에서 한 번 열고 저장하면 Auto Rule 이 재생성.
 *
 * Usage:
 *   node game/scripts/normalize-itemstratum-doors.mjs --dry-run
 *   node game/scripts/normalize-itemstratum-doors.mjs --apply
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LDTK_PATH = path.resolve(__dirname, '..', 'public', 'assets', 'World_ProjectAbyss.ldtk');

const MODE_DRY = process.argv.includes('--dry-run');
const MODE_APPLY = process.argv.includes('--apply');
if (!MODE_DRY && !MODE_APPLY) {
  console.error('Usage: --dry-run | --apply');
  process.exit(1);
}

// 표준 좌표
const DOOR_V_WIDTH = 6;  // U/D
const DOOR_H_HEIGHT = 6; // L/R
const FLOOR_ROW = 18;
const MIN_RUN = 3; // 0-run >= 3 cells 면 입구로 간주

// helpers
function csvToGrid(csv, W, H) {
  const g = [];
  for (let r = 0; r < H; r++) g.push(csv.slice(r * W, (r + 1) * W));
  return g;
}
function gridToCsv(g) {
  const flat = [];
  for (const row of g) for (const v of row) flat.push(v);
  return flat;
}
function findOpenRun(arr) {
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 0) {
      if (curLen === 0) curStart = i;
      curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else { curLen = 0; }
  }
  return { start: bestStart, len: bestLen };
}

// 변환: 가로 면(U/D, row 고정), 세로 면(L/R, col 고정) 별 별도 처리
function normalizeRow(g, W, row, label) {
  const arr = g[row];
  const run = findOpenRun(arr);
  if (run.len < MIN_RUN) return { changed: false, reason: 'closed face (no run)' };
  // 새 표준: cols 21-26 open, 나머지 wall(1)
  const newStart = Math.floor(W / 2) - Math.floor(DOOR_V_WIDTH / 2); // 24-3=21
  const newEnd = newStart + DOOR_V_WIDTH; // exclusive, 27
  let dirty = false;
  for (let c = 0; c < W; c++) {
    const target = (c >= newStart && c < newEnd) ? 0 : 1;
    if (arr[c] !== target) { arr[c] = target; dirty = true; }
  }
  return {
    changed: dirty,
    label, row,
    oldRun: { start: run.start, len: run.len },
    newRun: { start: newStart, len: DOOR_V_WIDTH },
  };
}
function normalizeCol(g, H, col, label) {
  const arr = g.map(r => r[col]);
  const run = findOpenRun(arr);
  if (run.len < MIN_RUN) return { changed: false, reason: 'closed face (no run)' };
  // 새 표준: rows 12-17 open (FLOOR_ROW - DOOR_H_HEIGHT = 12, FLOOR_ROW = 18 exclusive)
  const newStart = FLOOR_ROW - DOOR_H_HEIGHT; // 12
  const newEnd = FLOOR_ROW; // exclusive, 18
  let dirty = false;
  for (let r = 0; r < H; r++) {
    const target = (r >= newStart && r < newEnd) ? 0 : 1;
    if (g[r][col] !== target) { g[r][col] = target; dirty = true; }
  }
  return {
    changed: dirty,
    label, col,
    oldRun: { start: run.start, len: run.len },
    newRun: { start: newStart, len: DOOR_H_HEIGHT },
  };
}

function pruneAutoLayerTilesAtFace(tiles, face, W, H, gridSize) {
  // 영향 영역: 외곽 1 cell strip (row/col) 만 정리.
  // LDtk Auto Rule 이 *neighbor* 변화에 반응해 인접 4-5 cells 까지 재계산하므로
  // 외곽 strip 만 비워도 충분. 더 깊이 비우면 인테리어 wall 도 사라짐.
  // face: 'U' | 'D' | 'L' | 'R'
  const cellsToClear = [];
  const D = 4; // IW_DOOR_DEPTH — 외곽 strip 4 cells 까지 정리 (door depth 와 동일)
  if (face === 'U') {
    for (let r = 0; r < D; r++) for (let c = 0; c < W; c++) cellsToClear.push([c, r]);
  } else if (face === 'D') {
    for (let r = H - D; r < H; r++) for (let c = 0; c < W; c++) cellsToClear.push([c, r]);
  } else if (face === 'L') {
    for (let c = 0; c < D; c++) for (let r = 0; r < H; r++) cellsToClear.push([c, r]);
  } else if (face === 'R') {
    for (let c = W - D; c < W; c++) for (let r = 0; r < H; r++) cellsToClear.push([c, r]);
  }
  const clearSet = new Set(cellsToClear.map(([c, r]) => `${c},${r}`));
  return tiles.filter(t => {
    const c = Math.floor(t.px[0] / gridSize);
    const r = Math.floor(t.px[1] / gridSize);
    return !clearSet.has(`${c},${r}`);
  });
}

// --- main ---
console.log(`[normalize-doors] mode=${MODE_DRY ? 'dry-run' : 'APPLY'}`);
console.log(`[normalize-doors] file=${LDTK_PATH}`);

const raw = fs.readFileSync(LDTK_PATH, 'utf8');
const data = JSON.parse(raw);
const world = data.worlds.find(w => w.identifier === 'ItemStratum');
if (!world) { console.error('ItemStratum world not found'); process.exit(1); }

const stats = {
  levels: world.levels.length,
  facesChanged: 0,
  facesUnchanged: 0,
  byLevel: [],
  nonStandard: [],
};

for (const lv of world.levels) {
  const layer = lv.layerInstances.find(l => l.__identifier === 'Collisions');
  if (!layer) continue;
  const W = layer.__cWid, H = layer.__cHei;
  const grid = csvToGrid(layer.intGridCsv, W, H);

  const results = [];
  const faces = [
    { face: 'U', op: () => normalizeRow(grid, W, 0, 'U') },
    { face: 'D', op: () => normalizeRow(grid, W, H - 1, 'D') },
    { face: 'L', op: () => normalizeCol(grid, H, 0, 'L') },
    { face: 'R', op: () => normalizeCol(grid, H, W - 1, 'R') },
  ];
  for (const { face, op } of faces) {
    const res = op();
    if (res.changed) {
      stats.facesChanged++;
      results.push({ face, oldLen: res.oldRun.len, newLen: res.newRun.len });
      // mark non-standard if old run was 40/48/13 etc.
      if (res.oldRun.len > 12 || (res.oldRun.len > 0 && res.oldRun.len < 4 && res.oldRun.len !== DOOR_V_WIDTH)) {
        stats.nonStandard.push({ level: lv.identifier, face, oldLen: res.oldRun.len });
      }
      // prune autoLayerTiles at this face
      layer.autoLayerTiles = pruneAutoLayerTilesAtFace(layer.autoLayerTiles, face, W, H, layer.__gridSize);
    } else {
      stats.facesUnchanged++;
    }
  }
  if (results.length > 0) {
    stats.byLevel.push({ level: lv.identifier, faces: results });
  }
  // write back CSV
  layer.intGridCsv = gridToCsv(grid);
}

console.log('');
console.log('========== SUMMARY ==========');
console.log(`Levels processed:    ${stats.levels}`);
console.log(`Faces changed:       ${stats.facesChanged}`);
console.log(`Faces unchanged:     ${stats.facesUnchanged}  (already 6 or closed)`);
console.log(`Non-standard faces:  ${stats.nonStandard.length}  (oldLen > 12 — likely boss/plaza wide opens)`);
console.log('');
if (stats.nonStandard.length > 0) {
  console.log('--- Non-standard openings collapsed to 6 cells ---');
  for (const ns of stats.nonStandard) console.log(`  ${ns.level} ${ns.face} oldLen=${ns.oldLen}`);
  console.log('');
}
console.log('--- Per-level changes (first 10) ---');
for (const lv of stats.byLevel.slice(0, 10)) {
  console.log(`  ${lv.level}: ${lv.faces.map(f => `${f.face}(${f.oldLen}→${f.newLen})`).join(', ')}`);
}
if (stats.byLevel.length > 10) console.log(`  ... +${stats.byLevel.length - 10} more`);

if (MODE_APPLY) {
  const backup = LDTK_PATH + '.bak-doors6';
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(LDTK_PATH, backup);
    console.log(`\nBackup written: ${backup}`);
  } else {
    console.log(`\nBackup already exists, NOT overwriting: ${backup}`);
  }
  // LDtk uses tab indent. Preserve by detecting from original.
  const indent = raw.includes('\n\t') ? '\t' : 2;
  fs.writeFileSync(LDTK_PATH, JSON.stringify(data, null, indent));
  console.log('LDtk file written.');
  console.log('\nNEXT STEP: LDtk Editor 에서 World_ProjectAbyss.ldtk 를 한 번 열고');
  console.log('  - 메뉴 Project > "Re-render all auto-layers" (또는 단순 저장) 실행');
  console.log('  - autoLayerTiles 가 새 IntGrid 에 맞춰 자동 재생성됩니다.');
} else {
  console.log('\n[dry-run] No file written. Re-run with --apply to commit.');
}
