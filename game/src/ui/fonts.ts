import { BitmapFont } from 'pixi.js';

/** BitmapFont name used by all game UI */
export const PIXEL_FONT = 'PressStart2P';

/** Must be called after the CSS font is loaded and before any text is created */
export function installBitmapFont(): void {
  BitmapFont.install({
    name: PIXEL_FONT,
    style: {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 16,
      fill: 0xffffff,
    },
    chars: [
      ['a', 'z'],
      ['A', 'Z'],
      ['0', '9'],
      ' .,;:!?-+=/\\@#$%^&*()[]{}\'\"<>_~`|→←↑↓…×♦★',
    ],
  });
}
