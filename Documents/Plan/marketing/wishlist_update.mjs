/**
 * Steam 위시리스트 수동 업데이트
 * 사용법: node wishlist_update.mjs <숫자>
 * 예시:  node wishlist_update.mjs 142
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const CALENDAR_PATH = resolve(__dir, 'calendar.json');
const TARGET = 10000;

const arg = process.argv[2];
if (!arg || isNaN(Number(arg))) {
  console.error('사용법: node wishlist_update.mjs <숫자>');
  process.exit(1);
}

const count = parseInt(arg, 10);
const cal = JSON.parse(readFileSync(CALENDAR_PATH, 'utf-8'));
const prev = cal.meta.wishlist_count ?? 0;

cal.meta.wishlist_count = count;
cal.meta.last_updated = new Date().toISOString().slice(0, 10);
writeFileSync(CALENDAR_PATH, JSON.stringify(cal, null, 2), 'utf-8');

const diff = count - prev;
const pct = ((count / TARGET) * 100).toFixed(1);
const filled = Math.min(20, Math.floor((count / TARGET) * 20));
const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);

console.log(`\n위시리스트 업데이트 완료`);
console.log(`[${bar}] ${count.toLocaleString()} / ${TARGET.toLocaleString()} (${pct}%)`);
if (prev > 0) {
  const sign = diff >= 0 ? '+' : '';
  console.log(`변화: ${sign}${diff.toLocaleString()} (이전: ${prev.toLocaleString()})`);
}
console.log(`calendar.json 저장됨`);
