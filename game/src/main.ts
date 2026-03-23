import { Game } from './Game';
import { WorldScene } from '@scenes/WorldScene';

// Wait for pixel font (timeout 3s so game starts regardless)
try {
  await Promise.race([
    document.fonts.load('8px "Press Start 2P"'),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]);
} catch { /* font load fail is non-fatal */ }

const game = new Game();
await game.init();
await game.sceneManager.push(new WorldScene(game));
