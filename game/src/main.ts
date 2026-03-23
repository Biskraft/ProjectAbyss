import { Game } from './Game';
import { WorldScene } from '@scenes/WorldScene';

function showStatus(msg: string): void {
  const el = document.getElementById('load-status');
  if (el) el.textContent = msg;
}

try {
  showStatus('Loading fonts...');
  // Wait for pixel font (timeout 3s so game starts regardless)
  try {
    await Promise.race([
      document.fonts.load('8px "Press Start 2P"'),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
  } catch { /* font load fail is non-fatal */ }

  showStatus('Initializing game...');
  const game = new Game();
  await game.init();

  showStatus('Loading world...');
  await game.sceneManager.push(new WorldScene(game));

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
