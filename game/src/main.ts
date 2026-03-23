import { Game } from './Game';
import { WorldScene } from '@scenes/WorldScene';

// Wait for pixel font to load before starting
await document.fonts.load('8px "Press Start 2P"');

const game = new Game();
await game.init();
await game.sceneManager.push(new WorldScene(game));
