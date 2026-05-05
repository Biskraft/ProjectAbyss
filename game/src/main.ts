import { Game } from './Game';
import { WorldScene } from '@scenes/WorldScene';
import { TitleScene } from '@scenes/TitleScene';
import { installBitmapFont } from '@ui/fonts';
import { loadBundleOnce } from '@data/assetBundles';
import { SFX } from '@audio/Sfx';

import { trackGameStart, trackGameLoaded } from '@utils/Analytics';

const bootStartTime = Date.now();

function showStatus(msg: string): void {
  const el = document.getElementById('load-status');
  if (el) el.textContent = msg;
}

async function waitForFont(family: string, timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  // Wait for all CSS-triggered font downloads to finish
  await document.fonts.ready;
  // If already available, return immediately
  if (document.fonts.check(`8px "${family}"`)) return true;
  // Explicitly request the font load
  try {
    await Promise.race([
      document.fonts.load(`8px "${family}"`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs - (Date.now() - start))
      ),
    ]);
  } catch { /* timeout */ }
  return document.fonts.check(`8px "${family}"`);
}

try {
  showStatus('Loading fonts...');
  const fontLoaded = await waitForFont('Press Start 2P');
  if (!fontLoaded) {
    console.warn('Press Start 2P font failed to load, using fallback');
  }
  // Google Fonts: Cinzel (title), Rajdhani (in-game UI)
  // Must explicitly load with correct weight so browser fetches the right files
  showStatus('Loading web fonts...');
  await Promise.all([
    document.fonts.load('900 48px "Cinzel"').catch(() => {}),
    document.fonts.load('700 16px "Rajdhani"').catch(() => {}),
    document.fonts.load('500 16px "Rajdhani"').catch(() => {}),
  ]);
  // Wait for all pending font downloads to settle
  await document.fonts.ready;

  showStatus('Initializing game...');
  const game = new Game();
  await game.init();

  // Install BitmapFont at native resolution (must be after game.init for uiScale)
  installBitmapFont(game.uiScale);

  // Prefetch core asset bundle in parallel — TitleScene 진입과 동시에 다운로드
  // 가 진행되어 첫 게임 진입 시 hitch 가 줄어든다 (pixijs-references P1).
  // fire-and-forget: 실패해도 entity 측 Assets.load 가 개별 fallback 처리.
  void loadBundleOnce('core');

  // Combat OGG cues 미리 register + decode — 첫 hit 무음 + Pixi sound race 회피.
  // 부팅 시점의 preload=true 는 play 호출과 시간 격리되어 있어 race 없음.
  SFX.preloadAssets();

  showStatus('Loading...');
  // Use LDtk hand-crafted world (set ?mode=procgen in URL for procedural)
  const params = new URLSearchParams(window.location.search);
  if (params.has('procgen')) {
    await game.sceneManager.push(new WorldScene(game));
  } else {
    await game.sceneManager.push(new TitleScene(game));
  }

  // Analytics: session start + load time
  trackGameStart();
  trackGameLoaded(Date.now() - bootStartTime);

  // Hide status once game is running
  const el = document.getElementById('load-status');
  if (el) el.style.display = 'none';
} catch (e: unknown) {
  const msg = e instanceof Error ? e.stack || e.message : String(e);
  document.body.style.color = '#f44';
  document.body.style.padding = '20px';
  document.body.style.fontFamily = 'monospace';
  document.body.innerHTML = '<h2>Init Error</h2><pre>' + msg + '</pre>';
}
