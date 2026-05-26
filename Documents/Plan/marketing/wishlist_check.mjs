/**
 * Steam 위시리스트 추적 — 브라우저 열기 + 수동 입력
 * 사용법: node wishlist_check.mjs
 *
 * 1. Chromium으로 Steamworks 위시리스트 페이지를 엽니다.
 * 2. 숫자를 확인 후 터미널에 입력하면 calendar.json 자동 갱신.
 */

import pkg from 'file:///C:/Users/Victor/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const { chromium } = pkg;
const __dir = dirname(fileURLToPath(import.meta.url));
const CALENDAR_PATH = resolve(__dir, 'calendar.json');
const APP_ID = '4756940';
const USER_DATA_DIR = resolve(__dir, '.steamworks_session');
const WISHLIST_URL = `https://partner.steamgames.com/apps/wishlistreport/${APP_ID}`;
const TARGET = 10000;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

(async () => {
  console.log('Steamworks 위시리스트 페이지를 엽니다...');

  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    executablePath: 'C:/Users/Victor/AppData/Local/ms-playwright/chromium-1224/chrome-win64/chrome.exe',
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  try {
    await page.goto(WISHLIST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (page.url().includes('login') || page.url().includes('steamcommunity')) {
      console.log('\n⚠ Steam 로그인이 필요합니다. 브라우저에서 로그인하세요.');
      console.log('로그인 완료 후 아무 키나 누르세요...');
      await ask('');
      await page.goto(WISHLIST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    console.log(`\n브라우저에서 위시리스트 수를 확인하세요.`);
    console.log(`페이지: ${WISHLIST_URL}\n`);
  } catch (e) {
    console.log('페이지 열기 실패. 브라우저에서 직접 이동하세요:');
    console.log(WISHLIST_URL);
  }

  const input = await ask('위시리스트 수 입력 (숫자만, 종료: q): ');
  await browser.close();
  rl.close();

  if (input.trim().toLowerCase() === 'q') {
    console.log('종료.');
    process.exit(0);
  }

  const count = parseInt(input.replace(/[,\s]/g, ''), 10);
  if (isNaN(count)) {
    console.error('유효한 숫자가 아닙니다.');
    process.exit(1);
  }

  const cal = JSON.parse(readFileSync(CALENDAR_PATH, 'utf-8'));
  const prev = cal.meta.wishlist_count ?? 0;
  cal.meta.wishlist_count = count;
  cal.meta.last_updated = new Date().toISOString().slice(0, 10);
  writeFileSync(CALENDAR_PATH, JSON.stringify(cal, null, 2), 'utf-8');

  const diff = count - prev;
  const pct = ((count / TARGET) * 100).toFixed(1);
  const filled = Math.min(20, Math.floor((count / TARGET) * 20));
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  const sign = diff >= 0 ? '+' : '';

  console.log(`\n[${bar}] ${count.toLocaleString()} / ${TARGET.toLocaleString()} (${pct}%)`);
  if (prev > 0) console.log(`변화: ${sign}${diff.toLocaleString()} (이전: ${prev.toLocaleString()})`);
  console.log('calendar.json 갱신 완료.');
})();
