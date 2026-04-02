import { Game } from './Game';
import { WorldScene } from '@scenes/WorldScene';
import { LdtkWorldScene } from '@scenes/LdtkWorldScene';
import { TitleScene } from '@scenes/TitleScene';
import { installBitmapFont } from '@ui/fonts';
import { VirtualPad } from '@ui/VirtualPad';

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

  // Install BitmapFont from the now-loaded CSS font
  installBitmapFont();

  showStatus('Initializing game...');
  const game = new Game();
  await game.init();

  showStatus('Loading world...');
  // Use LDtk hand-crafted world (set ?mode=procgen in URL for procedural)
  const params = new URLSearchParams(window.location.search);
  if (params.has('procgen')) {
    await game.sceneManager.push(new WorldScene(game));
  } else {
    // Skip title screen — go straight to game (TODO: restore TitleScene later)
    await game.sceneManager.push(new LdtkWorldScene(game));
  }

  // Virtual pad for mobile
  if (VirtualPad.isTouchDevice()) {
    new VirtualPad(game.input);
  }

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
